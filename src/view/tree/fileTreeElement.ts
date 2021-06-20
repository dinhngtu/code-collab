import { ICollaborationTreeElement } from "./iCollaborationTreeElement";
import * as vscode from 'vscode';
import * as path from 'path';
import BufferBinding from "../../BufferBinding";

export class FileTreeElement extends vscode.TreeItem implements ICollaborationTreeElement {
    constructor(public binding : BufferBinding) {
        super(binding.fileName);
    }

    iconPath = {
        light: path.join(__filename, '..','..','..','..',   'resources', 'light', 'file.svg'),
        dark: path.join(__filename, '..','..','..','..',  'resources', 'dark', 'file.svg')
    };

    contextValue = "file";
}