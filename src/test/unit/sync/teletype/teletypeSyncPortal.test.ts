import { BufferProxy, EditorProxy, Portal } from '@atom/teletype-client';
import {anyString, anything, deepEqual, instance, mock, strictEqual, verify, when} from 'ts-mockito';
import { IEditorSync } from '../../../../sync/iEditorSync';
import { IPortalListener } from '../../../../sync/iPortalListener';
import { TeletypeEditorSync } from '../../../../sync/teletype/teletypeEditorSync';
import { TeletypeSyncPortal } from '../../../../sync/teletype/teletypeSyncPortal';
import * as assert from 'assert';
import { sleep } from '../../../../base/functions';

suite("TeletypeSyncPortal", function () {

    let portalClass = mock(Portal);
    let bufferProxyClass = mock(BufferProxy);
    let listenerClass = mock<IPortalListener>();
    let editorProxyClass = mock(EditorProxy);

    let portal = instance(portalClass);
    let bufferProxy = instance(bufferProxyClass);
    let listener = instance(listenerClass);
    when(portalClass.getSiteIdentity(1234)).thenReturn({login: "1234"});
    when(listenerClass.onOpenRemoteFile(anyString(), anyString(), anything())).thenReturn(Promise.resolve());
    when(listenerClass.onActivateRemoveFile( anything())).thenReturn(Promise.resolve());

    let editorProxy = instance(editorProxyClass);
    (editorProxy as any).bufferProxy = bufferProxy;

    when(portalClass.createBufferProxy(anything())).thenReturn(bufferProxy);
    when(portalClass.createEditorProxy(anything())).thenReturn(editorProxy);

    let portalSync = new TeletypeSyncPortal(portal);
    portalSync.setListener(listener);

    suiteSetup(async function() {
        await portalSync.syncLocalFileToRemote("test.txt");
    });

    test("Test syncFileToLocal", function() {
        verify(portalClass.createBufferProxy(deepEqual({uri: "test.txt"}))).once();
        verify(portalClass.createEditorProxy(deepEqual({bufferProxy}))).once();
    });


    test("Test close", function() {
        portalSync.close();
        verify(portalClass.dispose()).once();
        verify(editorProxyClass.dispose()).once();
    });

    test("Test activateFileToRemote", async function() {
        let editorSync = new TeletypeEditorSync(portal, editorProxy, portalSync);
        await portalSync.activateFileToRemote(editorSync);
        verify(portalClass.activateEditorProxy(editorProxy)).once();
    });


    test("Test closeFileToRemote", async function() {
        let editorSyncClass = mock<IEditorSync>();
        let editorSync = instance(editorSyncClass);
        await portalSync.closeFileToRemote(editorSync);
        verify(editorSyncClass.close()).once();
    });

    test("Test dispose", function() {
        portalSync.dispose();
        verify(listenerClass.dispose()).once();
    });

    test("Test empty tether", function() {
        portalSync.updateTether(null,null,null);
        verify(listenerClass.onOpenRemoteFile(anyString(), anyString(), anything())).never();
    });

    
    test("Test tether with new and existing proxy", async function() {
        let newProxy = instance(editorProxyClass);
        (newProxy as any).bufferProxy = {
            uri: "abc"
        };
        (portal as any).id = "123";
        var editorSync : IEditorSync | null = null;
        when(listenerClass.onOpenRemoteFile(strictEqual("host"),strictEqual("/123/abc"), anything())).thenCall((peer: string, url: string, sync : IEditorSync) => {
            editorSync = sync;
        });
        portalSync.updateTether(null,newProxy,null);
        await sleep(20);
        assert.ok(editorSync);
        verify(listenerClass.onOpenRemoteFile("host","/123/abc", editorSync)).once();
        verify(listenerClass.onActivateRemoveFile(editorSync)).once();
        portalSync.updateTether(null,newProxy,null);
        await sleep(20);
        verify(listenerClass.onOpenRemoteFile("host","/123/abc", editorSync)).twice();
        verify(listenerClass.onActivateRemoveFile(editorSync)).twice();
    });

    test("Test join", () => {
        portalSync.siteDidJoin(1234);
        verify(listenerClass.onPeerJoined("1234")).once();
    });

    test("Test left", () => {
        portalSync.siteDidLeave(1234);
        verify(listenerClass.onPeerLeft("1234")).once();
    });
});