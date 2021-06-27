import { ICollaborationTreeElement } from "./iCollaborationTreeElement";
import * as vscode from 'vscode';
import * as path from 'path';
import { SyncConnection } from "../../binding/syncConnection";

export class ConnectionTreeElement extends vscode.TreeItem implements ICollaborationTreeElement {
    constructor(public connection : SyncConnection) {
        super(connection.getName() + " ("+connection.getType()+")", connection.peerManager.peers.length === 0?vscode.TreeItemCollapsibleState.None:vscode.TreeItemCollapsibleState.Expanded);
        console.log(JSON.stringify(this.iconPath));
    }

    iconPath = {
        light: path.join(__filename, '..','..','..','..',   'resources', 'light', 'connection.svg'),
        dark: path.join(__filename, '..','..','..','..',  'resources', 'dark', 'connection.svg')
    };

    contextValue = "connection";
}