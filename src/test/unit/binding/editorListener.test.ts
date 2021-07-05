import { anything, instance, mock, verify, when } from "ts-mockito";
import { TextDocument, TextDocumentChangeEvent } from "vscode";
import { MockableApis } from "../../../base/mockableApis";
import { BindingStorage } from "../../../binding/bindingStorage";
import { DocumentListener } from "../../../binding/documentListener";
import { IBindingStorage } from "../../../binding/iBindingStorage";
import BufferBinding from "../../../BufferBinding";
import { MemoryWorkspace } from "../memoryWorkspace";
import * as vscode from 'vscode'
import { EditorListener } from "../../../binding/editorListener";
import { MemoryWindow } from "../memoryWindow";
import EditorBinding from "../../../EditorBinding";

suite("EditorListener", function () {
    
    var bindingStorageClass = mock<IBindingStorage>();
    var memoryWindow : MemoryWindow;
    var editorListener : EditorListener;
    var bindingStorage : IBindingStorage;

    setup(() => {
        bindingStorage = instance(bindingStorageClass);
        editorListener = new EditorListener(bindingStorage);
        memoryWindow = new MemoryWindow();
        MockableApis.window = memoryWindow;
        editorListener.initialize();
    });

    test("Forward selection changed events", async function() {
        let editorBindingClass = mock(EditorBinding);
        let editorBinding = instance(editorBindingClass);
        let event = {
            textEditor : {} as vscode.TextEditor,
            selections : [
                {} as vscode.Selection
            ]
        };
        when(bindingStorageClass.findEditorBindingByEditor(event.textEditor)).thenReturn(editorBinding);
        memoryWindow.textEditorSelectionChangeListener!(event);
        verify(editorBindingClass.updateSelections(event.selections)).once();
    });

});