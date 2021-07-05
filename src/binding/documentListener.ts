import { MockableApis } from "../base/mockableApis";
import * as vscode from 'vscode';
import { IBindingStorage } from "./iBindingStorage";
import { IDocumentListener } from "./iDocumentListener";

export class DocumentListener implements IDocumentListener{

    constructor(private bindingStorage : IBindingStorage) {

    }

    initialize() {
		MockableApis.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this));
		MockableApis.workspace.onWillSaveTextDocument(this.saveDocument.bind(this));
    }

    public onDidChangeTextDocument (event : vscode.TextDocumentChangeEvent) {
		console.log("Handling change event: "+event);
		const bufferBinding = this.bindingStorage.findBufferBindingByBuffer(event.document);
		if (bufferBinding) {
			console.log("Calling binding for change event: "+event);
			bufferBinding.onDidChangeBuffer(event.contentChanges);
		}
	}

    private saveDocument (event : vscode.TextDocumentWillSaveEvent) {
		const bufferBinding = this.bindingStorage.findBufferBindingByBuffer(event.document);
		if (bufferBinding) {
			event.waitUntil(bufferBinding.requestSavePromise());
		}
	}
}