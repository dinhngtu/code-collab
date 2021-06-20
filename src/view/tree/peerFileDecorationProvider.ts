import * as vscode from 'vscode';
import { IColorManager } from '../../color/iColorManager';

export class PeerFileDecorationProvider implements vscode.FileDecorationProvider {

    constructor(private colorManager : IColorManager) {

    }
    
    onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> | undefined;
    
    async provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
        if(uri.scheme === "collab-peer") {
            let peer = uri.authority;
            return new vscode.FileDecoration(undefined, undefined, this.colorManager.getVSCodeColor(peer));
        }
    }

}