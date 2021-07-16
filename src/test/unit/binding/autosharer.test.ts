import { anything, instance, mock, strictEqual, verify, when } from "ts-mockito";
import { MockableApis } from "../../../base/mockableApis";
import { Autosharer } from "../../../binding/autosharer";
import { BufferBindingFactory } from "../../../binding/bufferBindingFactory";
import { IBindingStorage } from "../../../binding/iBindingStorage";
import { IBufferBindingFactory } from "../../../binding/iBufferBindingFactory";
import { IEditorManager } from "../../../binding/iEditorManager";
import { IEditorBindingFactory } from "../../../binding/iEdtorBindingFactory";
import { ISyncPortal } from "../../../sync/iSyncPortal";
import { ManualTimedExecutor } from "../manualTimedExecutor";
import { MemoryEditor } from "../memoryEditor";
import { MemoryWorkspace } from "../memoryWorkspace";
import * as vscode from 'vscode';
import BufferBinding from "../../../BufferBinding";
import EditorBinding from "../../../EditorBinding";
import { IBufferSync } from "../../../sync/iBufferSync";
import { IEditorSync } from "../../../sync/iEditorSync";

suite("Autosharer", function () {

    let syncPortalClass : ISyncPortal;
    let editorManagerClass :IEditorManager;
    let bufferBindingFactoryClass : IBufferBindingFactory;
    let editorBindingFactoryClass : IEditorBindingFactory;
    let bindingStorageClass : IBindingStorage;

    let syncPortal : ISyncPortal;
    let editorManager : IEditorManager;
    let bufferBindingFactory : IBufferBindingFactory;
    let editorBindingFactory : IEditorBindingFactory;
    let bindingStorage : IBindingStorage;
    let timedExecutor : ManualTimedExecutor;
    let workspace : MemoryWorkspace;

    let autoshare : Autosharer;

    setup(() => {
        syncPortalClass = mock<ISyncPortal>();
        editorManagerClass = mock<IEditorManager>();
        bufferBindingFactoryClass = mock<IBufferBindingFactory>();
        editorBindingFactoryClass = mock<IEditorBindingFactory>();
        bindingStorageClass = mock<IBindingStorage>();
        syncPortal = instance(syncPortalClass);
        editorManager = instance(editorManagerClass);
        bufferBindingFactory = instance(bufferBindingFactoryClass);
        editorBindingFactory = instance(editorBindingFactoryClass);
        bindingStorage = instance(bindingStorageClass);
        timedExecutor = new ManualTimedExecutor();
        workspace = new MemoryWorkspace();
        MockableApis.workspace = workspace;
        MockableApis.executor = timedExecutor;
        when(syncPortalClass.supportsLocalshare()).thenReturn(true);
        autoshare = new Autosharer(syncPortal, editorManager, bufferBindingFactory, editorBindingFactory, bindingStorage);
    });

    test("Share new and existing file", async function() {
        autoshare.enable();
        let { editor, bufferBinding, editorBinding, editorSync } = prepareEditorStorage(editorManagerClass, workspace, syncPortalClass, bufferBindingFactoryClass, editorBindingFactoryClass);

        await autoshare.onLocalFileOpened(editor);
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text")).once();
        verify(bindingStorageClass.deleteBufferBinding(anything())).never();
        verify(bindingStorageClass.deleteEditorBinding(anything())).never();
        verify(bindingStorageClass.storeBufferBinding(anything())).once();
        verify(bindingStorageClass.storeEditorBinding(anything())).once();

        await autoshare.onLocalFileOpened(editor);
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text")).once();
        verify(bindingStorageClass.deleteBufferBinding(anything())).never();
        verify(bindingStorageClass.deleteEditorBinding(anything())).never();
        verify(bindingStorageClass.storeBufferBinding(anything())).once();
        verify(bindingStorageClass.storeEditorBinding(anything())).twice();

        when(bindingStorageClass.findEditorBindingBySync(editorSync)).thenReturn(editorBinding);
        await autoshare.onLocalFileOpened(editor);
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text")).once();
        verify(bindingStorageClass.deleteBufferBinding(anything())).never();
        verify(bindingStorageClass.deleteEditorBinding(anything())).once();
        verify(bindingStorageClass.storeBufferBinding(anything())).once();
        verify(bindingStorageClass.storeEditorBinding(anything())).thrice();

    });

    test("Autoshare open editors when enabling", async function() {
        
        let { editor, bufferBinding, editorBinding, editorSync } = prepareEditorStorage(editorManagerClass, workspace, syncPortalClass, bufferBindingFactoryClass, editorBindingFactoryClass);
        when(editorManagerClass.getOpenEditors()).thenReturn([editor]);
        autoshare.enable();
        await timedExecutor.cycle(500);
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text")).once();
        verify(bindingStorageClass.deleteBufferBinding(anything())).never();
        verify(bindingStorageClass.deleteEditorBinding(anything())).never();
        verify(bindingStorageClass.storeBufferBinding(anything())).once();
        verify(bindingStorageClass.storeEditorBinding(anything())).once();
    });
});

function prepareEditorStorage(editorManagerClass: IEditorManager, workspace: MemoryWorkspace, syncPortalClass: ISyncPortal, bufferBindingFactoryClass: IBufferBindingFactory, editorBindingFactoryClass: IEditorBindingFactory) {
    let editor = new MemoryEditor();
    editor.document = {
        uri: vscode.Uri.parse("file:///workspace/file.txt"),
        getText: () => "Text"
    } as vscode.TextDocument;
    when(editorManagerClass.getOpenEditor(editor.document.uri)).thenReturn(editor);
    workspace.workspaceFolders = [{ uri: vscode.Uri.parse("file:///workspace") } as vscode.WorkspaceFolder];
    let bufferSync = {};
    let editorSync = {
        getBufferSync: () => bufferSync
    } as IEditorSync;
    let bufferBinding = {} as BufferBinding;
    let editorBinding = {} as EditorBinding;
    when(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text")).thenResolve(editorSync);
    when(bufferBindingFactoryClass.createBinding(strictEqual(editor.document), strictEqual(bufferSync), strictEqual(editor.document.uri.fsPath))).thenReturn(bufferBinding);
    when(editorBindingFactoryClass.createBinding(strictEqual(editor), strictEqual(editorSync))).thenReturn(editorBinding);
    return { editor, bufferBinding, editorBinding, editorSync };
}
