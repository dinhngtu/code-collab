import * as vscode from 'vscode';
import BufferBinding from './BufferBinding';
import EditorBinding from './EditorBinding';

import * as os from 'os';
import * as path from 'path';
import { ISyncPortal } from './sync/iSyncPortal';
import { IPortalListener } from './sync/iPortalListener';
import { IEditorSync } from './sync/iEditorSync';
import { IBufferSync } from './sync/iBufferSync';
import { MockableApis } from './base/mockableApis';
import { fileUrl } from './base/functions';
import { IPortalBindingListener } from './iPortalBindingListener';
import { DelayedListenerExecution } from './sync/teletype/delayedListenerExecution';

export default class PortalBinding  extends DelayedListenerExecution<IPortalBindingListener> implements IPortalListener{
	private disposed!: boolean;
	private editorBindingsByEditorSync = new Map<IEditorSync, EditorBinding>();
	private bufferBindingsByBufferSync = new Map<IBufferSync, BufferBinding>();
	private bufferBindingsByBuffer = new Map<vscode.TextDocument, BufferBinding>();
	private bufferSyncsByBuffer = new Map<vscode.TextDocument, IBufferSync>();
	private editorBindingsByEditor = new Map<vscode.TextEditor, EditorBinding>();
	private editorSyncsByEditor = new WeakMap<vscode.TextEditor, IEditorSync>();
	private editorsBySyncs = new Map<IEditorSync, vscode.TextEditor>();
	private remoteFiles = new Set<string>();
	public peers : string[] = [];


	constructor(public syncPortal : ISyncPortal, public isHost : boolean, public name : string) {
		super();
	}
	

	getName() : string {
		return this.name;
	}

	getType() : string {
		return this.syncPortal.getType();
	}

	async onCloseRemoteFile(editorSync: IEditorSync): Promise<void> {
		let editor = this.editorsBySyncs.get(editorSync);
		if(editor) {
			await MockableApis.window.showTextDocument(editor.document);
            MockableApis.commands.executeCommand('workbench.action.closeActiveEditor');
		}
	}

	async onOpenRemoteFile(uniqueUri: string, editorSync: IEditorSync): Promise<void> {
		await this.findOrCreateEditorByEditorSync(uniqueUri, editorSync);
	}

	async initialize() {
		this.syncPortal.setListener(this);
		this.registerWorkspaceEvents();
		if(this.isHost) {
			this.onDidChangeActiveTextEditor(MockableApis.window.activeTextEditor);
		}
	}

	async onPeerJoined(peer: string): Promise<void> {
		this.peers.push(peer);
		this.informPeerListeners();
	}


	async onPeerLeft(peer: string): Promise<void> {
		for(var i = 0;i<this.peers.length;i++) {
			if(this.peers[i] === peer) {
				this.peers.splice(i,1);
			}
		}
		this.informPeerListeners();
	}

	private informPeerListeners() {
		this.executeOnListener(async (listener) => {
			listener.onPeerAddedOrRemoved();
		});
	}

	private registerWorkspaceEvents () {
		MockableApis.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this));
		MockableApis.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor.bind(this));
		MockableApis.workspace.onWillSaveTextDocument(this.saveDocument.bind(this));
		MockableApis.window.onDidChangeTextEditorSelection(this.triggerSelectionChanges.bind(this));
		MockableApis.window.onDidChangeVisibleTextEditors(this.onDidChangeVisibleTextEditors.bind(this));
	}

	private onDidChangeVisibleTextEditors(editors : vscode.TextEditor[]) {
		for(let editor of this.editorBindingsByEditor.keys()) {
			if(!editors.includes(editor)) {
				let editorSync = this.editorSyncsByEditor.get(editor)!;
				let buffer = editor.document;
				let bufferSync = this.bufferSyncsByBuffer.get(buffer)!;
				if(this.remoteFiles.has(buffer.uri.path.toLocaleLowerCase())) {
					if(bufferSync) {
						bufferSync.close();
					}
					editorSync.close();
				} else {
					this.syncPortal.closeFileToRemote(editorSync);
				}
				this.clearEditorFromCaches(buffer, bufferSync, editor, editorSync);
			}
		}
	}

	private clearEditorFromCaches(buffer: vscode.TextDocument, bufferSync: IBufferSync, editor: vscode.TextEditor, editorSync: IEditorSync) {
		this.bufferBindingsByBuffer.delete(buffer);
		this.bufferBindingsByBufferSync.delete(bufferSync);

		this.bufferSyncsByBuffer.delete(buffer);
		this.editorBindingsByEditor.delete(editor);
		this.editorsBySyncs.delete(editorSync);

		this.editorSyncsByEditor.delete(editor);
	}

	private onDidChangeTextDocument (event : vscode.TextDocumentChangeEvent) {
		if(this.bufferBindingsByBuffer){
			const bufferBinding = this.bufferBindingsByBuffer.get(event.document);
			if (bufferBinding) {
				bufferBinding.onDidChangeBuffer(event.contentChanges);
			}
		}
	}

	private async onDidChangeActiveTextEditor (event : vscode.TextEditor | undefined) {
		if(this.isHost && event && !this.remoteFiles.has(event.document.uri.path.toLocaleLowerCase())) {
			console.debug("activating editor "+event.document.uri.path);
			let editorSync = this.editorSyncsByEditor.get(event);
			if(!editorSync) {
				try {
					console.debug("Creating new editor sync");
					editorSync = await this.createAndRegisterEditorSyncForLocalEditor(editorSync, event);
				} catch(error) {
					console.log(error);
					return;
				}
			}
			this.initializeTextToRemote(event);
			this.syncPortal.activateFileToRemote(editorSync!);
			
		}
	}

	private initializeTextToRemote(event: vscode.TextEditor) {
		this.onDidChangeTextDocument({
			document: event.document,
			contentChanges: [
				{
					range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
					rangeOffset: 0,
					rangeLength: 0,
					text: event.document.getText()
				}
			]
		});
	}

	private async createAndRegisterEditorSyncForLocalEditor(editorSync: IEditorSync | undefined, event: vscode.TextEditor) {
		editorSync = await this.syncPortal.syncLocalFileToRemote(event.document.fileName);
		this.registerNewBindingForBufferAndSync(event.document, editorSync.getBufferSync());
		let bufferBinding = this.bufferBindingsByBufferSync.get( editorSync.getBufferSync());
		bufferBinding!.editor = event,
		this.registerNewBindingForEditorAndSync(event, editorSync);
		return editorSync;
	}

	private saveDocument (event : vscode.TextDocumentWillSaveEvent) {
		if(this.bufferBindingsByBuffer){
		const bufferBinding = this.bufferBindingsByBuffer.get(event.document);
		if (bufferBinding) {
			event.waitUntil(bufferBinding.requestSavePromise());
		}
	}
}

	private triggerSelectionChanges(event : vscode.TextEditorSelectionChangeEvent) {
		const editorBinding = this.editorBindingsByEditor.get(event.textEditor);
		if (editorBinding) {
			editorBinding.updateSelections(event.selections);
		}
	}

	dispose() {
		this.disposed = true;
		
		this.syncPortal.close();
	}

	isDisposed() {
		return this.disposed;
	}


	private async findOrCreateEditorByEditorSync (uniqueUrl : string, editorSync : IEditorSync) : Promise<vscode.TextEditor> {
		let editor : vscode.TextEditor;
		let editorBinding = this.editorBindingsByEditorSync.get(editorSync);
		if (editorBinding && MockableApis.window.visibleTextEditors.includes(editorBinding.editor)) {
			editor = editorBinding.editor;
		} else {
			editor = await this.createAndRegisterNewEditor(editorSync, uniqueUrl);
		}
		return editor;
	}

	private async createAndRegisterNewEditor(editorSync: IEditorSync, uniqueUrl: string) : Promise<vscode.TextEditor> {
		let bufferSync = editorSync.getBufferSync();
		const buffer = await this.findOrCreateBufferForBufferSync(bufferSync, uniqueUrl);
		const bufferBinding = this.bufferBindingsByBufferSync.get(bufferSync);
		let editor = await MockableApis.window.showTextDocument(buffer);
		await MockableApis.commands.executeCommand('workbench.action.keepEditor');
		if (bufferBinding) {
			bufferBinding.editor = editor;
		}

		this.registerNewBindingForEditorAndSync(editor, editorSync);
		return editor;
	}

	private registerNewBindingForEditorAndSync(editor: vscode.TextEditor, editorSync: IEditorSync) {
		let editorBinding = new EditorBinding(editor, editorSync);
		this.editorBindingsByEditorSync.set(editorSync, editorBinding);
		this.editorSyncsByEditor.set(editor, editorSync);
		this.editorBindingsByEditor.set(editor, editorBinding);
		this.editorsBySyncs.set(editorSync, editor);
	}

	private async findOrCreateBufferForBufferSync (bufferSync : IBufferSync, uniqueUrl : string) : Promise<vscode.TextDocument> {
		let buffer : vscode.TextDocument;
		let bufferBinding = this.bufferBindingsByBufferSync.get(bufferSync);
		if (bufferBinding) {
			buffer = bufferBinding.buffer;
		} else {
			buffer = await this.createAndRegisterNewBuffer(uniqueUrl, bufferSync);
		}
		return buffer;
	}


	private async createAndRegisterNewBuffer(uniqueUrl: string, bufferSync: IBufferSync) : Promise<vscode.TextDocument> {
		const bufferURI = await this.createTemporaryFileForBufferUrl(uniqueUrl);
		this.remoteFiles.add(bufferURI.path.toLocaleLowerCase());
		let buffer = await MockableApis.workspace.openTextDocument(bufferURI);
		this.registerNewBindingForBufferAndSync(buffer, bufferSync);
		return buffer;
	}

	private registerNewBindingForBufferAndSync(buffer: vscode.TextDocument, bufferSync: IBufferSync) {
		let bufferBinding = new BufferBinding(buffer, bufferSync);
		this.bufferBindingsByBuffer.set(buffer, bufferBinding);
		this.bufferBindingsByBufferSync.set(bufferSync, bufferBinding);
		this.bufferSyncsByBuffer.set(buffer, bufferSync);
	}

	private async createTemporaryFileForBufferUrl(uniqueUrl: string) {
		const bufferPath = path.join(os.tmpdir(), uniqueUrl);
		const bufferURI = vscode.Uri.parse(fileUrl(bufferPath));
		let parent = path.dirname(bufferPath);
		if(!MockableApis.fs.existsSync(parent)) {
			await MockableApis.fsPromises.mkdir(parent, { recursive: true });
		}
		MockableApis.fs.writeFileSync(bufferURI.fsPath, '');
		return bufferURI;
	}

}
