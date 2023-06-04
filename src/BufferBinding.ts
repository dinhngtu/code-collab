import * as vscode from 'vscode';
import { IBufferListener } from './sync/iBufferListener';
import { TextChange, TextChangeType } from './sync/data/textChange';
import { IBufferSync } from './sync/iBufferSync';
import { Position } from './sync/data/position';
import { Queue } from 'queue-typescript';
import { MockableApis } from './base/mockableApis';

type EditCallback = () => Promise<void>;

export default class BufferBinding implements IBufferListener {
	private disposed!: boolean;
	public editor: vscode.TextEditor | null = null;
	public editInProgress = false;
	public disableLocalUpdates = false;
	public edits = new Queue<EditCallback>();
	public externalFlag = false;
	public changeBuffer: vscode.TextDocumentContentChangeEvent[] = [];

	constructor(public buffer: vscode.TextDocument, public bufferSync: IBufferSync, public fileName: string) {
		bufferSync.setListener(this);
		MockableApis.executor.executeCyclic(this.editPoller.bind(this), 100);
	}

	async editPoller() {
		//poor mans lock, but typescript is singlethreaded, so it should work
		if (!this.editInProgress) {
			this.editInProgress = true;
			await this.handleEditQueue();
			this.editInProgress = false;
		}
	}

	private async handleEditQueue() {
		if (MockableApis.window.visibleTextEditors.includes(this.editor!)) {
			let edit = this.edits.dequeue();
			while (edit) {
				edit();
				edit = this.edits.dequeue();
			}
		}
	}

	private async handleEdit(edit: TextChange) {
		let range = this.createRange(edit.start, edit.end);
		while (!await this.tryPerformUpdate(edit, range)) { }
	}

	async onSetText(text: string): Promise<void> {
		this.setTextAsChange(text);
	}


	private setTextAsChange(text: string) {
		this.edits.enqueue(async () => {
			let lines = this.editor?.document?.lineCount || 1;
			let characters = this.editor?.document?.lineAt(lines - 1).text.length || 0;
			await this.handleEdit(new TextChange(TextChangeType.UPDATE, new Position(0, 0), new Position(lines - 1, characters), text));
		});
	}

	async onTextChanges(changes: TextChange[]): Promise<void> {
		for (let i = changes.length - 1; i >= 0; i--) {
			const textUpdate = changes[i];
			this.edits.enqueue(async () => { await this.handleEdit(textUpdate); });
		}
	}

	private async tryPerformUpdate(textUpdate: TextChange, range: vscode.Range) {
		this.disableLocalUpdates = true;
		let result = await new Promise<boolean>((resolve, reject) => {
			this.editor?.edit(builder => {
				if (textUpdate.type === TextChangeType.INSERT) {
					builder.insert(range.start, textUpdate.text);
				} else if (textUpdate.type === TextChangeType.UPDATE) {
					builder.replace(range, textUpdate.text);
				} else if (textUpdate.type === TextChangeType.DELETE) {
					builder.delete(range);
				}
			}, { undoStopBefore: false, undoStopAfter: true }).then(resolve);
		});
		this.disableLocalUpdates = false;
		return result;
	}

	async onSave(): Promise<void> {
		await this.buffer.save();
	}

	dispose() {
		this.disposed = true;
	}

	isDisposed() {
		return this.disposed;
	}

	private createRange(start: Position, end: Position): vscode.Range {
		return new vscode.Range(
			new vscode.Position(start.row, start.column),
			new vscode.Position(end.row, end.column)
		);
	}

	private pushChange(change: vscode.TextDocumentContentChangeEvent): Promise<void> {
		const { start, end } = change.range;
		let oldStart = new Position(start.line, start.character);
		let oldEnd = new Position(end.line, end.character);
		return this.bufferSync.sendChangeToRemote(new TextChange(TextChangeType.UPDATE, oldStart, oldEnd, change.text));
	}

	async onDidChangeBuffer(event: vscode.TextDocumentChangeEvent): Promise<void> {
		let l: Promise<void>[] = [];
		let toSend = [...event.contentChanges];

		/*
		 * see convention:
		 * lf1: local update, not dirty, 1 change
		 * lt0: local update, dirty, 0 change
		 *
		 * replication algorithm is as follows:
		 * lf1 + lt0 -> commit (this is a manual edit)
		 * lf1 + lf1 -> lf1 (since lf1 can fire many times in a row from multiple external changes)
		 * lf1 + X (otherwise) -> drop
		 */
		if (!this.disableLocalUpdates && !event.document.isDirty && event.contentChanges.length == 1) {
			// by experience, during saves event.contentChanges.length always equals 1
			this.externalFlag = true;
			this.changeBuffer = toSend;
			toSend = [];
		} else if (this.externalFlag) {
			if (!this.disableLocalUpdates && event.document.isDirty && event.contentChanges.length == 0) {
				MockableApis.log("committing buffered events");
				for (let change of this.changeBuffer) {
					MockableApis.log(`change: ${JSON.stringify(change)}`);
					l.push(this.pushChange(change));
				}
			}
			this.externalFlag = false;
			this.changeBuffer = [];
		}

		if (!this.disableLocalUpdates) {
			for (let change of toSend) {
				MockableApis.log(`change: ${JSON.stringify(change)}`);
				l.push(this.pushChange(change));
			}
		}

		await Promise.all(l);
	}

	async requestSavePromise(): Promise<void> {
		for (let change of this.changeBuffer) {
			MockableApis.log(`flushing buffered change: ${JSON.stringify(change)}`);
			await this.pushChange(change);
		}
		this.externalFlag = false;
		this.changeBuffer = [];
		await this.bufferSync.saveToRemote();
	}
}
