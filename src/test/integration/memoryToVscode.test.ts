import assert = require('assert');
import * as vscode from 'vscode';
import { MockableApis } from "../../base/mockableApis";
import PortalBinding from "../../PortalBinding";
import { Position } from '../../sync/data/position';
import { TextChange, TextChangeType } from '../../sync/data/textChange';
import { MemoryBufferSync } from "../../sync/memory/memoryBufferSync";
import { MemoryEditorSync } from "../../sync/memory/memoryEditorSync";
import { MemorySyncPortal } from "../../sync/memory/memorySyncPortal";
import * as temp from 'temp';
import { fileUrl } from '../../base/functions';
import { IBufferListener } from '../../sync/iBufferListener';
import * as fs from 'fs';

suite("MemoryToVscodeTest", function () {

    let syncPortal = new MemorySyncPortal();

    let portalBinding = new PortalBinding(syncPortal, true);

    suiteSetup(async () => {
        MockableApis.restore();
        portalBinding.initialize();
        
    });

    setup(async () => {
        await closeOpenWindows();
        await closeOpenWindows();
        syncPortal.localFiles = [];
        syncPortal.activeEditorSync = null;
    });

    test("test open remote file and edit", async () => {
        let editorSync = new MemoryEditorSync();
        await syncPortal.listener?.onOpenRemoteFile("test.txt", editorSync);
        let activeEditor = vscode.window.activeTextEditor;
        let bufferSync = (editorSync.getBufferSync() as MemoryBufferSync);
        let bufferListener =  bufferSync.listener!;
        await bufferListener.onSetText("Halo");
        await sleep(250);
        assert.strictEqual(activeEditor?.document.getText(), "Halo");
        await remoteEdit(activeEditor, bufferListener, bufferSync);
        await bufferListener.onSetText("Halo");
        await sleep(250);
        await localEdit(activeEditor!, bufferSync);
    });

    test("Test open local file, edit and save", async () => {
        let tmpFile = temp.openSync("sync_");
        fs.writeFileSync(tmpFile.path, "Halo");
        
        let buffer = await vscode.workspace.openTextDocument(vscode.Uri.parse(fileUrl(tmpFile.path)));
        let editor = await vscode.window.showTextDocument(buffer);

        assert.strictEqual(syncPortal.localFiles.length, 1);
        let editorSync = syncPortal.activeEditorSync;
        assert.ok(editorSync);
        let bufferSync = editorSync.getBufferSync() as MemoryBufferSync;
        assert.ok(bufferSync);

        bufferSync.localChanges = [];

        await remoteEdit(editor, bufferSync.listener!, bufferSync);

        await localEdit(editor, bufferSync);

        await bufferSync.listener!.onSave();

        await sleep(250);

        let content = fs.readFileSync(tmpFile.path, {flag:'r'});
        assert.strictEqual(content.toString(), "Hllo");
    });


    test("Test open remote file and send many changes", async () => {
        let editorSync = new MemoryEditorSync();
        await syncPortal.listener?.onOpenRemoteFile("test.txt", editorSync);
        let bufferSync = (editorSync.getBufferSync() as MemoryBufferSync);
        let bufferListener =  bufferSync.listener!;
        bufferListener.onSetText("");
        await sleep(250);
        bufferSync.localChanges = [];
        for(var i = 0;i<1000;i++) {
            await bufferListener.onTextChanges([new TextChange(TextChangeType.INSERT, new Position(0, 1), new Position(0, 1), "b"),new TextChange(TextChangeType.INSERT, new Position(0, 0), new Position(0, 0), "a")]);
        }
        await sleep(250);
        assert.strictEqual(bufferSync.localChanges.length, 0);

    });
});

async function closeOpenWindows() {
    for (let editor of vscode.window.visibleTextEditors) {
        try {
            await vscode.window.showTextDocument(editor.document);
            vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        } catch (error) {
        }
    }
}

async function localEdit(editor: vscode.TextEditor, bufferSync: MemoryBufferSync) {
    await editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 1), "a");
    });
    await editor.edit((editBuilder) => {
        editBuilder.replace(new vscode.Range(new vscode.Position(0, 1), new vscode.Position(0, 2)), "e");
    });
    await editor.edit((editBuilder) => {
        editBuilder.delete(new vscode.Range(new vscode.Position(0, 1), new vscode.Position(0, 2)));
    });

    assert.strictEqual(bufferSync.localChanges.length, 3);
    assert.deepStrictEqual(bufferSync.localChanges[0], new TextChange(TextChangeType.UPDATE, new Position(0, 1), new Position(0, 1), "a"));
    assert.deepStrictEqual(bufferSync.localChanges[1], new TextChange(TextChangeType.UPDATE, new Position(0, 1), new Position(0, 2), "e"));
    assert.deepStrictEqual(bufferSync.localChanges[2], new TextChange(TextChangeType.UPDATE, new Position(0, 1), new Position(0, 2), ""));
}

async function remoteEdit(activeEditor: vscode.TextEditor | undefined, bufferListener: IBufferListener, bufferSync: MemoryBufferSync) {
    await bufferListener.onTextChanges([new TextChange(TextChangeType.INSERT, new Position(0, 3), new Position(0, 3), "l")]);
    await sleep(250);
    assert.strictEqual(activeEditor?.document.getText(), "Hallo");
    await bufferListener.onTextChanges([new TextChange(TextChangeType.UPDATE, new Position(0, 1), new Position(0, 2), "e")]);
    await sleep(250);
    assert.strictEqual(activeEditor?.document.getText(), "Hello");
    await bufferListener.onTextChanges([new TextChange(TextChangeType.DELETE, new Position(0, 1), new Position(0, 2), "")]);
    await sleep(250);
    assert.strictEqual(activeEditor?.document.getText(), "Hllo");

    assert.strictEqual(bufferSync.localChanges.length, 0);
}

function sleep(ms : number) : Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}