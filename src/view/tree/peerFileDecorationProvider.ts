import * as vscode from 'vscode';

export class PeerFileDecorationProvider implements vscode.FileDecorationProvider {
    
    onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> | undefined;
    
    async provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
        if(uri.scheme === "collab-peer") {
            let peer = uri.authority;
            return new vscode.FileDecoration(undefined, undefined, new vscode.ThemeColor("collab.peer.1"));
        }
    }

}