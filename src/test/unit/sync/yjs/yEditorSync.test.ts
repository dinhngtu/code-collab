import {deepEqual, instance, mock, verify} from 'ts-mockito';
import { Position } from '../../../../sync/data/position';
import { Selection } from '../../../../sync/data/selection';
import * as Y from 'yjs';
import { IEditorListener } from '../../../../sync/iEditorListener';
import { YEditorSync } from '../../../../sync/yjs/yEditorSync';
import { RemoteFile } from '../../../../sync/yjs/remoteFile';
import { RemoteSelection } from '../../../../sync/yjs/remoteSelection';
import * as assert from 'assert';

suite("YEditorSync", function () {

    let listenerClass = mock<IEditorListener>();

    let listener = instance(listenerClass);

    var doc = new Y.Doc();
    var file = new RemoteFile("234", "test.txt",new Y.Array<RemoteSelection>(),new Y.Text(), false, new Y.Array<string>());
    doc.getArray<RemoteFile>("tmpFiles").push([file]);
    var editorSync = new YEditorSync(doc, "123", file);
    editorSync.setListener(listener);

    setup(() => {
        editorSync.close();
        doc = new Y.Doc();
        file = new RemoteFile("234", "test.txt",new Y.Array<RemoteSelection>(),new Y.Text(), false, new Y.Array<string>());
        doc.getArray<RemoteFile>("tmpFiles").push([file]);
        editorSync = new YEditorSync(doc, "123", file);
        editorSync.setListener(listener);
    });

    test("Test send selection to remote", async function() {
        let sendSelections = [new Selection("1",new Position(0,0), new Position(1,1), false, true),new Selection("2",new Position(1,1), new Position(1,2), true, false)];
        let expectedSelections = [{peer: "123",selection: sendSelections[0]},{peer: "123", selection: sendSelections[1]}];
        await editorSync.sendSelectionsToRemote(sendSelections);
        assert.deepStrictEqual(file.selections.toArray(), expectedSelections);
    });

    test("Test send selection to local", function() {
        let selection1 = new Selection("1",new Position(0,0), new Position(1,1), false, false);
        let selection2 = new Selection("1",new Position(0,0), new Position(0,0), false, true);
        file.selections.push([
            {peer: "234", selection: selection1},
            {peer: "345", selection: selection2}
        ]);
    
        file.selections.delete(1,1);

        verify(listenerClass.onSelectionsChangedForPeer("234",deepEqual([selection1]))).once();
        verify(listenerClass.onSelectionsChangedForPeer("345",deepEqual([selection2]))).once();
        verify(listenerClass.onSelectionsChangedForPeer("345",deepEqual([]))).once();
    });

});