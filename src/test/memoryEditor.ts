import * as vscode from 'vscode';

class MemoryTextEditorEdit implements vscode.TextEditorEdit {

    constructor(public editor : MemoryEditor) {

    }

    replace(location: vscode.Selection | vscode.Range | vscode.Position, value: string): void {
        this.editor.replace(location, value);
    }

    insert(location: vscode.Position, value: string): void {
        this.editor.insert(location, value);
    }

    delete(location: vscode.Selection | vscode.Range): void {
        this.editor.delete(location);
    }

    setEndOfLine(endOfLine: vscode.EndOfLine): void {
        throw new Error('Method not implemented.');
    }

}

export class MemoryEditor implements vscode.TextEditor {
    document : vscode.TextDocument = undefined as unknown as vscode.TextDocument;
    selection: vscode.Selection = new vscode.Selection(new vscode.Position(0,0), new vscode.Position(0,0));
    selections: vscode.Selection[] = [];
    visibleRanges: vscode.Range[] = [];
    options: vscode.TextEditorOptions = {};
    viewColumn?: vscode.ViewColumn | undefined = undefined;
    lines : string[] = [];

    replace(location: vscode.Selection | vscode.Range | vscode.Position, value: string): void {
        if(location instanceof vscode.Range) {
            let newLines : string[] = [];
            for(let i = 0;i<location.start.line;i++) {
                newLines.push(this.lines[i]);
            }
            let replaceLines = value.split('\n');
            if(location.start.character>0) {
                replaceLines[0]=this.lines[location.start.line].substr(0,location.start.character) + replaceLines[0];
            }
            if(this.lines.length>location.end.line && location.end.character<this.lines[location.end.line].length-1) {
                replaceLines[replaceLines.length-1]=replaceLines[replaceLines.length-1] + this.lines[location.end.line].substr(location.end.character);
            }
            for(let i = 0;i<replaceLines.length;i++) {
                newLines.push(replaceLines[i]);
            }
            for(let i = location.end.line+1;i<this.lines.length;i++) {
                newLines.push(this.lines[i]);
            } 
            this.lines = newLines;
        } else {
            throw new Error('Method not implemented.');
        }
    }
    
    insert(location: vscode.Position, value: string): void {
        this.replace(new vscode.Range(location,location),value);
    }

    delete(location: vscode.Selection | vscode.Range): void {
        this.replace(location,"");
    }


    edit(callback: (editBuilder: vscode.TextEditorEdit) => void, options?: { undoStopBefore: boolean; undoStopAfter: boolean; }): Thenable<boolean> {
        callback(new MemoryTextEditorEdit(this));
        return Promise.resolve(true);
    }

    insertSnippet(snippet: vscode.SnippetString, location?: vscode.Range | vscode.Range[] | vscode.Position | vscode.Position[], options?: { undoStopBefore: boolean; undoStopAfter: boolean; }): Thenable<boolean> {
        throw new Error('Method not implemented.');
    }

    setDecorations(decorationType: vscode.TextEditorDecorationType, rangesOrOptions: vscode.Range[] | vscode.DecorationOptions[]): void {
        throw new Error('Method not implemented.');
    }

    revealRange(range: vscode.Range, revealType?: vscode.TextEditorRevealType): void {
        throw new Error('Method not implemented.');
    }

    show(column?: vscode.ViewColumn): void {
        throw new Error('Method not implemented.');
    }

    hide(): void {
        throw new Error('Method not implemented.');
    }

}