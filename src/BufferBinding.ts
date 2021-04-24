import * as fs from 'fs';
import * as vscode from 'vscode';

import { BufferProxy } from '@atom/teletype-client';

import { Position, TextUdpate } from './teletype_types';

export default class BufferBinding {
	public readonly buffer: vscode.TextDocument;
	private editor!: vscode.TextEditor;
	private readonly isHost: boolean;
	private bufferProxy!: BufferProxy;
	private onGetText: any;
	public didDispose: Function;
	private disposed!: boolean;
	private onUpdateText: any;
	private onInsert: any;
	private onDelete: any;
	private remoteChanges = new Set<string>();


	constructor({ buffer, isHost, didDispose }: { buffer: any; isHost: any; didDispose: any; }) {

		this.buffer = buffer;
		this.isHost = isHost;
		this.didDispose = didDispose;
	}

	dispose() {
		this.disposed = true;
	}
	isDisposed() {
		return this.disposed;
	}
	getText() {
		if (typeof this.onGetText === "function") {
			return this.onGetText();
		}
		return null;
	}

	setBufferProxy(bufferProxy: BufferProxy) {
		this.bufferProxy = bufferProxy;
	}

	setText(text: string) {
		fs.writeFileSync(this.buffer.uri.fsPath, text);
	}

	setEditor(editor: vscode.TextEditor) {
		this.editor = editor;
	}

	updateText(textUpdates: any) {
		return this.editor.edit(builder => {
			for (let i = textUpdates.length - 1; i >= 0; i--) {
				const textUpdate = textUpdates[i];
				let range = this.createRange(textUpdate.oldStart, textUpdate.oldEnd);
				let changeHash = this.hashChange(range, textUpdate.newText);
				this.remoteChanges.add(changeHash);
				builder.replace(range, textUpdate.newText);
			}
		}, { undoStopBefore: false, undoStopAfter: true });
	}

	traverse(start: any, distance: any) {
		if (distance.row === 0) {
			return { row: start.row, column: start.column + distance.column };
		}

		else {
			return { row: start.row + distance.row, column: distance.column };
		}
	}

	insert(position: any, text: any) {
		console.log("buffer insert pos:" + position + " text: " + text);
		if (typeof this.onInsert === "function") {
			this.onInsert(position, text);
		}
		return [position, position, text];
	}
	delete(startPosition: any, extent: any) {
		console.log("buffer delete start pos:" + startPosition + " extent: " + extent);
		if (typeof this.onDelete === "function") {
			this.onDelete(startPosition, extent);
		}
		const endPosition = this.traverse(startPosition, extent);
		return [startPosition, endPosition, ''];
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
				this.bufferProxy.setTextInRange(oldStart, oldEnd, change.text);
			}
		}
	}

	requestSavePromise() {
		return new Promise(() => {
			this.bufferProxy.requestSave();
		});
	}

	save() {
		this.buffer.save();
	}

	private hashChange(range : vscode.Range, text : string) : string {
		return range.start.line+":"+range.start.character+">"+range.end.line+":"+range.end.character+"="+text;
	}
}
