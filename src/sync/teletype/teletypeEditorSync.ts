import { Selection } from "../data/selection";
import { IEditorListener } from "../iEditorListener";
import { IEditorSync } from "../iEditorSync";
import { EditorProxy, Portal } from '@atom/teletype-client';
import { SelectionMap, Selection as TeletypeSelection, Range } from './types/teletype_types';
import { IBufferSync } from "../iBufferSync";
import { TeletypeBufferSync } from "./teletypeBufferSync";
import { DelayedListenerExecution } from "./delayedListenerExecution";
import { TeletypeSyncPortal } from "./teletypeSyncPortal";

export class TeletypeEditorSync extends DelayedListenerExecution<IEditorListener> implements IEditorSync{

    private disposed : boolean = false;
    private bufferSync : IBufferSync;

    constructor(public portal : Portal, public editorProxy : EditorProxy, public parent : TeletypeSyncPortal) {
        super();
        this.editorProxy.setDelegate(this);
        this.bufferSync = new TeletypeBufferSync((this.editorProxy as any).bufferProxy);
    }

    close(): void {
        this.editorProxy.dispose();
        this.bufferSync.close();
    }

    getBufferSync(): IBufferSync {
        return this.bufferSync;
    }
    
    sendSelectionsToRemote(selections: Selection[]): Promise<void> {
        let selectionMap : SelectionMap =  {};
        for(let selection of selections) {
            selectionMap[parseInt(selection.id)] = {
                range: {
                    start: selection.start,
                    end: selection.end
                },
                reversed: selection.reversed
            };
        }
        this.editorProxy.updateSelections(selectionMap);
        return Promise.resolve();
    }


    isScrollNeededToViewPosition(position: any) {
        //TODO: implement
	}

    dispose() {
        if(!this.disposed) {
            this.disposed = true;
            this.parent.onRemoteFileClosed(this);
            this.executeOnListener(async (listener) => {
                listener.dispose();
            });
        }
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
                selections.push(new Selection(selectionId, selectionUpdate.range.start, selectionUpdate.range.end, selectionUpdate.reversed, this.isCursor(selectionUpdate)));
            }
        }
        this.executeOnListener(async (listener) => {
            listener.onSelectionsChangedForPeer(this.getSiteId(siteId), selections);
        });
	}

    clearSelectionsForSiteId(siteId: number) {
        this.executeOnListener(async (listener) => {
            listener.onSelectionsChangedForPeer(this.getSiteId(siteId), []);
        });
    }
    
    private isCursor(selectionUpdate: TeletypeSelection): boolean {
        return selectionUpdate.range.start.column === selectionUpdate.range.end.column && 
            selectionUpdate.range.start.row === selectionUpdate.range.end.row;
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

    private getSiteId(siteId : number) : string {
        if(siteId === 1) {
            return "host";
        } else {
            return this.portal.getSiteIdentity(siteId).login;
        }
    }

}