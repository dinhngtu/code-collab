import * as vscode from 'vscode';
import { IBufferListener } from './sync/iBufferListener';
import { TextChange, TextChangeType } from './sync/data/textChange';
import { IBufferSync } from './sync/iBufferSync';
import { Position } from './sync/data/position';
import { Queue } from 'queue-typescript';
import { MockableApis } from './base/mockableApis';

export default class BufferBinding implements IBufferListener {
	private disposed!: boolean;
	private remoteChanges = new Set<string>();
	public editor : vscode.TextEditor | null = null;
	public editInProgress = false;
	public edits = new Queue<TextChange>();

	constructor(public buffer : vscode.TextDocument, public bufferSync : IBufferSync) {
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
		let edit = this.edits.dequeue();
		while (edit) {
			await this.handleEdit(edit);
			edit = this.edits.dequeue();
		}
	}

	private async handleEdit(edit: TextChange) {
		let range = this.createRange(edit.start, edit.end);
		let changeHash = this.hashChange(range, edit.text);
		this.remoteChanges.add(changeHash);
		while (!await this.tryPerformUpdate(edit, range)) { }
	}

	async onSetText(text: string): Promise<void> {
		let lines = this.editor?.document?.lineCount || 1;
		let characters = this.editor?.document?.lineAt(lines-1).text.length || 0;
		this.onTextChanges([new TextChange(TextChangeType.UPDATE, new Position(0,0), new Position(lines-1,characters), text)]);
	}
	
	async onTextChanges(changes: TextChange[]): Promise<void> {
		
		if(MockableApis.window.visibleTextEditors.includes(this.editor!)) {
			for (let i = changes.length - 1; i >= 0; i--) {
				const textUpdate = changes[i];
				this.edits.enqueue(textUpdate);
			}
		}
		
		
	}
	
	private async tryPerformUpdate(textUpdate: TextChange, range: vscode.Range) {
		return await new Promise<boolean>((resolve, reject) => {
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
	}

	async onSave(): Promise<void> {
		this.buffer.save();
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

	onDidChangeBuffer(changes: vscode.TextDocumentContentChangeEvent[]) {
		for(let change of changes) {
			let changeHash = this.hashChange(change.range, change.text);
			if(this.remoteChanges.has(changeHash)){
				this.remoteChanges.delete(changeHash);
			} else {
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

	private hashChange(range : vscode.Range, text : string) : string {
		return range.start.line+":"+range.start.character+">"+range.end.line+":"+range.end.character+"="+text;
	}
}
