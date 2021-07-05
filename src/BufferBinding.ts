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
	public editor : vscode.TextEditor | null = null;
	public editInProgress = false;
	public disableLocalUpdates = false;
	public edits = new Queue<EditCallback>();

	constructor(public buffer : vscode.TextDocument, public bufferSync : IBufferSync, public fileName : string) {
		bufferSync.setListener(this);
		MockableApis.executor.executeCyclic(this.editPoller.bind(this), 100);
	}

	async editPoller() {
		//poor mans lock, but typescript is singlethreaded, so it should work
		if(!this.editInProgress) {
			this.editInProgress = true;
			await this.handleEditQueue();
			this.editInProgress = false;
		}
	}
	
	private async handleEditQueue() {
		if(MockableApis.window.visibleTextEditors.includes(this.editor!)) {
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
			this.edits.enqueue(async () => { await this.handleEdit(textUpdate);});
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

	onDidChangeBuffer(changes: readonly vscode.TextDocumentContentChangeEvent[]) {
		console.debug("handling changes (disabled="+this.disableLocalUpdates+"): "+JSON.stringify(changes));
		if(!this.disableLocalUpdates) {
			for(let change of changes) {
				const { start, end } = change.range;
				let oldStart = new Position(start.line, start.character);
				let oldEnd = new Position(end.line,end.character);
				this.bufferSync.sendChangeToRemote(new TextChange(TextChangeType.UPDATE, oldStart, oldEnd, change.text));
			}
		}
	}

	requestSavePromise() {
		return this.bufferSync.saveToRemote();
	}
}
