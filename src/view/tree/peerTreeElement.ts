import { ICollaborationTreeElement } from "./iCollaborationTreeElement";
import * as vscode from 'vscode';
import * as path from 'path';

export class PeerTreeElement extends vscode.TreeItem implements ICollaborationTreeElement {
    constructor(private peer : string) {
        super(peer);
        this.resourceUri=vscode.Uri.parse("collab-peer://"+peer);
    }

    iconPath = {
        light: path.join(__filename, '..','..','..','..',   'resources', 'light', 'peer.svg'),
        dark: path.join(__filename, '..','..','..','..',  'resources', 'dark', 'peer.svg')
    }

    contextValue = "peer";
}