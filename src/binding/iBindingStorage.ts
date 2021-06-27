import BufferBinding from "../BufferBinding";
import { IBufferSync } from "../sync/iBufferSync";
import * as vscode from 'vscode';
import EditorBinding from "../EditorBinding";
import { IEditorSync } from "../sync/iEditorSync";

export interface IBindingStorage {
    storeBufferBinding(bufferBinding : BufferBinding) : void;
    deleteBufferBinding(bufferBinding : BufferBinding) : void;
    findBufferBindingBySync(bufferSync : IBufferSync) : BufferBinding | null;
    findBufferBindingByBuffer(buffer : vscode.TextDocument) : BufferBinding | null;

    storeEditorBinding(editorBinding : EditorBinding) : void;
    deleteEditorBinding(editorBinding : EditorBinding) : void;
    getEditors() : vscode.TextEditor[];
    findEditorSyncByEditor(editor : vscode.TextEditor) : IEditorSync | null;
    findEditorBindingBySync(editorSync : IEditorSync) : EditorBinding | null;
    findEditorBindingByEditor(editor : vscode.TextEditor) : EditorBinding | null;
}