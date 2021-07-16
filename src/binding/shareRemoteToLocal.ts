import BufferBinding from "../BufferBinding";
import { IBufferSync } from "../sync/iBufferSync";
import { IEditorSync } from "../sync/iEditorSync";
import { IBindingStorage } from "./iBindingStorage";
import { IRemoteFileListener } from "../sync/iRemoteFileListener";
import * as vscode from 'vscode';
import { IBufferBindingFactory } from "./iBufferBindingFactory";
import { RemoteFileEntry } from "../remoteFileEntry";
import { DelayedListenerExecution } from "../sync/teletype/delayedListenerExecution";
import { IPortalBindingListener } from "../iPortalBindingListener";
import { removeValueFromArray } from "../base/functions";
import { IShareRemoteToLocal } from "./iShareRemoteToLocal";
import { IEditorBindingFactory } from "./iEdtorBindingFactory";
import { IEditorManager } from "./iEditorManager";
import { IRemoteFileManagementListener } from "./iRemoteFileManagementListener";
import { IWorkspaceEventListener } from "./iWorkspaceEventListener";

export class ShareRemoteToLocal extends DelayedListenerExecution<IRemoteFileManagementListener> implements IRemoteFileListener, IShareRemoteToLocal, IWorkspaceEventListener{

	private remoteFileEntryBySync = new Map<BufferBinding, RemoteFileEntry>();
	private filesByPeer = new Map<string, RemoteFileEntry[]>();
	private peersByFile = new Map<BufferBinding, string>();

    constructor(private bindingStorage : IBindingStorage, private editorManager : IEditorManager, private bufferBindingFactory : IBufferBindingFactory, private editorBindingFactory : IEditorBindingFactory) {
        super();
		this.editorManager.addListener(this);
    }
	


    async onOpenRemoteFile(peer: string, uniqueUri: string, localUri : vscode.Uri, editorSync: IEditorSync): Promise<void> {
        let bufferSync = editorSync.getBufferSync();
		const binding = await this.findOrCreateBufferForBufferSync(bufferSync, uniqueUri,localUri);
		
		this.addToFileList(peer, binding, editorSync);
    }

    async activateRemoteFile(editorSync: IEditorSync): Promise<void> {
        let bufferBinding = this.bindingStorage.findBufferBindingBySync(editorSync.getBufferSync()); 
        if(!bufferBinding) {
            throw new Error("Remote file has not yet been opened and cannot be activated");
        }
        let editor = await this.editorManager.activateEditor(bufferBinding.buffer);
        let editorBinding = this.bindingStorage.findEditorBindingByEditor(editor);
        if(!editorBinding) {
            bufferBinding.editor = editor;
            this.registerNewBindingForEditorAndSync(editor, editorSync);
        }
    }

    async onCloseRemoteFile(editorSync: IEditorSync): Promise<void> {
        this.removeFile(editorSync);
    }

    getFiles(peer : string) : RemoteFileEntry[] {
		if(this.filesByPeer.has(peer)) {
			return this.filesByPeer.get(peer)!;
		}
		return [];
	}

	async onLocalFileOpened(editor: vscode.TextEditor): Promise<void> {
		let buffer = editor.document;
		let bufferBinding = this.bindingStorage.findBufferBindingByBuffer(buffer);
		if(bufferBinding && this.peersByFile.has(bufferBinding)) {
			bufferBinding.editor = editor;
			let remoteFile = this.remoteFileEntryBySync.get(bufferBinding);
			if(remoteFile) {
				let editorBinding = this.bindingStorage.findEditorBindingBySync(remoteFile.editorSync);
				if(editorBinding) {
					editorBinding.editor = editor;
					this.bindingStorage.deleteEditorBinding(editorBinding);
					this.bindingStorage.storeEditorBinding(editorBinding);
				} else {
					this.registerNewBindingForEditorAndSync(editor, remoteFile.editorSync);
				}
			}
			
		}
	}

	private registerNewBindingForEditorAndSync(editor: vscode.TextEditor, editorSync: IEditorSync) {
		let editorBinding = this.editorBindingFactory.createBinding(editor, editorSync);
		this.bindingStorage.storeEditorBinding(editorBinding);
	}

    private removeFile(editorSync: IEditorSync) {
		let bufferSync = editorSync.getBufferSync();
		const bufferBinding = this.bindingStorage.findBufferBindingBySync(bufferSync);
		if (bufferBinding && this.peersByFile.has(bufferBinding)) {
			let entry = this.remoteFileEntryBySync.get(bufferBinding);
			this.remoteFileEntryBySync.delete(bufferBinding);
			removeValueFromArray(this.filesByPeer.get(this.peersByFile.get(bufferBinding)!)!, entry);
			this.peersByFile.delete(bufferBinding);
			this.bindingStorage.deleteBufferBinding(bufferBinding);
			let editorBinding = this.bindingStorage.findEditorBindingBySync(editorSync);
			if(editorBinding) {
				this.bindingStorage.deleteEditorBinding(editorBinding);
			}
			this.informFileListeners();
		}
	}

    private addToFileList(peer: string, binding: BufferBinding, editorSync: IEditorSync) {
        if (!this.filesByPeer.has(peer)) {
            this.filesByPeer.set(peer, []);
        }
        let entry = new RemoteFileEntry(binding, editorSync);
        this.remoteFileEntryBySync.set(binding, entry);
        this.filesByPeer.get(peer)?.push(entry);
        this.peersByFile.set(binding, peer);

        this.informFileListeners();
    }
    
    private async findOrCreateBufferForBufferSync (bufferSync : IBufferSync, uniqueUrl : string, localUri : vscode.Uri) : Promise<BufferBinding> {
		let bufferBinding = this.bindingStorage.findBufferBindingBySync(bufferSync);
		if (!bufferBinding) { 
			bufferBinding = await this.createAndRegisterNewBuffer(uniqueUrl, bufferSync, localUri);
		}
		return bufferBinding;
	}


	private async createAndRegisterNewBuffer(uniqueUrl: string, bufferSync: IBufferSync, localUri : vscode.Uri) : Promise<BufferBinding> {
		let buffer = await this.editorManager.openDocument(localUri);
		return this.registerNewBindingForBufferAndSync(buffer, bufferSync, uniqueUrl);
	}

    private registerNewBindingForBufferAndSync(buffer: vscode.TextDocument, bufferSync: IBufferSync, uniqueUrl : string) : BufferBinding {
		let bufferBinding = this.bufferBindingFactory.createBinding(buffer, bufferSync, uniqueUrl);
		this.bindingStorage.storeBufferBinding(bufferBinding);
		return bufferBinding;
	}

    private informFileListeners() {
		this.executeOnListener(async (listener) => {
			listener.onFileAddedOrRemoved();
		});
	}
}