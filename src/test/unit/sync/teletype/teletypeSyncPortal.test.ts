import { BufferProxy, EditorProxy, Portal } from '@atom/teletype-client';
import {anyString, anything, deepEqual, instance, mock, strictEqual, verify, when} from 'ts-mockito';
import { IEditorSync } from '../../../../sync/iEditorSync';
import { IPortalListener } from '../../../../sync/iPortalListener';
import { TeletypeEditorSync } from '../../../../sync/teletype/teletypeEditorSync';
import { TeletypeSyncPortal } from '../../../../sync/teletype/teletypeSyncPortal';
import * as assert from 'assert';

suite("TeletypeSyncPortal", function () {

    let portalClass = mock(Portal);
    let bufferProxyClass = mock(BufferProxy);
    let listenerClass = mock<IPortalListener>();
    let editorProxyClass = mock(EditorProxy);

    let portal = instance(portalClass);
    let bufferProxy = instance(bufferProxyClass);
    let listener = instance(listenerClass);
    let editorProxy = instance(editorProxyClass);
    (editorProxy as any).bufferProxy = bufferProxy;

    when(portalClass.createBufferProxy()).thenReturn(bufferProxy);
    when(portalClass.createEditorProxy(anything())).thenReturn(editorProxy);

    let portalSync = new TeletypeSyncPortal(portal);
    portalSync.setListener(listener);

    suiteSetup(async function() {
        await portalSync.syncLocalFileToRemote("doesnt matter");
    });

    test("Test syncFileToLocal", function() {
        verify(portalClass.createBufferProxy()).once();
        verify(portalClass.createEditorProxy(deepEqual({bufferProxy}))).once();
    });

    test("Test close", function() {
        portalSync.close();
        verify(portalClass.dispose()).once();
        verify(editorProxyClass.dispose()).once();
    });

    test("Test activateFileToRemote", async function() {
        let editorSync = new TeletypeEditorSync(editorProxy);
        await portalSync.activateFileToRemote(editorSync);
        verify(portalClass.activateEditorProxy(editorProxy)).once();
    });

    test("Test dispose", function() {
        portalSync.dispose();
        verify(listenerClass.dispose()).once();
    });

    test("Test empty tether", function() {
        portalSync.updateTether(null,null,null);
        verify(listenerClass.onOpenRemoteFile(anyString(), anything())).never();
    });

    
    test("Test tether with new and existing proxy", function() {
        let newProxy = instance(editorProxyClass);
        (newProxy as any).bufferProxy = {
            uri: "abc"
        };
        (portal as any).id = "123";
        var editorSync : IEditorSync | null = null;
        when(listenerClass.onOpenRemoteFile("/123/abc", anything())).thenCall((url: string, sync : IEditorSync) => {
            editorSync = sync;
        });
        portalSync.updateTether(null,newProxy,null);
        assert.ok(editorSync);
        verify(listenerClass.onOpenRemoteFile("/123/abc", editorSync)).once();
        portalSync.updateTether(null,newProxy,null);
        verify(listenerClass.onOpenRemoteFile("/123/abc", editorSync)).twice();
    });
});