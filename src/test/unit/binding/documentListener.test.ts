import { anything, instance, mock, verify, when } from "ts-mockito";
import { TextDocument, TextDocumentChangeEvent } from "vscode";
import { MockableApis } from "../../../base/mockableApis";
import { BindingStorage } from "../../../binding/bindingStorage";
import { DocumentListener } from "../../../binding/documentListener";
import { IBindingStorage } from "../../../binding/iBindingStorage";
import BufferBinding from "../../../BufferBinding";
import { MemoryWorkspace } from "../memoryWorkspace";
import * as vscode from 'vscode'

suite("DocumentListener", function () {
    
    var bindingStorageClass = mock<IBindingStorage>();
    var memoryWorkspace : MemoryWorkspace;
    var documentListener : DocumentListener;
    var bindingStorage : IBindingStorage;

    setup(() => {
        bindingStorage = instance(bindingStorageClass);
        documentListener = new DocumentListener(bindingStorage);
        memoryWorkspace = new MemoryWorkspace();
        MockableApis.workspace = memoryWorkspace;
        documentListener.initialize();
    });

    test("Forward document changed events", async function() {
        let bufferBindingClass = mock(BufferBinding);
        let bufferBinding = instance(bufferBindingClass);
        let event = {
            document: {} as TextDocument,
            contentChanges: [
                {} as vscode.TextDocumentContentChangeEvent
            ]
        };
        when(bindingStorageClass.findBufferBindingByBuffer(event.document)).thenReturn(bufferBinding);
        memoryWorkspace.changeTextDocumentListener!(event);
        verify(bufferBindingClass.onDidChangeBuffer(event.contentChanges)).once();
    });

    test("Forward save document calls", async function() {
        let bufferBindingClass = mock(BufferBinding);
        let bufferBinding = instance(bufferBindingClass);
        let eventClass = mock<vscode.TextDocumentWillSaveEvent>();
        let event = instance(eventClass);
        (event as any).document = {};
        when(bindingStorageClass.findBufferBindingByBuffer(event.document)).thenReturn(bufferBinding);
        memoryWorkspace.willSaveTextDocumentListener!(event);
        verify(bufferBindingClass.requestSavePromise()).once();
        verify(eventClass.waitUntil(anything())).once()
    });
});