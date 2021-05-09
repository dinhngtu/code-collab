import assert = require('assert');
import * as vscode from 'vscode';
import { MockableApis } from "../../base/mockableApis";
import PortalBinding from "../../PortalBinding";
import { Position } from '../../sync/data/position';
import { TextChange, TextChangeType } from '../../sync/data/textChange';
import { MemoryBufferSync } from "../../sync/memory/memoryBufferSync";
import { MemoryEditorSync } from "../../sync/memory/memoryEditorSync";
import { MemorySyncPortal } from "../../sync/memory/memorySyncPortal";

suite("MemoryToVscodeTest", function () {

    let syncPortal = new MemorySyncPortal();

    let portalBinding = new PortalBinding(syncPortal, false);

    suiteSetup(async () => {
        MockableApis.restore();
        portalBinding.initialize();
        for(let editor of vscode.window.visibleTextEditors) {
            await vscode.window.showTextDocument(editor.document);
            vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    });

    test("test open remote file and edit", async () => {
        let editorSync = new MemoryEditorSync();
        await syncPortal.listener?.onOpenRemoteFile("test.txt", editorSync);
        let activeEditor = vscode.window.activeTextEditor;
        let bufferSync = (editorSync.bufferSync as MemoryBufferSync);
        let bufferListener =  bufferSync.listener!;
        await bufferListener.onSetText("Halo");
        await sleep(250);
        assert.strictEqual(activeEditor?.document.getText(), "Halo");
        await bufferListener.onTextChanges([new TextChange(TextChangeType.INSERT, new Position(0,3), new Position(0,3), "l")]);
        await sleep(250);
        assert.strictEqual(activeEditor?.document.getText(), "Hallo");
        await bufferListener.onTextChanges([new TextChange(TextChangeType.UPDATE, new Position(0,1), new Position(0,2), "e")]);
        await sleep(250);
        assert.strictEqual(activeEditor?.document.getText(), "Hello");
        await bufferListener.onTextChanges([new TextChange(TextChangeType.DELETE, new Position(0,1), new Position(0,2), "")]);
        await sleep(250);
        assert.strictEqual(activeEditor?.document.getText(), "Hllo");

        assert.strictEqual(bufferSync.localChanges.length,0);
    });

    test("Test open local file, edit remotely and save", async () => {
        // TODO: implement
    });

    test("Test open remote file and edit locally", async () => {
        // TODO: implement
    });

    test("Test open remote file and edit both locally and remotely", async () => {
        // TODO: implement
    });


    test("Test open remote file and send many changes", async () => {
        // TODO: implement
    });
});

function sleep(ms : number) : Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}