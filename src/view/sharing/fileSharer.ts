import { ConnectionManager } from "../../connectionManager";
import * as vscode from 'vscode';
import { input } from "../base/viewFunctions";
import { removeValueFromArray } from "../../base/functions";
import { ISharingListener } from "./iSharingListener";
import { SyncConnection } from "../../binding/syncConnection";
export class FileSharer {

    private sharedFiles : string[] = [];

    constructor(private connectionManager : ConnectionManager, private listener : ISharingListener) {
        this.syncSharedWithContext();
    }

    async shareFile(uri : vscode.Uri) : Promise<void>{
        let sharingConnections : SyncConnection[] = [];
        let namedConnections = new Map<string, SyncConnection>();
        for(let connection of this.connectionManager.getConnections()) {
            if(connection.shareLocalToRemote.isShared(uri)) {
                throw new Error("File is already shared");
            }
            if(connection.isHost()) {
                sharingConnections.push(connection);
                namedConnections.set(connection.getName(), connection);
            }
        }
        if(sharingConnections.length === 0) {
            throw new Error("No sharing connection in host mode configured");
        }

        let choice = await input(async () => await vscode.window.showQuickPick(Array.from(namedConnections.keys()), {canPickMany : false}));
        let connection = namedConnections.get(choice)!;

        await connection.shareLocalToRemote.shareFile(uri);

        if(!this.sharedFiles.includes(uri.fsPath)) {
            this.sharedFiles.push(uri.fsPath);
            this.listener.onFileShare(uri);
            this.syncSharedWithContext();
        }
    }

    async unshareFile(uri : vscode.Uri) : Promise<void> {
        for(let connection of this.connectionManager.getConnections()) {
            if(connection.shareLocalToRemote.isShared(uri)) {
                await connection.shareLocalToRemote.unshareFile(uri);
            }
        }
        removeValueFromArray(this.sharedFiles, uri.fsPath);
        this.listener.onFileUnshare(uri);
        this.syncSharedWithContext();
    }

    private syncSharedWithContext() {
        vscode.commands.executeCommand('setContext', 'ext.sharedFiles', this.sharedFiles);
    }
}