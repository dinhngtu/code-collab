import {anything, deepEqual, instance, mock, verify} from 'ts-mockito';
import { Position } from '../../../../sync/data/position';
import { TextChange, TextChangeType } from '../../../../sync/data/textChange';
import {IBufferListener} from '../../../../sync/iBufferListener';
import { YBufferSync } from '../../../../sync/yjs/yBufferSync';
import * as Y from 'yjs';
import * as assert from 'assert';
import { RemoteFile } from '../../../../sync/yjs/remoteFile';
import * as vscode from 'vscode';

suite("YBufferSync", function () {

    let listenerClass = mock<IBufferListener>();

    let listener = instance(listenerClass);

    var doc = new Y.Doc();
    var remoteFile : RemoteFile;
    var buffer : Y.Text;
    var saves : Y.Array<string>;
    var bufferSync : YBufferSync;

    setup(() => {
        doc = new Y.Doc();
        remoteFile = new RemoteFile("123","file://none",new Y.Array(), new Y.Text(), true);
        doc.getMap("files").set("file",remoteFile);
        buffer = remoteFile.buffer;
        saves = remoteFile.saveRequests;
        bufferSync = new YBufferSync(doc, "123",remoteFile);
        bufferSync.setListener(listener);
    });

    test("Local save", async function() {
        await bufferSync.saveToRemote();
        assert.strictEqual(1, saves.length);
        verify(listenerClass.onSave()).never();
    });

    test("Remote save", async function() {
        saves.push(["234"]);
        verify(listenerClass.onSave()).once();
    });

    test("Send changes", async function() {
        await bufferSync.sendChangeToRemote(new TextChange(TextChangeType.INSERT,new Position(0,0),new Position(0,0),"abc"));
        await bufferSync.sendChangeToRemote(new TextChange(TextChangeType.UPDATE,new Position(0,1), new Position(0,2), "B"));
        await bufferSync.sendChangeToRemote(new TextChange(TextChangeType.DELETE,new Position(0,0), new Position(0,1), ""));

        assert.strictEqual("Bc", buffer.toString());
        verify(listenerClass.onTextChanges(anything())).never();
    });

    test("Receive Changes", async function() {
        buffer.insert(0,"abc");
        buffer.delete(1,1);
        let expectedInsert = new TextChange(TextChangeType.INSERT, new Position(0,0), new Position(0,0), "abc");
        let expectedDelete = new TextChange(TextChangeType.DELETE, new Position(0,1), new Position(0,2),"");
        verify(listenerClass.onTextChanges(deepEqual([expectedInsert]))).once();
        verify(listenerClass.onTextChanges(deepEqual([expectedDelete]))).once();
    });

    teardown(()=> {
        if(bufferSync) {
            bufferSync.close();
        }
    });
});