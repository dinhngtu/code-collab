import * as vscode from 'vscode';

export interface IDocumentListener {
    onDidChangeTextDocument (event : vscode.TextDocumentChangeEvent) : void;
}