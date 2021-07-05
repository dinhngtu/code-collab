import { anything, instance, mock, verify, when } from "ts-mockito";
import { IBindingStorage } from "../../../binding/iBindingStorage";
import { IBufferBindingFactory } from "../../../binding/iBufferBindingFactory";
import { IDocumentListener } from "../../../binding/iDocumentListener";
import { IEditorManager } from "../../../binding/iEditorManager";
import { IEditorBindingFactory } from "../../../binding/iEdtorBindingFactory";
import { ShareLocalToRemote } from "../../../binding/shareLocalToRemote";
import { ISyncPortal } from "../../../sync/iSyncPortal";
import * as vscode from 'vscode';
import { IEditorSync } from "../../../sync/iEditorSync";
import { IBufferSync } from "../../../sync/iBufferSync";
import { MemoryBufferSync } from "../../../sync/memory/memoryBufferSync";
import { MemoryEditorSync } from "../../../sync/memory/memoryEditorSync";
import BufferBinding from "../../../BufferBinding";
import EditorBinding from "../../../EditorBinding";
import assert = require("assert");


suite("ShareLocalToRemote", function () {

    var documentListenerClass : IDocumentListener;
    var editorManagerClass : IEditorManager;
    var bindingStorageClass : IBindingStorage;
    var bufferBindingFactoryClass : IBufferBindingFactory;
    var editorBindingFactoryClass : IEditorBindingFactory;
    var syncPortalClass : ISyncPortal;
    var shareLocalToRemote : ShareLocalToRemote;

    setup(() => {
        documentListenerClass = mock<IDocumentListener>();
        editorManagerClass = mock<IEditorManager>();
        bindingStorageClass = mock<IBindingStorage>();
        bufferBindingFactoryClass = mock<IBufferBindingFactory>();
        editorBindingFactoryClass = mock<IEditorBindingFactory>();
        syncPortalClass = mock<ISyncPortal>();

        shareLocalToRemote = new ShareLocalToRemote(instance(documentListenerClass), instance(editorManagerClass), instance(bindingStorageClass),
            instance(bufferBindingFactoryClass), instance(editorBindingFactoryClass), instance(syncPortalClass));

    });
    
    test("Test open document", async function() {
        await testShareFile(editorManagerClass, syncPortalClass, bufferBindingFactoryClass, editorBindingFactoryClass, shareLocalToRemote, bindingStorageClass, documentListenerClass);
    });

    test("Test unshare document", async function() {
        let uri = await testShareFile(editorManagerClass, syncPortalClass, bufferBindingFactoryClass, editorBindingFactoryClass, shareLocalToRemote, bindingStorageClass, documentListenerClass);
        
        await shareLocalToRemote.unshareFile(uri);

        verify(syncPortalClass.closeFileToRemote(anything())).once();
        verify(bindingStorageClass.deleteBufferBinding(anything())).once();
        assert.strictEqual(shareLocalToRemote.isShared(uri),false);
    });
});

async function testShareFile(editorManagerClass: IEditorManager, syncPortalClass: ISyncPortal, bufferBindingFactoryClass: IBufferBindingFactory, editorBindingFactoryClass: IEditorBindingFactory, shareLocalToRemote: ShareLocalToRemote, bindingStorageClass: IBindingStorage, documentListenerClass: IDocumentListener) {
    let uri = vscode.Uri.parse("file://test.txt");
    let editor = {
        document: {
            uri: uri,
            getText: () => "test"
        }
    } as vscode.TextEditor;
    let editorSync = new MemoryEditorSync();
    let bufferBinding = {
        editor: editor, 
        bufferSync: editorSync.getBufferSync()
    } as BufferBinding;
    let editorBinding = {} as EditorBinding;

    when(editorManagerClass.isOpen(uri)).thenReturn(true);
    when(editorManagerClass.getOpenEditor(uri)).thenReturn(editor);
    when(syncPortalClass.syncLocalFileToRemote(uri.fsPath)).thenReturn(Promise.resolve(editorSync));
    when(bufferBindingFactoryClass.createBinding(editor.document, editorSync.getBufferSync(), uri.fsPath)).thenReturn(bufferBinding);
    when(editorBindingFactoryClass.createBinding(editor, editorSync)).thenReturn(editorBinding);

    await shareLocalToRemote.shareFile(uri);

    verify(syncPortalClass.syncLocalFileToRemote(uri.fsPath)).once();
    verify(bindingStorageClass.storeBufferBinding(bufferBinding)).once();
    verify(bindingStorageClass.storeEditorBinding(editorBinding)).once();
    verify(documentListenerClass.onDidChangeTextDocument(anything())).once();
    
    assert.ok(shareLocalToRemote.isShared(uri));

    return uri;
}
