import * as fs from 'fs';
import * as vscode from 'vscode';
import { IBufferListener } from './sync/iBufferListener';
import { TextChange } from './sync/data/textChange';
import { IBufferSync } from './sync/iBufferSync';
import { Position } from './sync/data/position';

export default class BufferBinding implements IBufferListener {
	private disposed!: boolean;
	private remoteChanges = new Set<string>();
	public editor : vscode.TextEditor | null = null;

	constructor(public buffer : vscode.TextDocument, public bufferSync : IBufferSync) {
		bufferSync.setListener(this);
	}
	
	async onSetText(text: string): Promise<void> {
		fs.writeFileSync(this.buffer.uri.fsPath, text);
	}
	
	onTextChanges(changes: TextChange[]): Promise<void> {
		return new Promise((resolve, reject) => {
			this.editor?.edit(builder => {
				for (let i = changes.length - 1; i >= 0; i--) {
					const textUpdate = changes[i];
					let range = this.createRange(textUpdate.start, textUpdate.end);
					let changeHash = this.hashChange(range, textUpdate.text);
					this.remoteChanges.add(changeHash);
					builder.replace(range, textUpdate.text);
				}
			}, { undoStopBefore: false, undoStopAfter: true }).then(() => {
				resolve();
			});
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

	createRange(start: Position, end: Position): vscode.Range {
		return new vscode.Range(
			new vscode.Position(start.row, start.column),
			new vscode.Position(end.row, end.column)
		);
	}

	onDidChangeBuffer(changes: vscode.TextDocumentContentChangeEvent[]) {
		for(let change of changes) {
			let changeHash = this.hashChange(change.range, change.text);
			if(this.remoteChanges.has(changeHash)){
				this.remoteChanges.delete(changeHash)
			} else {
				const { start, end } = change.range;
				let oldStart = { row: start.line, column: start.character };
				let oldEnd = { row: end.line, column: end.character };
				this.bufferSync.sendChangeToRemote(new TextChange(oldStart, oldEnd, change.text));
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
