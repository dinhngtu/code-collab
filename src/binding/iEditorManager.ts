import * as vscode from 'vscode';

export interface IEditorManager {
    isOpen(uri : vscode.Uri) : boolean;
    getOpenEditor(uri : vscode.Uri) : vscode.TextEditor;
    openDocument(uri : vscode.Uri) : Promise<vscode.TextDocument>;
    activateEditor(buffer: vscode.TextDocument) : Promise<vscode.TextEditor>;
    
}