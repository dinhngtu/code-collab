import { IEditorSync } from "../iEditorSync";
import { IPortalListener } from "../iPortalListener";
import { ISyncPortal } from "../iSyncPortal";
import { DelayedListenerExecution } from "../teletype/delayedListenerExecution";
import * as Y from 'yjs';
import { Selection } from "../data/selection";
import { YEditorSync } from "./yEditorSync";
import { RemoteFile } from "./remoteFile";
import * as uuid from 'uuid';
import { RemoteSelection } from "./remoteSelection";

export class YSyncPortal extends DelayedListenerExecution<IPortalListener> implements ISyncPortal {

    private openedDocuments : Y.Array<RemoteFile>;
    private peer = uuid.v4();
    private editorSyncsByFile = new Map<string, IEditorSync>();

    constructor(public doc : Y.Doc) {
        super();
        this.openedDocuments = doc.getArray("openedDocuments");
        this.openedDocuments.observe(this.onRemoteDocumentCreated.bind(this));
    }

    private onRemoteDocumentCreated(event : Y.YArrayEvent<RemoteFile>) {
        for(let element of event.changes.added) {
            for(let file of element.content.getContent()) {
                let remoteFile = file as RemoteFile;
                remoteFile.observe(this.onRemoteDocumentChanged.bind(this));
                if(remoteFile.isActive){
                    this.activateRemoteFile(remoteFile);
                } 
            }
        }
    }

    private async onRemoteDocumentChanged(event : Y.YMapEvent<any>, transaction : Y.Transaction) {
        if(event.keysChanged.has("active")) {
            let targetFile = event.target as RemoteFile;
            if(targetFile.isActive) {
                this.activateRemoteFile(targetFile);
            }
        }
    }

    private activateRemoteFile(targetFile: RemoteFile) {
        this.executeOnListener(async (listener) => {
            await listener.onOpenRemoteFile(targetFile.uri, this.getEditorSync(targetFile));
        });
    }

    private getEditorSync(file : RemoteFile) : IEditorSync {
        let key = file.peer+":"+file.uri;
        if(!this.editorSyncsByFile.has(key)) {
            this.editorSyncsByFile.set(key, new YEditorSync(this.doc,this.peer, file));
        }
        return this.editorSyncsByFile.get(key)!;
    }

    syncLocalFileToRemote(fileid: string): Promise<IEditorSync> {
        let remoteFile = new RemoteFile(this.peer,fileid,new Y.Array<RemoteSelection>(), new Y.Text(), false);
        this.openedDocuments.push([remoteFile]);
        return Promise.resolve(new YEditorSync(this.doc, this.peer, remoteFile));
    }

    activateFileToRemote(editorSync: IEditorSync): Promise<void> {
        let yEditorSync = editorSync as YEditorSync;
        if(yEditorSync.remoteFile.peer === this.peer) {
            for(let file of this.openedDocuments) {
                if(file.peer === this.peer) {
                    file.isActive = false;
                }
            }
            yEditorSync.remoteFile.isActive = true;
        }
        return Promise.resolve();
    }

    close(): void {
        //don't do anything for now
    }

}