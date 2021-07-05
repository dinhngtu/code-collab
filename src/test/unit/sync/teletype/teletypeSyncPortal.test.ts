import { BufferProxy, EditorProxy, Portal } from '@atom/teletype-client';
import {anyString, anything, deepEqual, instance, mock, strictEqual, verify, when} from 'ts-mockito';
import { IEditorSync } from '../../../../sync/iEditorSync';
import { IPortalListener } from '../../../../sync/iPortalListener';
import { TeletypeEditorSync } from '../../../../sync/teletype/teletypeEditorSync';
import { TeletypeSyncPortal } from '../../../../sync/teletype/teletypeSyncPortal';
import * as assert from 'assert';
import { sleep } from '../../../../base/functions';
import * as vscode from 'vscode';

suite("TeletypeSyncPortal", function () {

    var portalClass : Portal;
    var bufferProxyClass : BufferProxy;
    var listenerClass : IPortalListener;
    var editorProxyClass : EditorProxy;
    var portal : Portal;
    var bufferProxy : BufferProxy;
    var listener : IPortalListener;
    var editorProxy : EditorProxy;

    

    var portalSync : TeletypeSyncPortal;

    setup(async function() {
        portalClass = mock(Portal);
        bufferProxyClass = mock(BufferProxy);
        listenerClass = mock<IPortalListener>();
        editorProxyClass = mock(EditorProxy);
        portal = instance(portalClass);
        bufferProxy = instance(bufferProxyClass);
        listener = instance(listenerClass);
        when(portalClass.getSiteIdentity(1234)).thenReturn({login: "1234"});
        when(listenerClass.onOpenRemoteFile(anyString(), anyString(), anything(), anything())).thenReturn(Promise.resolve());
        when(listenerClass.onActivateRemoveFile( anything())).thenReturn(Promise.resolve());

        editorProxy = instance(editorProxyClass);
        (editorProxy as any).bufferProxy = bufferProxy;

        when(portalClass.createBufferProxy(anything())).thenReturn(bufferProxy);
        when(portalClass.createEditorProxy(anything())).thenReturn(editorProxy);
        portalSync = new TeletypeSyncPortal(portal);
        portalSync.setListener(listener);
    });

    test("Test syncFileToLocal", async function() {
        await portalSync.syncLocalFileToRemote("test.txt");
        verify(portalClass.createBufferProxy(deepEqual({uri: "test.txt"}))).once();
        verify(portalClass.createEditorProxy(deepEqual({bufferProxy}))).once();
    });


    test("Test close", async function() {
        await portalSync.syncLocalFileToRemote("test.txt");
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
        verify(listenerClass.onOpenRemoteFile(anyString(), anyString(), anything(), anything())).never();
    });

    
    test("Test tether with new and existing proxy", async function() {
        let newProxy = instance(editorProxyClass);
        (newProxy as any).bufferProxy =  bufferProxyClass;
        (newProxy as any).bufferProxy.uri= "abc";
        (portal as any).id = "123";
        var editorSync : IEditorSync | null = null;
        when(listenerClass.onOpenRemoteFile(strictEqual("host"),strictEqual("/123/abc"), anything(), anything())).thenCall((peer: string, url: string,uri: vscode.Uri, sync : IEditorSync) => {
            editorSync = sync;
        });
        await portalSync.updateTether(null,newProxy,null);
        await sleep(20);
        assert.ok(editorSync);
        verify(listenerClass.onOpenRemoteFile("host","/123/abc",anything(), editorSync)).once();
        verify(listenerClass.onActivateRemoveFile(editorSync)).once();
        portalSync.updateTether(null,newProxy,null);
        await sleep(20);
        verify(listenerClass.onOpenRemoteFile("host","/123/abc",anything(), editorSync)).once();
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