import {anyString, anything, instance, mock, strictEqual, verify, when} from 'ts-mockito';
import * as Y from 'yjs';
import { RemoteFile } from '../../../../sync/yjs/remoteFile';
import { RemoteSelection } from '../../../../sync/yjs/remoteSelection';
import * as assert from 'assert';
import { IPortalListener } from '../../../../sync/iPortalListener';
import { YSyncPortal } from '../../../../sync/yjs/ySyncPortal';
import { sleep } from '../../../../base/functions';

suite("YSyncPortal", function () {

    var listenerClass = mock<IPortalListener>();

    var listener = instance(listenerClass);
    var doc = new Y.Doc();
    var syncPortal = new YSyncPortal(doc);
    syncPortal.setListener(listener);

    setup(() => {
        listenerClass = mock<IPortalListener>();
        listener = instance(listenerClass);
        when(listenerClass.onOpenRemoteFile(anyString(), anyString(), anything(), anything())).thenReturn(Promise.resolve());
        when(listenerClass.onActivateRemoveFile( anything())).thenReturn(Promise.resolve());
        syncPortal.close();
        doc = new Y.Doc();
        syncPortal = new YSyncPortal(doc);
        syncPortal.setListener(listener);
    });

    test("Test add and remove peer", () => {
        doc.getMap("peers").set("1234",new Y.Map<RemoteFile>());
        verify(listenerClass.onPeerJoined("1234")).once();
        doc.getMap("peers").delete("1234");
        verify(listenerClass.onPeerLeft("1234")).once();
    });
    
    test("Test that the local peer exists", function() {
        assert.ok(doc.getMap("peers").get(syncPortal.localPeer));
    });

    test("Test syncFileToLocal", async function() {
        doc.getMap("peers").set("234", new Y.Map<any>());
        doc.getMap("peers").get("234")!.set("test.txt",new RemoteFile("234", "test.txt",new Y.Array<RemoteSelection>(), new Y.Text(), true, new Y.Array<string>()));
        await sleep(20);
        verify(listenerClass.onOpenRemoteFile(strictEqual("234"),strictEqual("test.txt"), anything(),anything())).once();
        verify(listenerClass.onActivateRemoveFile(anything())).once();
    
    });

    test("Test activateFileToLocal", function() {
        let file = new RemoteFile("234", "test.txt",new Y.Array<RemoteSelection>(), new Y.Text(), false, new Y.Array<string>());
        doc.getMap("peers").set("234", new Y.Map<any>());
        doc.getMap("peers").get("234")!.set("test.txt",file);
        verify(listenerClass.onOpenRemoteFile(strictEqual("234"),strictEqual("test.txt"), anything(),anything())).once();
        verify(listenerClass.onActivateRemoveFile(anything())).never();
        file.isActive = true;
        verify(listenerClass.onActivateRemoveFile(anything())).once();
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
