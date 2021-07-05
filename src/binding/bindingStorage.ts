import BufferBinding from "../BufferBinding";
import { IBindingStorage } from "./iBindingStorage";
import * as vscode from 'vscode';
import { IBufferSync } from "../sync/iBufferSync";
import EditorBinding from "../EditorBinding";
import { IEditorSync } from "../sync/iEditorSync";

export class BindingStorage implements IBindingStorage{


    
	private bufferBindingsByBufferSync = new Map<IBufferSync, BufferBinding>();
	private bufferBindingsByBuffer = new Map<vscode.TextDocument, BufferBinding>();


	private editorBindingsByEditorSync = new Map<IEditorSync, EditorBinding>();
	private editorBindingsByEditor = new Map<vscode.TextEditor, EditorBinding>();
	private editorSyncsByEditor = new WeakMap<vscode.TextEditor, IEditorSync>();
	private editorsBySyncs = new Map<IEditorSync, vscode.TextEditor>();


    storeBufferBinding(bufferBinding: BufferBinding): void {
        this.bufferBindingsByBufferSync.set(bufferBinding.bufferSync, bufferBinding);
        this.bufferBindingsByBuffer.set(bufferBinding.buffer, bufferBinding);
    }

    deleteBufferBinding(bufferBinding: BufferBinding): void {
        this.bufferBindingsByBufferSync.delete(bufferBinding.bufferSync);
        this.bufferBindingsByBuffer.delete(bufferBinding.buffer);
    }

    findBufferBindingBySync(bufferSync: IBufferSync): BufferBinding | null {
        return this.bufferBindingsByBufferSync.has(bufferSync) ? this.bufferBindingsByBufferSync.get(bufferSync)! : null;
    }

    findBufferBindingByBuffer(buffer: vscode.TextDocument): BufferBinding | null {
        return this.bufferBindingsByBuffer.has(buffer) ? this.bufferBindingsByBuffer.get(buffer)! : null;
    }

    storeEditorBinding(editorBinding: EditorBinding): void {
        this.editorBindingsByEditorSync.set(editorBinding.editorSync, editorBinding);
        this.editorBindingsByEditor.set(editorBinding.editor, editorBinding);
        this.editorSyncsByEditor.set(editorBinding.editor, editorBinding.editorSync);
        this.editorsBySyncs.set(editorBinding.editorSync, editorBinding.editor);
    }

    deleteEditorBinding(editorBinding: EditorBinding): void {
        this.editorBindingsByEditorSync.delete(editorBinding.editorSync);
        this.editorBindingsByEditor.delete(editorBinding.editor);
        this.editorSyncsByEditor.delete(editorBinding.editor);
        this.editorsBySyncs.delete(editorBinding.editorSync);
    }  

    getEditors(): vscode.TextEditor[] {
        return Array.from(this.editorBindingsByEditor.keys());
    }

    findEditorSyncByEditor(editor: vscode.TextEditor): IEditorSync | null {
        return this.editorSyncsByEditor.has(editor) ? this.editorSyncsByEditor.get(editor)! : null;
    }

    findEditorBindingBySync(editorSync: IEditorSync): EditorBinding | null {
        return this.editorBindingsByEditorSync.has(editorSync) ? this.editorBindingsByEditorSync.get(editorSync)! : null;
    }

    findEditorBindingByEditor(editor: vscode.TextEditor): EditorBinding | null {
        return this.editorBindingsByEditor.has(editor) ? this.editorBindingsByEditor.get(editor)! : null;
    }

}