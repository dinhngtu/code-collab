import * as vscode from "vscode";
import { ISyncPortal } from "../sync/iSyncPortal";
import { IBindingStorage } from "./iBindingStorage";
import { IBufferBindingFactory } from "./iBufferBindingFactory";
import { IDocumentListener } from "./iDocumentListener";
import { IEditorManager } from "./iEditorManager";
import { IEditorBindingFactory } from "./iEdtorBindingFactory";
import { IShareLocalToRemote } from "./iShareLocalToRemote";
import { IWorkspaceEventListener } from "./iWorkspaceEventListener";
import { SharedFile } from "./sharedFile";

export class ShareLocalToRemote implements IShareLocalToRemote, IWorkspaceEventListener {
	private sharedFiles = new Map<string, SharedFile>();

    constructor(private documentListener : IDocumentListener,  private editorManager : IEditorManager, 
		private bindingStorage : IBindingStorage, private bufferBindingFactory : IBufferBindingFactory, 
		private editorBindingFactory : IEditorBindingFactory,  private syncPortal : ISyncPortal) {
			this.editorManager.addListener(this);
    }
    
    isShared(uri: vscode.Uri): boolean {
        return this.sharedFiles.has(uri.fsPath);
    }

    async shareFile(uri: vscode.Uri): Promise<void> {
        let buffer = await this.getDocumentForUri(uri);
		let editorSync = await this.syncPortal.syncLocalFileToRemote(uri.fsPath);
		let binding = this.bufferBindingFactory.createBinding(buffer, editorSync.getBufferSync(), uri.fsPath);
        this.bindingStorage.storeBufferBinding(binding);

		this.sharedFiles.set(uri.fsPath, new SharedFile(binding, editorSync));
		if(this.editorManager.isOpen(uri)) {
			let editor = this.editorManager.getOpenEditor(uri);
            this.onLocalFileOpened(editor);
		} 
		this.initializeTextToRemote(buffer);
    }

    async unshareFile(uri: vscode.Uri): Promise<void> {
        if(this.sharedFiles.has(uri.fsPath)) {
			let sharedFile = this.sharedFiles.get(uri.fsPath)!;
			await this.syncPortal.closeFileToRemote(sharedFile.editorSync);
			this.closeSharedFileConnection(sharedFile);
			this.sharedFiles.delete(uri.fsPath);
		}
    }
    
    onLocalFileOpened(editor: vscode.TextEditor): void {
        let sharedFile = this.sharedFiles.get(editor.document.uri.fsPath);
        if(sharedFile) {
            sharedFile.bufferBinding.editor = editor;
			var editorBinding = this.bindingStorage.findEditorBindingBySync(sharedFile.editorSync);
			if(!editorBinding) {
				editorBinding = this.editorBindingFactory.createBinding(editor, sharedFile.editorSync);
			} else {
				editorBinding.editor = editor;
				this.bindingStorage.deleteEditorBinding(editorBinding);
			}
            this.bindingStorage.storeEditorBinding(editorBinding);
        }   
    }


    private async getDocumentForUri(uri : vscode.Uri) : Promise<vscode.TextDocument> {
		if(this.editorManager.isOpen(uri)) {
			return this.editorManager.getOpenEditor(uri).document;
		} else {
			return await this.editorManager.openDocument(uri);
		}
	}

    private initializeTextToRemote(document: vscode.TextDocument) {
		this.documentListener.onDidChangeTextDocument({
			document: document,
			contentChanges: [
				{
					range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
					rangeOffset: 0,
					rangeLength: 0,
					text: document.getText()
				}
			]
		});
	}
    
    private closeSharedFileConnection(sharedFile: SharedFile) {
		let bufferSync = sharedFile.bufferBinding.bufferSync;

		sharedFile.editorSync.close();
		bufferSync.close();

		this.bindingStorage.deleteBufferBinding(sharedFile.bufferBinding);
		let editorBinding = this.bindingStorage.findEditorBindingBySync(sharedFile.editorSync);
		if(editorBinding) {
			this.bindingStorage.deleteEditorBinding(editorBinding);
		}
	}
}