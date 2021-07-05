import * as vscode from 'vscode';

export interface IWorkspaceEventListener {
    onLocalFileOpened(editor : vscode.TextEditor) : void;
}