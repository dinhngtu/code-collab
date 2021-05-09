import { instance, mock } from "ts-mockito";
import * as vscode from "vscode";
import { MemoryEditor } from "./memoryEditor";

type ActiveTextEditorChangeListener = (event : vscode.TextEditor | undefined) => Promise<void>;
type TextEditorSelectionChangeListener = (event : vscode.TextEditorSelectionChangeEvent) => void;
type ChangeVisibleTextEditorListener = (editors : vscode.TextEditor[]) => void;

export class MemoryWindow {
    activeTextEditor : vscode.TextEditor | undefined = undefined;
    visibleTextEditors : vscode.TextEditor[] = [];
    createdTextEditors = new Map<vscode.TextDocument, vscode.TextEditor>();

    activeTextEditorChangeListener : ActiveTextEditorChangeListener | undefined = undefined;
    textEditorSelectionChangeListener : TextEditorSelectionChangeListener | undefined = undefined;
    changeVisibleTextEditorListener : ChangeVisibleTextEditorListener | undefined = undefined;

    onDidChangeActiveTextEditor(listener : ActiveTextEditorChangeListener) {
        this.activeTextEditorChangeListener = listener;
    }

    onDidChangeTextEditorSelection(listener : TextEditorSelectionChangeListener) {
        this.textEditorSelectionChangeListener = listener;
    }

    onDidChangeVisibleTextEditors(listener : ChangeVisibleTextEditorListener) {
        this.changeVisibleTextEditorListener = listener;
    }

    async showTextDocument(buffer : vscode.TextDocument) {
        let editor = new MemoryEditor();
        this.createdTextEditors.set(buffer,editor);
        return editor;
    }
}