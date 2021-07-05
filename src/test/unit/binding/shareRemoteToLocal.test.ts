import { anything, instance, mock, verify, when } from "ts-mockito";
import { IBindingStorage } from "../../../binding/iBindingStorage";
import { IBufferBindingFactory } from "../../../binding/iBufferBindingFactory";
import { IEditorManager } from "../../../binding/iEditorManager";
import { IEditorBindingFactory } from "../../../binding/iEdtorBindingFactory";
import { ShareRemoteToLocal } from "../../../binding/shareRemoteToLocal";
import { MemoryEditorSync } from "../../../sync/memory/memoryEditorSync";
import * as vscode from 'vscode';
import BufferBinding from "../../../BufferBinding";
import { IRemoteFileManagementListener } from "../../../binding/iRemoteFileManagementListener";
import assert = require("assert");
import EditorBinding from "../../../EditorBinding";

suite("ShareRemoteToLocal", function () {

    var bindingStorageClass : IBindingStorage;
    var editorManagerClass : IEditorManager;
    var bufferBindingFactoryClass : IBufferBindingFactory;
    var editorBindingFactoryClass : IEditorBindingFactory;
    var shareRemoteToLocal : ShareRemoteToLocal;
    var listenerClass : IRemoteFileManagementListener;

    setup(() => {
        bindingStorageClass = mock<IBindingStorage>();
        editorManagerClass = mock<IEditorManager>();
        bufferBindingFactoryClass = mock<IBufferBindingFactory>();
        editorBindingFactoryClass = mock<IEditorBindingFactory>();
        listenerClass = mock<IRemoteFileManagementListener>();
        shareRemoteToLocal = new ShareRemoteToLocal(instance(bindingStorageClass), instance(editorManagerClass), instance(bufferBindingFactoryClass), instance(editorBindingFactoryClass));
        shareRemoteToLocal.setListener(instance(listenerClass));
    });

    test("Test open document", async function() {
        await testOpenDocument(bufferBindingFactoryClass, editorManagerClass, shareRemoteToLocal, bindingStorageClass, listenerClass);
    });

    test("Test activate document", async function() {
        await testActivateDocument(bufferBindingFactoryClass, editorManagerClass, shareRemoteToLocal, bindingStorageClass, listenerClass, editorBindingFactoryClass);
    });

    test("Test close document", async function() {
        let editorSync = await testActivateDocument(bufferBindingFactoryClass, editorManagerClass, shareRemoteToLocal, bindingStorageClass, listenerClass, editorBindingFactoryClass);;
        let editorBinding = {} as EditorBinding;
        when(bindingStorageClass.findEditorBindingBySync(editorSync)).thenReturn(editorBinding);

        await shareRemoteToLocal.onCloseRemoteFile(editorSync);

        verify(bindingStorageClass.deleteBufferBinding(anything())).once();
        verify(bindingStorageClass.deleteEditorBinding(anything())).once();
        verify(listenerClass.onFileAddedOrRemoved()).twice();
    });
});

async function testActivateDocument(bufferBindingFactoryClass: IBufferBindingFactory, editorManagerClass: IEditorManager, shareRemoteToLocal: ShareRemoteToLocal, bindingStorageClass: IBindingStorage, listenerClass: IRemoteFileManagementListener, editorBindingFactoryClass: IEditorBindingFactory) {
    let {editorSync,bufferBinding} = await testOpenDocument(bufferBindingFactoryClass, editorManagerClass, shareRemoteToLocal, bindingStorageClass, listenerClass);
    when(bindingStorageClass.findBufferBindingBySync(editorSync.getBufferSync())).thenReturn(bufferBinding);
    let editor = {
        document: bufferBinding.buffer
    } as vscode.TextEditor;
    when(editorManagerClass.activateEditor(bufferBinding.buffer)).thenReturn(Promise.resolve(editor));
    let editorBinding = {} as EditorBinding;
    when(editorBindingFactoryClass.createBinding(editor, editorSync)).thenReturn(editorBinding);

    await shareRemoteToLocal.activateRemoteFile(editorSync);

    verify(editorManagerClass.activateEditor(bufferBinding.buffer)).once();
    verify(bindingStorageClass.storeEditorBinding(editorBinding));

    return editorSync;
}

async function testOpenDocument(bufferBindingFactoryClass: IBufferBindingFactory, editorManagerClass: IEditorManager, shareRemoteToLocal: ShareRemoteToLocal, bindingStorageClass: IBindingStorage, listenerClass: IRemoteFileManagementListener) {
    let editorSync = new MemoryEditorSync();
    let buffer = {
            uri: vscode.Uri.parse("collab://test")
    } as vscode.TextDocument;
    let uri = vscode.Uri.parse("collab://test");
    let url = "test";
    let bufferBinding = {
        buffer: buffer
    } as BufferBinding;
    when(bufferBindingFactoryClass.createBinding(buffer, editorSync.getBufferSync(), url)).thenReturn(bufferBinding);
    when(editorManagerClass.openDocument(uri)).thenReturn(Promise.resolve(buffer));

    await shareRemoteToLocal.onOpenRemoteFile("peer", "test", uri, editorSync);

    verify(bindingStorageClass.storeBufferBinding(bufferBinding)).once();
    verify(listenerClass.onFileAddedOrRemoved()).once();
    assert.strictEqual(shareRemoteToLocal.getFiles("peer").length, 1);
    

    return {editorSync, bufferBinding};
}
