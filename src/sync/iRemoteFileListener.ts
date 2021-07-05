import { IEditorSync } from "./iEditorSync";
import * as vscode from 'vscode';

export interface IRemoteFileListener {
    onOpenRemoteFile(peer : string, uniqueUri: string, localUri : vscode.Uri, editorSync : IEditorSync) : Promise<void>;
    onCloseRemoteFile(editorSync : IEditorSync) : Promise<void>;
}