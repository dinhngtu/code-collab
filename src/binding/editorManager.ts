import * as vscode from "vscode";
import { MockableApis } from "../base/mockableApis";
import { IBindingStorage } from "./iBindingStorage";
import { IEditorManager } from "./iEditorManager";
import { IWorkspaceEventListener } from "./iWorkspaceEventListener";

export class EditorManager implements IEditorManager {
	private openEditors = new Map<string, vscode.TextEditor>();
	private listeners : IWorkspaceEventListener[] = [];

    constructor(private bindingStorage : IBindingStorage) {

    }

    addListener(listener : IWorkspaceEventListener) {
		this.listeners.push(listener);
	}

    initialize() {
		MockableApis.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor.bind(this));
		MockableApis.window.onDidChangeVisibleTextEditors(this.onDidChangeVisibleTextEditors.bind(this));
        this.onDidChangeActiveTextEditor(MockableApis.window.activeTextEditor);
    }

    async openDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
        return await MockableApis.workspace.openTextDocument(uri);
    }

    async activateEditor(buffer: vscode.TextDocument): Promise<vscode.TextEditor> {
        let editor = await this.getOrCreateEditor(buffer);
		if(!MockableApis.window.visibleTextEditors.includes(editor)) {
			await MockableApis.window.showTextDocument(buffer);
		}
		await MockableApis.commands.executeCommand('workbench.action.keepEditor');
        return editor;
    }

	isOpen(uri: vscode.Uri): boolean {
        return this.openEditors.has(uri.fsPath);
    }

    getOpenEditor(uri: vscode.Uri): vscode.TextEditor {
        if(!this.isOpen(uri)) {
			throw new Error("Uri is not opened in an editor");
		}
		return this.openEditors.get(uri.fsPath)!;
    }

	async onDidChangeActiveTextEditor (event : vscode.TextEditor | undefined) {
		if(event) {
			this.setEditorAsOpen(event);
	
			this.executeOnListeners((listener) => {
				listener.onLocalFileOpened(event);
			});
		}
	}

	onDidChangeVisibleTextEditors(editors : vscode.TextEditor[]) {
		for(let editor of this.bindingStorage.getEditors()) {
			if(!editors.includes(editor)) {
				let editorSync = this.bindingStorage.findEditorSyncByEditor(editor)!;
				let buffer = editor.document;
				this.openEditors.delete(buffer.uri.fsPath);
				this.bindingStorage.deleteEditorBinding(this.bindingStorage.findEditorBindingBySync(editorSync)!);
			}
		}

		for(let uri of this.openEditors.keys()) {
			if(!editors.includes(this.openEditors.get(uri)!)) {
				this.openEditors.delete(uri);
			}
		}
	}

	private setEditorAsOpen(event: vscode.TextEditor) {
		if (this.openEditors.has(event.document.uri.fsPath)) {
			if (this.openEditors.get(event.document.uri.fsPath) !== event) {
				throw new Error("Duplicate editors in use");
			}
		}
		this.openEditors.set(event.document.uri.fsPath, event);
	}


	private executeOnListeners(call : (listener : IWorkspaceEventListener) => void) {
		for(let listener of this.listeners) {
			call(listener);
		}
	}

	

    private async getOrCreateEditor(buffer : vscode.TextDocument) : Promise<vscode.TextEditor> {
		if(this.isOpen(buffer.uri)) {
			return this.getOpenEditor(buffer.uri);
		} else {
			return await MockableApis.window.showTextDocument(buffer);
		}
	}

}