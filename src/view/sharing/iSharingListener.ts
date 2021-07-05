import * as vscode from 'vscode';

export interface ISharingListener {
    onFileShare(uri : vscode.Uri) : void;
    onFileUnshare(uri : vscode.Uri) : void;
}