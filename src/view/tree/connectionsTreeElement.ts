import { ICollaborationTreeElement } from "./iCollaborationTreeElement";
import * as vscode from 'vscode';
import * as path from 'path';

export class ConnectionsTreeElement extends vscode.TreeItem implements ICollaborationTreeElement {
    constructor(children : boolean) {
        super("Connections",children ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        console.debug(JSON.stringify(this.iconPath));
    }

    iconPath = {
        light: path.join(__filename, '..','..','..', '..',  'resources', 'light', 'connections.svg'),
        dark: path.join(__filename, '..','..','..','..',   'resources', 'dark', 'connections.svg')
    };

    contextValue = "connections";
}
