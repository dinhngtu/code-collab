import { IEditorSync } from "../iEditorSync";
import { IPortalListener } from "../iPortalListener";
import { ISyncPortal } from "../iSyncPortal";
import * as Y from 'yjs';
import { YEditorSync } from "./yEditorSync";
import { IRemoteFile, RemoteFile, RemoteFileProxy } from "./remoteFile";
import * as uuid from 'uuid';
import { RemoteSelection } from "./remoteSelection";
import { YTransactionBasedSync } from "./yTransactionBasedSync";

type PeerAndKey = {
    peer : string, 
    key : string
};

export class YSyncPortal extends YTransactionBasedSync<IPortalListener> implements ISyncPortal {

    

    private peers : Y.Map<Y.Map<Y.Map<any>>>;
    private editorSyncsByPeerAndFile = new Map<string,Map<string, IEditorSync>>();
    private peerAndKeyByEditorSync = new Map<IEditorSync, PeerAndKey>();

    private cleanupHandlers : (() => void)[] = [];

    constructor(public doc : Y.Doc) {
        super(doc, uuid.v4());
        this.peers = doc.getMap("peers");
        this.peers.set(this.localPeer, new Y.Map<Y.Map<any>>());
        for(let peer of this.peers.keys()) {
            this.onPeerAdded(peer, this.peers.get(peer)!);
        }
        let observer = this.guard(this.onPeerEvent.bind(this));
        this.peers.observe(observer);
        this.cleanupHandlers.push(() => {
            this.peers.unobserve(observer);
        });
    }
    
    private onPeerEvent(event : Y.YMapEvent<Y.Map<Y.Map<any>>>) {
        for(let changedKey of event.keysChanged) {
            let change = event.changes.keys.get(changedKey)!;
            if(change.action === "add") {
                this.onPeerAdded(changedKey, this.peers.get(changedKey)!);
            } else if(change.action === "delete") {
                this.onPeerDeleted(changedKey);
            }
        }
    }

    private onPeerAdded(peer : string, files : Y.Map<Y.Map<any>>) {
        for(let fileName of files.keys()) {
            this.onFileAdded(peer, fileName, files.get(fileName)!);
        }
        this.addObserverForFileList(peer, files);
    }

    private addObserverForFileList(peer: string, files: Y.Map<Y.Map<any>>) {
        let observer = this.guard((event: Y.YMapEvent<Y.Map<any>>) => {
            this.onFilesChanged(peer, event);
        });
        files.observe(observer);
        this.cleanupHandlers.push(() => {
            files.unobserve(observer);
        });
    }

    private onPeerDeleted(peer : string) {
        let peerFiles = this.editorSyncsByPeerAndFile.get(peer);
        if(peerFiles) {
            for(let fileName of peerFiles.keys()) {
                this.onFileDeleted(peer, fileName);
            }
        }
    }

    private onFilesChanged(peer : string, event : Y.YMapEvent<Y.Map<any>>) {
        for(let changedKey of event.keysChanged) {
            let change = event.changes.keys.get(changedKey)!;
            if(change.action === "add") {
                this.onFileAdded(peer, changedKey, this.peers.get(peer)!.get(changedKey)!);
            } else if(change.action === "delete") {
                this.onFileDeleted(peer, changedKey);
            }
        }
    }

    private onFileAdded(peer : string, key : string, file : Y.Map<any>) {
        let remoteFile = new RemoteFileProxy(file);
        this.addObserverOnFile(peer, key, file);
        if (remoteFile.isActive) {
            this.activateRemoteFile(peer, key, remoteFile);
        }
    }

    private addObserverOnFile(peer : string, key : string, file: Y.Map<any>) {
        let observer = this.guard((event : Y.YMapEvent<any>) => {
            this.onRemoteDocumentChanged(peer, key, event);
        });
        file.observe(observer);
        this.cleanupHandlers.push(() => {
            file.unobserve(observer);
        });
    }

    private onFileDeleted(peer : string, key : string) {
        let sync = this.editorSyncsByPeerAndFile.get(peer)?.get(key);
        if(sync) {
            this.editorSyncsByPeerAndFile.get(peer)?.delete(key);
            this.peerAndKeyByEditorSync.delete(sync);
            this.executeOnListener((listener) => {
                listener.onCloseRemoteFile(sync!);
            });
        }
    }

    private async onRemoteDocumentChanged(peer : string, key : string, event : Y.YMapEvent<any>) {
        if(event.keysChanged.has("isActive")) {
            let targetFile = new RemoteFileProxy(event.target as Y.Map<any>);
            if(targetFile.isActive) {
                this.activateRemoteFile(peer, key, targetFile);
            }
        }
    }

    private activateRemoteFile(peer : string, key : string, targetFile: IRemoteFile) {
        this.executeOnListener(async (listener) => {
            await listener.onOpenRemoteFile(targetFile.uri, this.getEditorSync(peer, key, targetFile));
        });
    }

    private getEditorSync(peer : string, key : string, file : IRemoteFile) : IEditorSync {
        if(!this.editorSyncsByPeerAndFile.has(peer)) {
            this.editorSyncsByPeerAndFile.set(peer, new Map<string, IEditorSync>());
        }
        if(!this.editorSyncsByPeerAndFile.get(peer)!.has(key)) {    
            let sync = new YEditorSync(this.doc,this.localPeer, file);
            this.editorSyncsByPeerAndFile.get(peer)!.set(key, sync);
            this.peerAndKeyByEditorSync.set(sync, {peer : peer, key : key});
        }
        return this.editorSyncsByPeerAndFile.get(peer)!.get(key)!;
    }

    async closeFileToRemote(editorSync: IEditorSync): Promise<void> {
        this.transact(() => {
            let peerAndKey = this.peerAndKeyByEditorSync.get(editorSync);
            if(peerAndKey) {
                this.peerAndKeyByEditorSync.delete(editorSync);
                this.editorSyncsByPeerAndFile.get(peerAndKey.peer)?.delete(peerAndKey.key);
                let files = this.peers.get(peerAndKey.peer);
                if(files) {
                    files.delete(peerAndKey.key);
                }
            }
        });
    }

    syncLocalFileToRemote(fileid: string): Promise<IEditorSync> {
        let remoteFile = new RemoteFile(this.localPeer,fileid,new Y.Array<RemoteSelection>(), new Y.Text(), false);
        this.transact(() => {
            this.peers.get(this.localPeer)!.set(fileid, remoteFile);
        });
        return Promise.resolve(this.getEditorSync(this.localPeer, fileid, remoteFile));
    }

    activateFileToRemote(editorSync: IEditorSync): Promise<void> {
        let yEditorSync = editorSync as YEditorSync;
        if(yEditorSync.remoteFile.peer === this.localPeer) {
            this.transact(() => {
                let files = this.peers.get(this.localPeer)!;
                for(let file of files.keys()) {
                    new RemoteFileProxy(files.get(file)!).isActive = false;
                }
                yEditorSync.remoteFile.isActive = true;
            });
        }
        return Promise.resolve();
    }

    close(): void {
        for(let cleanup of this.cleanupHandlers) {
            cleanup();
        }
        this.peers.delete(this.localPeer);
    }

}