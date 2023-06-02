import { MockableApis } from "../base/mockableApis";
import * as vscode from 'vscode';
import { IBindingStorage } from "./iBindingStorage";
import { IDocumentListener } from "./iDocumentListener";

export class DocumentListener implements IDocumentListener {

	constructor(private bindingStorage: IBindingStorage) {

	}

	initialize() {
		MockableApis.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this));
		MockableApis.workspace.onWillSaveTextDocument(this.saveDocument.bind(this));
	}

	public onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
		MockableApis.log(`Change ${event.document.uri.fsPath} dirty:${event.document.isDirty} count:${event.contentChanges.length}`);
		const bufferBinding = this.bindingStorage.findBufferBindingByBuffer(event.document);
		if (bufferBinding) {
			MockableApis.log("Calling binding");
			bufferBinding.onDidChangeBuffer(event);
		}
	}

	private saveDocument(event: vscode.TextDocumentWillSaveEvent) {
		MockableApis.log("saveDocument");
		const bufferBinding = this.bindingStorage.findBufferBindingByBuffer(event.document);
		if (bufferBinding) {
			event.waitUntil(bufferBinding.requestSavePromise());
		}
	}
}
