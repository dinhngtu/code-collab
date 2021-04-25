import { Selection } from "../data/selection";
import { IEditorListener } from "../iEditorListener";
import { IEditorSync } from "../iEditorSync";
import { EditorProxy, Portal } from '@atom/teletype-client';
import { SelectionMap, Selection as TeletypeSelection, Range } from '../../teletype_types';
import { IBufferSync } from "../iBufferSync";
import { IBufferListener } from "../iBufferListener";
import { TeletypeBufferSync } from "./teletypeBufferSync";

export class TeletypeEditorSync implements IEditorSync{

    private listener : IEditorListener | null = null;
    private bufferSync : IBufferSync;

    constructor(public editorProxy : EditorProxy) {
        this.editorProxy.setDelegate(this);
        this.bufferSync = new TeletypeBufferSync((this.editorProxy as any).bufferProxy);
    }

    getBufferSync(): IBufferSync {
        return this.bufferSync;
    }
    
    sendSelectionsToRemote(selections: Selection[]): Promise<void> {
        let selectionMap : SelectionMap =  {};
        var index = 0;
        for(let selection of selections) {
            selectionMap[index] = {
                range: {
                    start: selection.start,
                    end: selection.end
                },
                reversed: selection.reversed
            };
            index++;
        }
        this.editorProxy.updateSelections(selectionMap);
        return Promise.resolve();
    }

    setListener(listener: IEditorListener): void {
        this.listener = listener;
    }

    isScrollNeededToViewPosition(position: any) {
        //TODO: implement
	}

    dispose() {
		this.listener?.dispose();
	}

    updateSelectionsForSiteId(siteId: number, selectionUpdates: SelectionMap) {
        let selections : Selection[] = [];
        for(let selectionId in selectionUpdates) {
            const selectionUpdate = selectionUpdates[selectionId];
            if (selectionUpdate) {
                if(selectionUpdate.tailed) {
                    let cursorRange = this.getCursorRangeFromSelection(selectionUpdate);
                    selections.push(new Selection(selectionId, cursorRange.start, cursorRange.end, false, true));
                }
                selections.push(new Selection(selectionId, selectionUpdate.range.start, selectionUpdate.range.end, selectionUpdate.reversed, this.isCursor(selectionUpdate)))
            }
        }
        this.listener?.onSelectionsChangedForPeer(""+siteId, selections);
	}

    clearSelectionsForSiteId(siteId: number) {
        this.listener?.onSelectionsChangedForPeer(""+siteId, []);
    }
    
    private isCursor(selectionUpdate: TeletypeSelection): boolean {
        return selectionUpdate.range.start.column == selectionUpdate.range.end.column && 
            selectionUpdate.range.start.row == selectionUpdate.range.end.row;
    }

    private getCursorRangeFromSelection(selection: TeletypeSelection): Range {
		const { range: { end, start } } = selection;
		if (selection.reversed) {
			return {
				start: start,
				end: start
			};
		} else {
			return {
				start: end,
				end: end
			};
		}
	}

}