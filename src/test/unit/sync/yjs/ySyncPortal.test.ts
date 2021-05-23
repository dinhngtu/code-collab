import {anything, instance, mock, strictEqual, verify} from 'ts-mockito';
import * as Y from 'yjs';
import { RemoteFile } from '../../../../sync/yjs/remoteFile';
import { RemoteSelection } from '../../../../sync/yjs/remoteSelection';
import * as assert from 'assert';
import { IPortalListener } from '../../../../sync/iPortalListener';
import { YSyncPortal } from '../../../../sync/yjs/ySyncPortal';

suite("YSyncPortal", function () {

    var listenerClass = mock<IPortalListener>();

    var listener = instance(listenerClass);

    var doc = new Y.Doc();
    var syncPortal = new YSyncPortal(doc);
    syncPortal.setListener(listener);

    setup(() => {
        listenerClass = mock<IPortalListener>();
        listener = instance(listenerClass);
        syncPortal.close();
        doc = new Y.Doc();
        syncPortal = new YSyncPortal(doc);
        syncPortal.setListener(listener);
    });

    test("Test syncFileToLocal", function() {
        doc.getArray<RemoteFile>("openedDocuments").push([new RemoteFile("234", "test.txt",new Y.Array<RemoteSelection>(), new Y.Text(), true, new Y.Array<string>())]);
        verify(listenerClass.onOpenRemoteFile(strictEqual("test.txt"), anything())).once();
    });

    test("Test activateFileToLocal", function() {
        let file = new RemoteFile("234", "test.txt",new Y.Array<RemoteSelection>(), new Y.Text(), false, new Y.Array<string>());
        doc.getArray<RemoteFile>("openedDocuments").push([file]);
        verify(listenerClass.onOpenRemoteFile(strictEqual("test.txt"), anything())).never();
        file.isActive = true;
        verify(listenerClass.onOpenRemoteFile(strictEqual("test.txt"), anything())).once();
    });


    test("Test open and activate local File To Remote", async function() {
        let sync = await syncPortal.syncLocalFileToRemote("test.txt");
        assert.strictEqual(doc.getArray<RemoteFile>("openedDocuments").length, 1);
        let file = doc.getArray<RemoteFile>("openedDocuments").get(0);
        assert.strictEqual(file.isActive, false);
        await syncPortal.activateFileToRemote(sync);
        assert.strictEqual(file.isActive, true);
    });
});