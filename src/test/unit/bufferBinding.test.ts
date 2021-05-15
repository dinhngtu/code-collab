import * as assert from 'assert';
import { deepEqual, instance, mock, verify } from 'ts-mockito';
import BufferBinding from '../../BufferBinding';
import { IBufferSync } from '../../sync/iBufferSync';
import * as vscode from 'vscode';
import { MockableApis } from '../../base/mockableApis';
import { ManualCyclicExecutor } from './manualCyclicExecutor';
import { Volume } from "memfs";
import { Position } from '../../sync/data/position';
import { TextChange, TextChangeType } from '../../sync/data/textChange';
import { MemoryEditor } from './memoryEditor';


suite("BufferBinding", function () {

    
    let executor = new ManualCyclicExecutor();
    let vol = Volume.fromJSON({
        "file.txt" : ""
    },"/tmp");

    let bufferSyncClass = mock<IBufferSync>();
    let bufferClass = mock<vscode.TextDocument>();
    let bufferSync = instance(bufferSyncClass);
    let buffer = instance(bufferClass);

    var bufferBinding = new BufferBinding(buffer, bufferSync);
    suiteSetup(() => {
        MockableApis.executor = executor;
        MockableApis.fs = vol;
        MockableApis.window = {
            visibleTextEditors : []
        };
    });


    test("test set text", async function() {
        bufferBinding = new BufferBinding(buffer, bufferSync);
        let memoryEditor = createEditor(bufferBinding, true);
        await bufferBinding.onSetText("abc");
        await executor.cycle(100);
        assert.deepStrictEqual(memoryEditor.lines,["abc"]);
    });

    test("test handle remote updates in inactive editor", async function() {
        bufferBinding = new BufferBinding(buffer, bufferSync);
        let insert = new TextChange(TextChangeType.INSERT, new Position(0,0), new Position(0,0), "Hallo Welt!");
        let update = new TextChange(TextChangeType.UPDATE, new Position(0,1), new Position(0,2), "e");
        let del = new TextChange(TextChangeType.DELETE, new Position(0,10), new Position(0,10), "");
        let memoryEditor = await performChanges(bufferBinding, [del, update, insert], executor);
        assert.deepStrictEqual(memoryEditor.lines,[]);
    });

    test("test handle remote updates", async function() {
        bufferBinding = new BufferBinding(buffer, bufferSync);
        let insert = new TextChange(TextChangeType.INSERT, new Position(0,0), new Position(0,0), "Hallo Welt!");
        let update = new TextChange(TextChangeType.UPDATE, new Position(0,1), new Position(0,2), "e");
        let del = new TextChange(TextChangeType.DELETE, new Position(0,10), new Position(0,10), "");
        let memoryEditor = await performChanges(bufferBinding, [del, update, insert], executor, true);
        assert.deepStrictEqual(memoryEditor.lines,["Hello Welt"]);
    });

    test("test remote save", async function() {
        await bufferBinding.onSave();
        verify(bufferClass.save()).once();
    }); 

    test("test handle local updates", async function() {
        bufferBinding = new BufferBinding(buffer, bufferSync);
        let insert = new TextChange(TextChangeType.INSERT, new Position(0,0), new Position(0,0), "Hallo Welt!");
        await performChanges(bufferBinding, [insert], executor, true);
        let insertChange = { range: new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,0)), text: "Hallo Welt!", rangeOffset:0, rangeLength:0 };
        let updateChange = { range: new vscode.Range(new vscode.Position(0,1), new vscode.Position(0,2)), text: "e", rangeOffset:0, rangeLength:0 };
        
        bufferBinding.onDidChangeBuffer([insertChange, updateChange]);

        verify(bufferSyncClass.sendChangeToRemote(deepEqual(new TextChange(TextChangeType.UPDATE, new Position(0,1), new Position(0,2), "e")))).once();
    });

    test("test local save", async function() {
        await bufferBinding.requestSavePromise();
        verify(bufferSyncClass.saveToRemote()).once();
    });
});

async function performChanges(bufferBinding: BufferBinding, changes: TextChange[], executor: ManualCyclicExecutor, activate : boolean = false) {
    let memoryEditor = createEditor(bufferBinding, activate);
    await bufferBinding.onTextChanges(changes);
    await executor.cycle(100);
    return memoryEditor;
}
function createEditor(bufferBinding: BufferBinding, activate: boolean) {
    let memoryEditor = new MemoryEditor();
    bufferBinding.editor = memoryEditor;
    MockableApis.window.visibleTextEditors = [];
    if (activate) {
        MockableApis.window.visibleTextEditors.push(memoryEditor);
    }
    return memoryEditor;
}

