import { IEditorSync } from "../iEditorSync";
import { IPortalListener } from "../iPortalListener";
import { ISyncPortal } from "../iSyncPortal";
import * as Y from 'yjs';
import { YEditorSync } from "./yEditorSync";
import { RemoteFile } from "./remoteFile";
import * as uuid from 'uuid';
import { RemoteSelection } from "./remoteSelection";
import { YTransactionBasedSync } from "./yTransactionBasedSync";

export class YSyncPortal extends YTransactionBasedSync<IPortalListener> implements ISyncPortal {

    private openedDocuments : Y.Array<RemoteFile>;
    private editorSyncsByFile = new Map<string, IEditorSync>();
    private openedDocumentsObserver = this.guard(this.onRemoteDocumentCreated.bind(this));
    private remoteDocumentObserver = this.guard(this.onRemoteDocumentChanged.bind(this));

    constructor(public doc : Y.Doc) {
        super(doc, uuid.v4());
        this.openedDocuments = doc.getArray("openedDocuments");
        this.openedDocuments.observe(this.openedDocumentsObserver);
    }

    private onRemoteDocumentCreated(event : Y.YArrayEvent<RemoteFile>) {
        for(let element of event.changes.added) {
            for(let file of element.content.getContent()) {
                let remoteFile = file as RemoteFile;
                remoteFile.observe(this.remoteDocumentObserver);
                if(remoteFile.isActive){
                    this.activateRemoteFile(remoteFile);
                } 
            }
        }
    }

    private async onRemoteDocumentChanged(event : Y.YMapEvent<any>, transaction : Y.Transaction) {
        if(event.keysChanged.has("isActive")) {
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
            this.editorSyncsByFile.set(key, new YEditorSync(this.doc,this.localPeer, file));
        }
        return this.editorSyncsByFile.get(key)!;
    }

    syncLocalFileToRemote(fileid: string): Promise<IEditorSync> {
        let remoteFile = new RemoteFile(this.localPeer,fileid,new Y.Array<RemoteSelection>(), new Y.Text(), false);
        this.transact(() => {
            this.openedDocuments.push([remoteFile]);
        });
        return Promise.resolve(new YEditorSync(this.doc, this.localPeer, remoteFile));
    }

    activateFileToRemote(editorSync: IEditorSync): Promise<void> {
        let yEditorSync = editorSync as YEditorSync;
        if(yEditorSync.remoteFile.peer === this.localPeer) {
            this.transact(() => {
                for(let file of this.openedDocuments) {
                    if(file.peer === this.localPeer) {
                        file.isActive = false;
                    }
                }
                yEditorSync.remoteFile.isActive = true;
            });
        }
        return Promise.resolve();
    }

    close(): void {
        this.openedDocuments.unobserve(this.openedDocumentsObserver);
        for(let remoteFile of this.openedDocuments) {
            remoteFile.unobserve(this.remoteDocumentObserver);
        }
    }

}