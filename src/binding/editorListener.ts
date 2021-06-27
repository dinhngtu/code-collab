import { MockableApis } from "../base/mockableApis";
import { IBindingStorage } from "./iBindingStorage";
import * as vscode from 'vscode';

export class EditorListener {
    
    constructor(private bindingStorage : IBindingStorage) {

    }
    
    initialize() {
		MockableApis.window.onDidChangeTextEditorSelection(this.triggerSelectionChanges.bind(this));
    }

    private triggerSelectionChanges(event : vscode.TextEditorSelectionChangeEvent) {
		const editorBinding = this.bindingStorage.findEditorBindingByEditor(event.textEditor);
		if (editorBinding) {
			editorBinding.updateSelections(event.selections);
		}
	}
}