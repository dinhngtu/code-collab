import { anything, deepEqual, instance, mock, verify } from 'ts-mockito';
import * as vscode from 'vscode';
import { MockableApis } from '../../base/mockableApis';
import { Position } from '../../sync/data/position';
import EditorBinding from '../../EditorBinding';
import { IEditorSync } from '../../sync/iEditorSync';
import { Selection } from '../../sync/data/selection';


suite("EditorBinding", function () {

    MockableApis.window = {
        visibleTextEditors : []
    }

    let editorClass = mock<vscode.TextEditor>();
    let editorSyncClass = mock<IEditorSync>();
    let editor = instance(editorClass);
    let editorSync = instance(editorSyncClass);

    let editorBinding = new EditorBinding(editor, editorSync);


    test("test remote to local selections", async function() {
        await editorBinding.onSelectionsChangedForPeer("peer",[
            new Selection("1",new Position(1,1), new Position(1,3), false, false),
            new Selection("2",new Position(1,3), new Position(1,3), false, true)
        ]);
        verify(editorClass.setDecorations(anything(), deepEqual([new vscode.Range(new vscode.Position(1,1), new vscode.Position(1,3))]))).once();
        verify(editorClass.setDecorations(anything(), deepEqual([new vscode.Range(new vscode.Position(1,3), new vscode.Position(1,3))]))).once();
    });

    test("test local to remote selections", async function() {
        editorBinding.updateSelections([
            new vscode.Selection(new vscode.Position(1,1), new vscode.Position(1,3)), 
            new vscode.Selection(new vscode.Position(1,3), new vscode.Position(1,3))
        ]);
        verify(editorSyncClass.sendSelectionsToRemote(deepEqual([
            new Selection("0", new Position(1,1), new Position(1,3), false, false),
            new Selection("1", new Position(1,3), new Position(1,3), true, true)
        ]))).once();
    });


});
