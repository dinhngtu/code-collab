import { instance, mock } from 'ts-mockito';
import * as vscode from 'vscode';

type ChangeTextDocumentListener = (event : vscode.TextDocumentChangeEvent) => void;
type WillSaveTextDocumentListener = (event : vscode.TextDocumentWillSaveEvent) => void;

//this works around a very weird mockito bug that creates a promise if an object is returned from an async method
export class MockTextDocument implements vscode.TextDocument {
    mockClass = mock<vscode.TextDocument>();
    mockInstance = instance(this.mockClass);


    uri: vscode.Uri = undefined as unknown as vscode.Uri;
    fileName: string ="mock";
    isUntitled: boolean = false;
    languageId: string = "any";
    version: number = 0;
    isDirty: boolean = false;
    isClosed: boolean = false;
    
    eol: vscode.EndOfLine = vscode.EndOfLine.LF;
    lineCount: number = 0;

    save(): Thenable<boolean> {
        return this.mockInstance.save();
    }

    lineAt(position: any) {
        return this.mockInstance.lineAt(position);
    }

    offsetAt(position: vscode.Position): number {
        return this.mockInstance.offsetAt(position);
    }

    positionAt(offset: number): vscode.Position {
        return this.mockInstance.positionAt(offset);
    }

    getText(range?: vscode.Range): string {
        return this.mockInstance.getText(range);
    }

    getWordRangeAtPosition(position: vscode.Position, regex?: RegExp): vscode.Range | undefined {
        return this.mockInstance.getWordRangeAtPosition(position, regex);
    }

    validateRange(range: vscode.Range): vscode.Range {
        return this.mockInstance.validateRange(range);
    }

    validatePosition(position: vscode.Position): vscode.Position {
        return this.mockInstance.validatePosition(position);
    }


}

export class MemoryWorkspace {
    openedTextDocuments = new Map<vscode.Uri, vscode.TextDocument>();
    changeTextDocumentListener : ChangeTextDocumentListener | undefined = undefined;
    willSaveTextDocumentListener : WillSaveTextDocumentListener | undefined = undefined;

    async openTextDocument(uri : vscode.Uri) : Promise<vscode.TextDocument> {
        let document = new MockTextDocument();
        this.openedTextDocuments.set(uri, document);
        return document;
    }

    onDidChangeTextDocument(listener : ChangeTextDocumentListener) {
        this.changeTextDocumentListener = listener;
    }

    onWillSaveTextDocument(listener : WillSaveTextDocumentListener) {
        this.willSaveTextDocumentListener = listener;
    }

}