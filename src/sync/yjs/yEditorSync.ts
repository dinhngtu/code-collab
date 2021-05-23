import { Selection } from "../data/selection";
import { IBufferSync } from "../iBufferSync";
import { IEditorListener } from "../iEditorListener";
import { IEditorSync } from "../iEditorSync";
import { RemoteFile } from "./remoteFile";
import * as Y from 'yjs';
import { RemoteSelection } from "./remoteSelection";
import { YBufferSync } from "./yBufferSync";
import { YTransactionBasedSync } from "./yTransactionBasedSync";

export class YEditorSync extends YTransactionBasedSync<IEditorListener> implements IEditorSync {

    private bufferSync : IBufferSync;

    constructor(doc : Y.Doc, localpeer : string, public remoteFile : RemoteFile) {
        super(doc, localpeer);
        this.remoteFile.selections.observe(this.guard(this.onSelectionChanged.bind(this)));
        this.bufferSync = new YBufferSync(this.doc, this.localPeer, remoteFile.buffer, remoteFile.saveRequests);
    }

    private onSelectionChanged(event : Y.YArrayEvent<RemoteSelection>) {
        let changedPeers = this.getChangedPeers(event);

        this.syncChangedPeers(changedPeers, event);
    }

    private syncChangedPeers(changedPeers: Set<string>, event: Y.YArrayEvent<RemoteSelection>) {
        for (let changedPeer of changedPeers) {
            let selections: RemoteSelection[] = this.getSelectionsForPeer(event.target as Y.Array<RemoteSelection>, changedPeer);
            this.executeOnListener((listener) => {
                listener.onSelectionsChangedForPeer(changedPeer, selections);
            });
        }
    }

    private getChangedPeers(event: Y.YArrayEvent<RemoteSelection>) {
        let changedPeers = new Set<string>();
        for (let addition of event.changes.added) {
            this.extractPeerFromChange(addition, changedPeers);
        }

        for (let deletion of event.changes.deleted) {
            this.extractPeerFromChange(deletion, changedPeers);
        }
        return changedPeers;
    }

    private getSelectionsForPeer(source: Y.Array<RemoteSelection>, changedPeer: string) {
        let selections: RemoteSelection[] = [];
        for (let selection of source) {
            if (selection.peer === changedPeer) {
                selections.push(selection);
            }
        }
        return selections;
    }

    private extractPeerFromChange(addition: Y.Item, changedPeers: Set<string>) {
        for (let selection of addition.content.getContent()) {
            let remoteSelection = selection as RemoteSelection;
            changedPeers.add(remoteSelection.peer);
        }
    }

    sendSelectionsToRemote(selections: Selection[]): Promise<void> {
        return new Promise((resolve, reject) => {
            try {   
                this.transact(()=>{
                    for(let i = this.remoteFile.selections.length-1;i>=0;i--) {
                        if(this.remoteFile.selections.get(i).peer === this.localPeer) {
                            this.remoteFile.selections.delete(i);
                        }
                    }
                    for(let selection of selections) {
                        this.remoteFile.selections.push([RemoteSelection.fromSource(this.localPeer, selection)]);
                    }
                    resolve();
                });
            } catch(error) {
                reject(error);
            }
        });
        
    }

    getBufferSync(): IBufferSync {
        return this.bufferSync;
    }

    close(): void {
        //Nothing for now
    }

}