import { BufferProxy, EditorProxy, Portal } from '@atom/teletype-client';
import {deepEqual, instance, mock, verify, when} from 'ts-mockito';
import { Position } from '../../../../sync/data/position';
import { Selection } from '../../../../sync/data/selection';
import { IEditorListener } from '../../../../sync/iEditorListener';
import { TeletypeEditorSync } from '../../../../sync/teletype/teletypeEditorSync';
import { TeletypeSyncPortal } from '../../../../sync/teletype/teletypeSyncPortal';
import { SelectionMap } from '../../../../sync/teletype/types/teletype_types';

suite("TeletypeEditorSync", function () {

    let bufferProxyClass = mock(BufferProxy);
    let listenerClass = mock<IEditorListener>();
    let editorProxyClass = mock(EditorProxy);
    let portalClass = mock(Portal);
    let portalSyncClass = mock(TeletypeSyncPortal);

    let bufferProxy = instance(bufferProxyClass);
    let listener = instance(listenerClass);
    let editorProxy = instance(editorProxyClass);
    let portal = instance(portalClass);
    let portalSync = instance(portalSyncClass);

    when(portalClass.getSiteIdentity(123)).thenReturn({login: "123"});

    (editorProxy as any).bufferProxy = bufferProxy;

    let editorSync = new TeletypeEditorSync(portal, editorProxy, portalSync);
    editorSync.setListener(listener);

    test("Test close", function() {
        editorSync.close();
        verify(editorProxyClass.dispose()).once();
        verify(bufferProxyClass.dispose()).once();
    });

    test("Test send selection to remote", async function() {
        let selections = [new Selection("1",new Position(0,0), new Position(1,1), false, true),new Selection("2",new Position(1,1), new Position(1,2), true, false)];
        let expectedSelections = {1: {range: {start: new Position(0,0), end: new Position(1,1)}, reversed: false},2: {range: {start: new Position(1,1), end: new Position(1,2)}, reversed: true}};
        await editorSync.sendSelectionsToRemote(selections);
        verify(editorProxyClass.updateSelections(deepEqual(expectedSelections))).once();
    });

    test("Test dispose", function() {
        editorSync.dispose();
        verify(listenerClass.dispose()).once();
    });

    test("Test send selection to local", function() {
        let selections : SelectionMap = {
            1: {range: {start: new Position(1,1), end: new Position(1,1)}, reversed: false},
            2: {range: {start: new Position(1,1), end: new Position(1,2)}, reversed: true},
            3: {range: {start: new Position(2,2), end: new Position(3,2)}, reversed: false, tailed: true}
        };
        (selections as any)[0]=undefined;

        let expectedSelections = [
            new Selection("1",new Position(1,1), new Position(1,1), false, true),
            new Selection("2",new Position(1,1), new Position(1,2), true, false),
            new Selection("3",new Position(3,2), new Position(3,2), false, true),
            new Selection("3",new Position(2,2), new Position(3,2), false, false)
        ];
        editorSync.updateSelectionsForSiteId(123,selections);
        verify(listenerClass.onSelectionsChangedForPeer("123",deepEqual(expectedSelections))).once();
    });

    test("Test clear selection to local", function() {
        editorSync.clearSelectionsForSiteId(123);
        verify(listenerClass.onSelectionsChangedForPeer("123",deepEqual([]))).once();
    });


});