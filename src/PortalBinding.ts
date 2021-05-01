import * as vscode from 'vscode';
import { TeletypeClient, Errors, Portal, FollowState, EditorProxy, BufferProxy } from '@atom/teletype-client';
import BufferBinding from './BufferBinding';
import EditorBinding from './EditorBinding';

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { ISyncPortal } from './sync/iSyncPortal';
import { IPortalListener } from './sync/iPortalListener';
import { IEditorSync } from './sync/iEditorSync';
import { IBufferSync } from './sync/iBufferSync';
let fsPromises = fs.promises;

export default class PortalBinding implements IPortalListener{
	private disposed!: boolean;
	private editorBindingsByEditorSync = new Map<IEditorSync, EditorBinding>();
	private bufferBindingsByBufferSync = new Map<IBufferSync, BufferBinding>();
	private bufferBindingsByBuffer = new Map<vscode.TextDocument, BufferBinding>();
	private editorBindingsByEditor = new Map<vscode.TextEditor, EditorBinding>();
	private editorSyncsByEditor = new WeakMap<vscode.TextEditor, IEditorSync>();


	constructor(public syncPortal : ISyncPortal, public isHost : boolean) {

	}

	async onOpenRemoteFile(uniqueUri: string, editorSync: IEditorSync): Promise<void> {
		await this.findOrCreateEditorByEditorSync(uniqueUri, editorSync);
	}

	async initialize() {
		this.syncPortal.setListener(this);
		this.registerWorkspaceEvents();
		if(this.isHost) {
			this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
		}
	}

	private registerWorkspaceEvents () {
		vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this));
		vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor.bind(this));
		vscode.workspace.onWillSaveTextDocument(this.saveDocument.bind(this));
		vscode.window.onDidChangeTextEditorSelection(this.triggerSelectionChanges.bind(this));
		vscode.window.onDidChangeVisibleTextEditors(this.onDidChangeVisibleTextEditors.bind(this));
	}

	private onDidChangeVisibleTextEditors(editors : vscode.TextEditor[]) {
		for(let editor of this.editorBindingsByEditor.keys()) {
			if(!editors.includes(editor)) {
				this.editorBindingsByEditor.delete(editor);
				this.editorSyncsByEditor.get(editor)!.close();
				this.editorSyncsByEditor.delete(editor);
			}
		}
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
		if(this.isHost && event) {
			let editorSync = this.editorSyncsByEditor.get(event);
			if(!editorSync) {
				try {
					editorSync = await this.createAndRegisterEditorSyncForLocalEditor(editorSync, event);
				} catch(error) {
					console.log(error);
					return;
				}
			}
			this.syncPortal.activateFileToRemote(editorSync!);
			
		}
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
	}

	isDisposed() {
		return this.disposed;
	}


	private async findOrCreateEditorByEditorSync (uniqueUrl : string, editorSync : IEditorSync) : Promise<vscode.TextEditor> {
		let editor : vscode.TextEditor;
		let editorBinding = this.editorBindingsByEditorSync.get(editorSync);
		if (editorBinding && vscode.window.visibleTextEditors.includes(editorBinding.editor)) {
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

		let editor = await vscode.window.showTextDocument(buffer);
		await vscode.commands.executeCommand('workbench.action.keepEditor');
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
		let buffer = await vscode.workspace.openTextDocument(bufferURI);

		this.registerNewBindingForBufferAndSync(buffer, bufferSync);
		return buffer;
	}

	private registerNewBindingForBufferAndSync(buffer: vscode.TextDocument, bufferSync: IBufferSync) {
		let bufferBinding = new BufferBinding(buffer, bufferSync);
		this.bufferBindingsByBuffer.set(buffer, bufferBinding);
		this.bufferBindingsByBufferSync.set(bufferSync, bufferBinding);
	}

	private async createTemporaryFileForBufferUrl(uniqueUrl: string) {
		const bufferPath = path.join(os.tmpdir(), uniqueUrl);
		const bufferURI = vscode.Uri.parse(this.fileUrl(bufferPath));
		await fsPromises.mkdir(path.dirname(bufferURI.fsPath), { recursive: true });
		fs.writeFileSync(bufferURI.fsPath, '');
		return bufferURI;
	}

	fileUrl(str : string) {	
		var pathName = path.resolve(str).replace(/\\/g, '/');
	
		// Windows drive letter must be prefixed with a slash
		if (pathName[0] !== '/') {
			pathName = '/' + pathName;
		}
	
		return encodeURI('file://' + pathName);
	};
}
