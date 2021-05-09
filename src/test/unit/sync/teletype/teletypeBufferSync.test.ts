import { BufferProxy } from '@atom/teletype-client';
import * as assert from 'assert';
import {deepEqual, instance, mock, verify} from 'ts-mockito'
import { Position } from '../../../../sync/data/position';
import { TextChange, TextChangeType } from '../../../../sync/data/textChange';
import {IBufferListener} from '../../../../sync/iBufferListener'
import { TeletypeBufferSync } from '../../../../sync/teletype/teletypeBufferSync';

suite("TeletypeBufferSync", function () {

    let proxyClass = mock(BufferProxy);
    let listenerClass = mock<IBufferListener>();

    let proxy = instance(proxyClass);
    let listener = instance(listenerClass);

    let bufferSync = new TeletypeBufferSync(proxy);
    bufferSync.setListener(listener);

    test("Test close", function() {
        bufferSync.close();
        verify(proxyClass.dispose()).once();
    });

    test("Remote save", async function() {
        await bufferSync.saveToRemote();
        verify(proxyClass.requestSave()).once();
    });

    test("Send changes", async function() {
        let start = new Position(0,0);
        let end =  new Position(1,1);
        let text = "abc";
        await bufferSync.sendChangeToRemote(new TextChange(TextChangeType.DELETE,start,end,text));
        verify(proxyClass.setTextInRange(start,end,text)).once();
    });

    test("Test dispose", function() {
        bufferSync.dispose();
        verify(listenerClass.dispose()).once();
    });

    test("Test set text", function() {
        let text = "abc";
        bufferSync.setText(text);
        verify(listenerClass.onSetText(text)).once();
    });

    test("Test text updates", function() {
        let insert = {oldStart: new Position(0,0), oldEnd: new Position(0,0), newText: "abc"};
        let update = {oldStart: new Position(0,0), oldEnd: new Position(0,1), newText: "abc"};
        let del = {oldStart: new Position(0,0), oldEnd: new Position(1,0), newText: ""};
        bufferSync.updateText([insert, update, del]);
        let expectedInsert = new TextChange(TextChangeType.INSERT, insert.oldStart, insert.oldEnd, insert.newText);
        let expectedUpdate = new TextChange(TextChangeType.UPDATE, update.oldStart, update.oldEnd, update.newText);
        let expectedDelete = new TextChange(TextChangeType.DELETE, del.oldStart, del.oldEnd, del.newText);
        verify(listenerClass.onTextChanges(deepEqual([expectedInsert,expectedUpdate,expectedDelete]))).once()
    });

});