import { anything, instance, mock, verify, when } from "ts-mockito";
import { MockableApis } from "../../../base/mockableApis";
import { EditorManager } from "../../../binding/editorManager";
import { IBindingStorage } from "../../../binding/iBindingStorage";
import { IWorkspaceEventListener } from "../../../binding/iWorkspaceEventListener";
import { MemoryWindow } from "../memoryWindow";
import { MemoryWorkspace } from "../memoryWorkspace";
import * as vscode from 'vscode';
import assert = require("assert");
import EditorBinding from "../../../EditorBinding";

suite("EditorManager", function () {
    
    var bindingStorageClass = mock<IBindingStorage>();
    var bindingStorage = instance(bindingStorageClass);
    var workspaceListenerClass = mock<IWorkspaceEventListener>();
    var workspaceListener = instance(workspaceListenerClass);
    var editorManager : EditorManager;
    var memoryWindow : MemoryWindow;
    var memoryWorkspace : MemoryWorkspace;
    var commandsClass : any;

    setup(() => {
        memoryWindow = new MemoryWindow();
        MockableApis.window = memoryWindow;
        memoryWorkspace = new MemoryWorkspace();
        MockableApis.workspace = memoryWorkspace;
        editorManager = new EditorManager(bindingStorage);
        editorManager.addListener(workspaceListener);
        commandsClass = mock() as any;
        MockableApis.commands = instance(commandsClass);
        editorManager.initialize();
    });

    test("Test open document", async function() {
        let uri = vscode.Uri.parse("file://test");
        let document = await editorManager.openDocument(uri);
        assert.ok(document);
        assert.strictEqual(memoryWorkspace.openedTextDocuments.get(uri), document);
    });

    test("Test open local file", async function() {
        let uri = vscode.Uri.parse("file://test");
        let editor = {
            document : {
                uri: uri
            }
        } as vscode.TextEditor;
        memoryWindow.activeTextEditorChangeListener!(editor);
        verify(workspaceListenerClass.onLocalFileOpened(editor)).once();
        assert.ok(editorManager.isOpen(uri));
        assert.strictEqual(editorManager.getOpenEditor(uri),editor);
    });

    test("Test activate editor", async function() {
        let uri = vscode.Uri.parse("file://test");
        let document = {
            uri : uri
        } as vscode.TextDocument;
        let editor = await editorManager.activateEditor(document);
        assert.ok(editor);
        assert.deepStrictEqual(editor, memoryWindow.createdTextEditors.get(document));
        assert.notStrictEqual(editor, memoryWindow.createdTextEditors.get(document));
        verify(commandsClass.executeCommand('workbench.action.keepEditor')).once();
    });

    test("Test activate existing but not visible editor", async function() {
        let uri = vscode.Uri.parse("file://test");
        let editor = {
            document : {
                uri: uri
            }
        } as vscode.TextEditor;
        memoryWindow.activeTextEditorChangeListener!(editor);
        let newEditor = await editorManager.activateEditor(editor.document);
        assert.strictEqual(editor, newEditor);
        assert.ok(memoryWindow.createdTextEditors.get(editor.document));
        assert.notStrictEqual(newEditor, memoryWindow.createdTextEditors.get(editor.document));
        verify(commandsClass.executeCommand('workbench.action.keepEditor')).once();
    });

    test("Test activate existing and visible editor", async function() {
        let uri = vscode.Uri.parse("file://test");
        let editor = {
            document : {
                uri: uri
            }
        } as vscode.TextEditor;
        memoryWindow.activeTextEditorChangeListener!(editor);
        memoryWindow.visibleTextEditors.push(editor);
        let newEditor = await editorManager.activateEditor(editor.document);
        assert.strictEqual(editor, newEditor);
        assert.strictEqual(0, memoryWindow.createdTextEditors.size);
        verify(commandsClass.executeCommand('workbench.action.keepEditor')).once();
    });

    test("Test close visible editor", async function() {
        let uri = vscode.Uri.parse("file://test");
        let editor = {
            document : {
                uri: uri
            }
        } as vscode.TextEditor;
        when(bindingStorageClass.getEditors()).thenReturn([editor]);
        let binding = {} as EditorBinding;
        when(bindingStorageClass.findEditorBindingBySync(anything())).thenReturn(binding);

        memoryWindow.changeVisibleTextEditorListener!([]);

        verify(bindingStorageClass.deleteEditorBinding(binding)).once();
    });
});
