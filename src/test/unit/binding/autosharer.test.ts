import { anyString, anything, instance, mock, strictEqual, verify, when } from "ts-mockito";
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
import { IFileAgeQuery } from "../../../view/sharing/iFileAgeQuery";
import { IFileSystem } from "../../../base/iFileSystem";

suite("Autosharer", function () {

    let syncPortalClass : ISyncPortal;
    let editorManagerClass :IEditorManager;
    let bufferBindingFactoryClass : IBufferBindingFactory;
    let editorBindingFactoryClass : IEditorBindingFactory;
    let bindingStorageClass : IBindingStorage;
    let fileAgeQueryClass : IFileAgeQuery;
    let filesystemClass : IFileSystem;

    let syncPortal : ISyncPortal;
    let editorManager : IEditorManager;
    let bufferBindingFactory : IBufferBindingFactory;
    let editorBindingFactory : IEditorBindingFactory;
    let bindingStorage : IBindingStorage;
    let timedExecutor : ManualTimedExecutor;
    let workspace : MemoryWorkspace;
    let fileAgeQuery : IFileAgeQuery;
    let filesystem : IFileSystem;

    let autoshare : Autosharer;

    setup(() => {
        syncPortalClass = mock<ISyncPortal>();
        editorManagerClass = mock<IEditorManager>();
        bufferBindingFactoryClass = mock<IBufferBindingFactory>();
        editorBindingFactoryClass = mock<IEditorBindingFactory>();
        bindingStorageClass = mock<IBindingStorage>();
        fileAgeQueryClass = mock<IFileAgeQuery>();
        filesystemClass = mock<IFileSystem>();
        syncPortal = instance(syncPortalClass);
        editorManager = instance(editorManagerClass);
        bufferBindingFactory = instance(bufferBindingFactoryClass);
        editorBindingFactory = instance(editorBindingFactoryClass);
        bindingStorage = instance(bindingStorageClass);
        fileAgeQuery = instance(fileAgeQueryClass);
        filesystem = instance(filesystemClass);
        timedExecutor = new ManualTimedExecutor();
        workspace = new MemoryWorkspace();
        MockableApis.workspace = workspace;
        MockableApis.executor = timedExecutor;
        MockableApis.filesystem = filesystem;
        when(syncPortalClass.supportsLocalshare()).thenReturn(true);
        autoshare = new Autosharer(syncPortal, editorManager, bufferBindingFactory, editorBindingFactory, bindingStorage, fileAgeQuery);
    });

    test("Share new and existing file", async function() {
        autoshare.enable();
        let { editor, bufferBinding, editorBinding, editorSync } = prepareEditorStorage(editorManagerClass, workspace, syncPortalClass, bufferBindingFactoryClass, editorBindingFactoryClass);

        await autoshare.onLocalFileOpened(editor);
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text", false)).once();
        verify(bindingStorageClass.deleteBufferBinding(anything())).never();
        verify(bindingStorageClass.deleteEditorBinding(anything())).never();
        verify(bindingStorageClass.storeBufferBinding(anything())).once();
        verify(bindingStorageClass.storeEditorBinding(anything())).once();

        await autoshare.onLocalFileOpened(editor);
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text", false)).once();
        verify(bindingStorageClass.deleteBufferBinding(anything())).never();
        verify(bindingStorageClass.deleteEditorBinding(anything())).never();
        verify(bindingStorageClass.storeBufferBinding(anything())).once();
        verify(bindingStorageClass.storeEditorBinding(anything())).twice();

        when(bindingStorageClass.findEditorBindingBySync(editorSync)).thenReturn(editorBinding);
        await autoshare.onLocalFileOpened(editor);
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text", false)).once();
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
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text", false)).once();
        verify(bindingStorageClass.deleteBufferBinding(anything())).never();
        verify(bindingStorageClass.deleteEditorBinding(anything())).never();
        verify(bindingStorageClass.storeBufferBinding(anything())).once();
        verify(bindingStorageClass.storeEditorBinding(anything())).once();
    });

    test("Autoshare not changed file, don't override", async function() {
        autoshare.enable();
        let { editor, bufferBinding, editorBinding, editorSync } = prepareEditorStorage(editorManagerClass, workspace, syncPortalClass, bufferBindingFactoryClass, editorBindingFactoryClass);
        when(syncPortalClass.supportsFileAge()).thenReturn(true);
        when(syncPortalClass.getFileAge(anyString(),anyString())).thenReturn(1);
        when(filesystemClass.getLastModifyDate(anyString())).thenReturn(1);
        when(fileAgeQueryClass.askOverride(anyString())).thenResolve(true);

        await autoshare.onLocalFileOpened(editor);
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text", false)).once();
    });

    test("Autoshare changed file, override", async function() {
        autoshare.enable();
        let { editor, bufferBinding, editorBinding, editorSync } = prepareEditorStorage(editorManagerClass, workspace, syncPortalClass, bufferBindingFactoryClass, editorBindingFactoryClass);
        when(syncPortalClass.supportsFileAge()).thenReturn(true);
        when(syncPortalClass.getFileAge(anyString(),anyString())).thenReturn(1);
        when(filesystemClass.getLastModifyDate(anyString())).thenReturn(1002);
        when(fileAgeQueryClass.askOverride(anyString())).thenResolve(true);

        await autoshare.onLocalFileOpened(editor);
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text", true)).once();
    });

    test("Autoshare changed file, don't override", async function() {
        autoshare.enable();
        let { editor, bufferBinding, editorBinding, editorSync } = prepareEditorStorage(editorManagerClass, workspace, syncPortalClass, bufferBindingFactoryClass, editorBindingFactoryClass);
        when(syncPortalClass.supportsFileAge()).thenReturn(true);
        when(syncPortalClass.getFileAge(anyString(),anyString())).thenReturn(1);
        when(filesystemClass.getLastModifyDate(anyString())).thenReturn(1002);
        when(fileAgeQueryClass.askOverride(anyString())).thenResolve(false);

        await autoshare.onLocalFileOpened(editor);
        verify(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text", false)).once();
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
    when(syncPortalClass.shareLocal("/workspace", "/workspace/file.txt", "Text", anything())).thenResolve(editorSync);
    when(bufferBindingFactoryClass.createBinding(strictEqual(editor.document), strictEqual(bufferSync), strictEqual(editor.document.uri.fsPath))).thenReturn(bufferBinding);
    when(editorBindingFactoryClass.createBinding(strictEqual(editor), strictEqual(editorSync))).thenReturn(editorBinding);
    return { editor, bufferBinding, editorBinding, editorSync };
}
