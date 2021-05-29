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
    
    test("Test that the local peer exists", function() {
        assert.ok(doc.getMap("peers").get(syncPortal.localPeer));
    });

    test("Test syncFileToLocal", function() {
        doc.getMap("peers").get(syncPortal.localPeer)!.set("test.txt",new RemoteFile("234", "test.txt",new Y.Array<RemoteSelection>(), new Y.Text(), true, new Y.Array<string>()));
        verify(listenerClass.onOpenRemoteFile(strictEqual("test.txt"), anything())).once();
    });

    test("Test activateFileToLocal", function() {
        let file = new RemoteFile("234", "test.txt",new Y.Array<RemoteSelection>(), new Y.Text(), false, new Y.Array<string>());
        doc.getMap("peers").get(syncPortal.localPeer)!.set("test.txt",file);
        verify(listenerClass.onOpenRemoteFile(strictEqual("test.txt"), anything())).never();
        file.isActive = true;
        verify(listenerClass.onOpenRemoteFile(strictEqual("test.txt"), anything())).once();
    });


    test("Test open and activate local File To Remote", async function() {
        await testOpenActivateLocalFile(syncPortal, doc);
    });

    test("Test close local File To Remote", async function() {
        let sync = await testOpenActivateLocalFile(syncPortal, doc);
        await syncPortal.closeFileToRemote(sync);
        assert.strictEqual(doc.getMap("peers").get(syncPortal.localPeer)!.size, 0);
    });

    test("test close", async () => {
        await syncPortal.close();
        assert.strictEqual(doc.getMap("peers").size,0);
    });
});

async function testOpenActivateLocalFile(syncPortal: YSyncPortal, doc: Y.Doc) {
    let sync = await syncPortal.syncLocalFileToRemote("test.txt");
    let files = doc.getMap("peers").get(syncPortal.localPeer)!;
    assert.strictEqual(files.size, 1);
    for(let filename of files.keys()) {
        let file = files.get(filename);
        assert.strictEqual(file.isActive, false);
        await syncPortal.activateFileToRemote(sync);
        assert.strictEqual(file.isActive, true);
    }
    return sync;
}
