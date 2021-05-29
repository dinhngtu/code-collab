import { CollaborationTreeElement } from "./collaborationTreeElement";
import * as vscode from 'vscode';
import * as path from 'path';

export class ConnectionsTreeElement extends vscode.TreeItem implements CollaborationTreeElement {
    constructor() {
        super("Connections");
        console.log(JSON.stringify(this.iconPath));
    }

    iconPath = {
        light: path.join(__filename, '..','..','..',  'resources', 'light', 'connections.svg'),
        dark: path.join(__filename, '..','..','..',  'resources', 'dark', 'connections.svg')
    }

    contextValue = "connections";
}