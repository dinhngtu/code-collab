import EditorBinding from "../EditorBinding";
import { IEditorSync } from "../sync/iEditorSync";
import * as vscode from 'vscode';

export interface IEditorBindingFactory {
    createBinding(editor : vscode.TextEditor, sync : IEditorSync) : EditorBinding;
}