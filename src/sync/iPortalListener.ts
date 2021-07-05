import { IDisposable } from "../base/iDisposable";
import { IEditorSync } from "./iEditorSync";
import * as vscode from 'vscode';

export interface IPortalListener extends IDisposable {
    onOpenRemoteFile(peer : string, uniqueUri: string, fileUri : vscode.Uri, editorSync : IEditorSync) : Promise<void>;
    onActivateRemoveFile(editorSync : IEditorSync) : Promise<void>;
    onCloseRemoteFile(editorSync : IEditorSync) : Promise<void>;
    onPeerJoined(peer : string) : Promise<void>;
    onPeerLeft(peer : string) : Promise<void>;
}