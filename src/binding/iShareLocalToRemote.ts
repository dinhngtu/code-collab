import * as vscode from 'vscode';
export interface IShareLocalToRemote {
    isShared(uri: vscode.Uri) : boolean;
    shareFile(uri: vscode.Uri) : Promise<void>;
    unshareFile(uri: vscode.Uri) : Promise<void>;
}