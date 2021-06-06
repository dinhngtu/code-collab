import { ICollaborationTreeElement } from "./iCollaborationTreeElement";
import * as vscode from 'vscode';
import * as path from 'path';
import PortalBinding from "../../PortalBinding";

export class ConnectionTreeElement extends vscode.TreeItem implements ICollaborationTreeElement {
    constructor(public binding : PortalBinding) {
        super(binding.getName() + " ("+binding.getType()+")", binding.peers.length === 0?vscode.TreeItemCollapsibleState.None:vscode.TreeItemCollapsibleState.Expanded);
        console.log(JSON.stringify(this.iconPath));
    }

    iconPath = {
        light: path.join(__filename, '..','..','..','..',   'resources', 'light', 'connection.svg'),
        dark: path.join(__filename, '..','..','..','..',  'resources', 'dark', 'connection.svg')
    };

    contextValue = "connection";
}