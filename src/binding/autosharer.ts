import { TextEditor, Uri, WorkspaceFolder } from "vscode";
import { MockableApis } from "../base/mockableApis";
import { ISyncPortal } from "../sync/iSyncPortal";
import { IFileAgeQuery } from "../view/sharing/iFileAgeQuery";
import { IAutosharer } from "./iAutosharer";
import { IBindingStorage } from "./iBindingStorage";
import { IBufferBindingFactory } from "./iBufferBindingFactory";
import { IEditorManager } from "./iEditorManager";
import { IEditorBindingFactory } from "./iEdtorBindingFactory";
import { IWorkspaceEventListener } from "./iWorkspaceEventListener";
import { SharedFile } from "./sharedFile";

export class Autosharer implements IAutosharer, IWorkspaceEventListener {

    private enabled : boolean = false;
    private autosharedFiles = new Map<string, SharedFile>();
    constructor(private syncPortal : ISyncPortal,  private editorManager : IEditorManager, private bufferBindingFactory : IBufferBindingFactory, private editorBindingFactory : IEditorBindingFactory, private bindingStorage : IBindingStorage, 
        private fileAgeQuery : IFileAgeQuery) {
    }

    enable(): void {
        if(!this.enabled) {
            if(!this.syncPortal.supportsLocalshare()) {
                throw new Error("The Sync Provider does not support local share, cannot enable autoshare");
            }
            this.enabled = true;

            MockableApis.executor.executeTimeout(async () => {
                for(let editor of this.editorManager.getOpenEditors()) {
                    this.onLocalFileOpened(editor);
                }
                this.editorManager.addListener(this);
            }, 500);
            
        }
        
    }

    async autoshareIfEnabled(workspace: string, uri: Uri): Promise<void> {
        if(this.enabled) {
            if(this.autosharedFiles.has(uri.fsPath)) {
                this.reshareFile(uri);
            } else {
                await this.shareNewFile(uri, workspace);
            }
            
        }
    }

    private async shareNewFile(uri: Uri, workspace: string) {
        var override = await this.determineOverride(workspace, uri);
        let document = this.editorManager.getOpenEditor(uri).document;
        let editorSync = await this.syncPortal.shareLocal(workspace, uri.fsPath, document.getText(), override);
        let editor = this.editorManager.getOpenEditor(uri);
        let bufferBinding = this.bufferBindingFactory.createBinding(document, editorSync.getBufferSync(), uri.fsPath);
        bufferBinding.editor = editor;
        this.bindingStorage.storeBufferBinding(bufferBinding);
        let editorBinding = this.editorBindingFactory.createBinding(editor, editorSync);
        this.bindingStorage.storeEditorBinding(editorBinding);
        this.autosharedFiles.set(uri.fsPath, new SharedFile(bufferBinding, editorSync));
        console.debug(uri.fsPath + " is autoshared on workspace " + workspace);
    }

    private async determineOverride(workspace: string, uri: Uri) {
        var override = false;
        if (this.syncPortal.supportsFileAge()) {
            let lastSave = this.syncPortal.getFileAge(workspace, uri.fsPath);
            let localChange = MockableApis.filesystem.getLastModifyDate(uri.fsPath);
            if (lastSave && localChange > lastSave + 1000) {
                override = await this.fileAgeQuery.askOverride(uri.fsPath);
            }
        }
        return override;
    }

    private reshareFile(uri: Uri) {
        let editor = this.editorManager.getOpenEditor(uri);
        let sharedFile = this.autosharedFiles.get(uri.fsPath)!;
        sharedFile.bufferBinding.editor = editor;
        let editorBinding = this.bindingStorage.findEditorBindingBySync(sharedFile.editorSync);
        if(editorBinding) {
            this.bindingStorage.deleteEditorBinding(editorBinding);
            editorBinding.editor = editor;
            this.bindingStorage.storeEditorBinding(editorBinding);
        } else {
            let editorBinding = this.editorBindingFactory.createBinding(this.editorManager.getOpenEditor(uri), sharedFile.editorSync);
            this.bindingStorage.storeEditorBinding(editorBinding);
        }
        console.debug(uri.fsPath + " was already autoshared, reenabled binding");
    }

    async onLocalFileOpened(editor: TextEditor): Promise<void> {
        let workspace = this.getWorkspace(editor);
        if(workspace) {
            await this.autoshareIfEnabled(workspace, editor.document.uri);
        } else {
            console.warn("Cannot autoshare "+editor.document.uri.fsPath+" because no workspace could be determined for it");
        }
    }

    private getWorkspace(editor : TextEditor) : string | null {
        let workspaceFolders : ReadonlyArray<WorkspaceFolder> = MockableApis.workspace.workspaceFolders;
        for(let folder of workspaceFolders) {
            if(editor.document.uri.fsPath.startsWith(folder.uri.fsPath)) {
                return folder.uri.fsPath;
            }
        }
        return null;
    }

}