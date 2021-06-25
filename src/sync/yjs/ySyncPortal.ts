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
    private editorSyncsByPeerAndFile = new Map<string,Map<string, YEditorSync>>();
    private peerAndKeyByEditorSync = new Map<IEditorSync, PeerAndKey>();

    private cleanupHandlers : (() => void)[] = [];

    constructor(public doc : Y.Doc) {
        super(doc, uuid.v4());
        console.debug("Starting YSyncPortal "+this.localPeer);
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
    getType(): string {
        return "YJS";
    }
    
    private onPeerEvent(event : Y.YMapEvent<Y.Map<Y.Map<any>>>) {
        for(let changedKey of event.keysChanged) {
            let change = event.changes.keys.get(changedKey);
            if(change) {
                console.debug("Processing "+change.action+" for peer "+changedKey);
                if(change.action === "add") {
                    this.onPeerAdded(changedKey, this.peers.get(changedKey)!);
                } else if(change.action === "delete") {
                    this.onPeerDeleted(changedKey);
                }
            } else {
                console.warn("Unable to find change for changed key "+changedKey);
            }
        }
    }

    private onPeerAdded(peer : string, files : Y.Map<Y.Map<any>>) {
        console.debug("Adding peer "+peer);
        
        this.executeOnListener(async (listener) => {
            listener.onPeerJoined(peer);
        });

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
        console.debug("Deleting peer "+peer);

        this.executeOnListener(async (listener) => {
            listener.onPeerLeft(peer);
        });

        let peerFiles = this.editorSyncsByPeerAndFile.get(peer);
        if(peerFiles) {
            for(let fileName of peerFiles.keys()) {
                this.onFileDeleted(peer, fileName);
            }
        }
    }

    private async onFilesChanged(peer : string, event : Y.YMapEvent<Y.Map<any>>) {
        for(let changedKey of event.keysChanged) {
            let change = event.changes.keys.get(changedKey)!;
            console.debug("Handling "+change.action+" for file "+changedKey+"@"+peer);
            if(change.action === "delete" || change.action === "update") {
                await this.onFileDeleted(peer, changedKey);
            } 

            if(change.action === "add" || change.action === "update") {
                await this.onFileAdded(peer, changedKey, this.peers.get(peer)!.get(changedKey)!);
            } 
        }
    }

    private async onFileAdded(peer : string, key : string, file : Y.Map<any>) {
        let remoteFile = new RemoteFileProxy(file);
        console.debug("Adding remote file "+key+"@"+peer+"(active="+remoteFile.isActive+")");
        this.addObserverOnFile(peer, key, file);
        await this.executeOnListener(async (listener) => {
            await listener.onOpenRemoteFile(peer, remoteFile.uri, this.getEditorSync(peer, key, remoteFile));
        });
        if (remoteFile.isActive) {
            await this.activateRemoteFile(peer, key, remoteFile);
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

    private async onFileDeleted(peer : string, key : string) {
        console.debug("Deleting remote file "+key+"@"+peer);
        let sync = this.editorSyncsByPeerAndFile.get(peer)?.get(key);
        if(sync) {
            this.editorSyncsByPeerAndFile.get(peer)?.delete(key);
            this.peerAndKeyByEditorSync.delete(sync);
            sync!.dispose();
            await this.executeOnListener(async (listener) => {
                await listener.onCloseRemoteFile(sync!);
            });
        }
    }

    private async onRemoteDocumentChanged(peer : string, key : string, event : Y.YMapEvent<any>) {
        if(event.keysChanged.has("isActive")) {
            let targetFile = new RemoteFileProxy(event.target as Y.Map<any>);
            if(targetFile.isActive) {
                console.debug("Remote File "+key+"@"+peer+" has been activated");
                await this.activateRemoteFile(peer, key, targetFile);
            }
        }
    }

    private async activateRemoteFile(peer : string, key : string, targetFile: IRemoteFile) {
        await this.executeOnListener(async (listener) => {
            await listener.onActivateRemoveFile(this.getEditorSync(peer, key, targetFile));
        });
    }

    private getEditorSync(peer : string, key : string, file : IRemoteFile) : IEditorSync {
        this.addPeerCache(peer);
        if(!this.editorSyncsByPeerAndFile.get(peer)!.has(key)) {    
            this.createNewEditorSync(file, peer, key);
        }
        return this.editorSyncsByPeerAndFile.get(peer)!.get(key)!;
    }

    private forceNewEditorSync(peer : string, key : string, file : IRemoteFile) : IEditorSync {
        this.addPeerCache(peer);
        this.createNewEditorSync(file, peer, key);
        return this.editorSyncsByPeerAndFile.get(peer)!.get(key)!;
    }

    private addPeerCache(peer: string) {
        if (!this.editorSyncsByPeerAndFile.has(peer)) {
            this.editorSyncsByPeerAndFile.set(peer, new Map<string, YEditorSync>());
        }
    }

    private createNewEditorSync(file: IRemoteFile, peer: string, key: string) {
        let sync = new YEditorSync(this.doc, this.localPeer, file);
        this.editorSyncsByPeerAndFile.get(peer)!.set(key, sync);
        this.peerAndKeyByEditorSync.set(sync, { peer: peer, key: key });
    }

    async closeFileToRemote(editorSync: IEditorSync): Promise<void> {
        console.debug("Closing local file "+editorSync);
        this.transact(() => {
            let peerAndKey = this.peerAndKeyByEditorSync.get(editorSync);
            if(peerAndKey) {
                console.debug("Sending file closure to remote "+peerAndKey.key+"@"+peerAndKey.peer);
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
        console.debug("Syncing local file "+fileid+"@"+this.localPeer+" to remote");
        let remoteFile = new RemoteFile(this.localPeer,fileid,new Y.Array<RemoteSelection>(), new Y.Text(), false);
        this.transact(() => {
            this.peers.get(this.localPeer)!.set(fileid, remoteFile);
        });
        return Promise.resolve(this.forceNewEditorSync(this.localPeer, fileid, remoteFile));
    }

    activateFileToRemote(editorSync: IEditorSync): Promise<void> {
        console.debug("Activating file "+editorSync);
        let yEditorSync = editorSync as YEditorSync;
        if(yEditorSync.remoteFile.peer === this.localPeer) {
            this.transact(() => {
                let files = this.peers.get(this.localPeer)!;
                for(let file of files.keys()) {
                    new RemoteFileProxy(files.get(file)!).isActive = false;
                }
                console.debug("Activating file "+yEditorSync.remoteFile.uri+"@"+this.localPeer+" to remote");
                yEditorSync.remoteFile.isActive = true;
            });
        }
        return Promise.resolve();
    }

    close(): void {
        console.debug("Closing portal "+this.localPeer);
        for(let cleanup of this.cleanupHandlers) {
            cleanup();
        }
        this.peers.delete(this.localPeer);
    }

}