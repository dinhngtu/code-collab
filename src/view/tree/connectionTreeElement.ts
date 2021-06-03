import { CollaborationTreeElement } from "./collaborationTreeElement";
import * as vscode from 'vscode';
import * as path from 'path';
import PortalBinding from "../../PortalBinding";

export class ConnectionTreeElement extends vscode.TreeItem implements CollaborationTreeElement {
    constructor(private binding : PortalBinding) {
        super(binding.getName() + " ("+binding.getType()+")");
        console.log(JSON.stringify(this.iconPath));
    }

    iconPath = {
        light: path.join(__filename, '..','..','..',  'resources', 'light', 'connection.svg'),
        dark: path.join(__filename, '..','..','..',  'resources', 'dark', 'connection.svg')
    }

    contextValue = "connection";
}