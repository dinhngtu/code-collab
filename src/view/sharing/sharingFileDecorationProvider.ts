import * as vscode from 'vscode';
import { ConnectionManager } from '../../connectionManager';
import { ISharingListener } from './iSharingListener';

export class SharingFileDecorationProvider implements vscode.FileDecorationProvider, ISharingListener {

    constructor(private connectionManager : ConnectionManager) {

    }
    
    private readonly onDidChangeDecorationsEmitter = new vscode.EventEmitter<vscode.Uri[]>();

    onDidChangeFileDecorations?: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> = this.onDidChangeDecorationsEmitter.event;
    
    async provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
        if(this.isShared(uri)) {
            return new vscode.FileDecoration("S", undefined, undefined);
        }
    }

    isShared(uri: vscode.Uri) {
        for(let connection of this.connectionManager.getConnections()) {
            if(connection.shareLocalToRemote.isShared(uri)) {
                return true;
            }
        }
        return false;
    }

    onFileShare(uri: vscode.Uri): void {
        this.onDidChangeDecorationsEmitter.fire([uri]);
    }
    
    onFileUnshare(uri: vscode.Uri): void {
        this.onDidChangeDecorationsEmitter.fire([uri]);
    }

}