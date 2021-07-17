import * as vscode from 'vscode';

export interface IAutosharer {
    enable() : void;
    autoshareIfEnabled(workspace : string, uri: vscode.Uri) : Promise<void>;
}