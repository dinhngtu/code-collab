import { IEditorSync } from "../iEditorSync";
import { IPortalListener } from "../iPortalListener";
import { ISyncPortal } from "../iSyncPortal";
import * as Y from 'yjs';
import { YEditorSync } from "./yEditorSync";
import { IRemoteFile, RemoteFile, RemoteFileProxy } from "./remoteFile";
import * as uuid from 'uuid';
import { RemoteSelection } from "./remoteSelection";
import { YTransactionBasedSync } from "./yTransactionBasedSync";
import * as vscode from 'vscode';
import { TimedExecutor } from "../../base/timedExecutor";


const noneUri = vscode.Uri.parse("none://");
const timeout = 30*1000;

type PeerAndKey = {
    peer : string, 
    key : string
};

export class YSyncPortal extends YTransactionBasedSync<IPortalListener> implements ISyncPortal {

    private peers : Y.Map<Y.Map<Y.Map<any>>>;
    private workspaces : Y.Map<Y.Map<Y.Map<any>>>;
    private editorSyncsByPeerAndFile = new Map<string,Map<string, YEditorSync>>();
    private peerAndKeyByEditorSync = new Map<IEditorSync, PeerAndKey>();
    private me = new Y.Map<Y.Map<any>>();
    private timedOutPeers = new Set<string>();
    private observers = new Map<Y.AbstractType<any>, any>();

    constructor(public doc : Y.Doc, public displayName : string) {
        super(doc, displayName+"("+uuid.v4()+")");
        console.debug("Starting YSyncPortal "+this.localPeer);
        this.peers = doc.getMap("peers");
        this.workspaces = doc.getMap("workspaces");
        this.peers.set(this.localPeer, this.me);
        for(let peer of this.peers.keys()) {
            this.onPeerAdded(peer, this.peers.get(peer)!);
        }
        let observer = this.guard(this.onPeerEvent.bind(this));
        this.peers.observe(observer);
        this.observers.set(this.peers,observer);

        new TimedExecutor().executeCyclic(this.handleKeepAlive.bind(this), 300);
    }

    isHost(): boolean {
        return true;
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
        
        if(peer === this.localPeer) {
            console.debug("Added myself, not doing anything");
        }
        else {
            this.executeOnListener(async (listener) => {
                listener.onPeerJoined(peer);
            });
    
            for(let fileName of files.keys()) {
                this.onFileAdded(peer, fileName, files.get(fileName)!);
            }
            this.addObserverForFileList(peer, files);
        }
    }

    private addObserverForFileList(peer: string, files: Y.Map<Y.Map<any>>) {
        let observerId = uuid.v4();
        let observer = this.guard((event: Y.YMapEvent<Y.Map<any>>) => {
            console.log("Observe from id "+observerId);
            this.onFilesChanged(peer, event);
        });
        if(this.observers.has(files)) {
            files.unobserve(this.observers.get(files));
        }
        files.observe(observer);
        this.observers.set(files,observer);
    }

    private onPeerDeleted(peer : string) {
        console.debug("Deleting peer "+peer);

        if(peer === this.localPeer) {
            console.debug("Someone unjustly removed me, restoring peer settings for myself");
            this.peers.set(this.localPeer, this.me);
        }
        else {
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
        
    }

    private async handleKeepAlive() {
        let alive = this.doc.getMap("alivePeers");
        alive.set(this.localPeer, Date.now());

        for(let peer of this.peers.keys()) {
            let alivePeer = alive.get(peer);
            if(!alivePeer || Date.now() - alivePeer > timeout) {
                if(!this.timedOutPeers.has(peer)) {
                    this.timedOutPeers.add(peer);
                    this.onPeerDeleted(peer);
                }
            }
        }

        for(let peer of this.timedOutPeers) {
            let alivePeer = alive.get(peer);
            if(alivePeer && Date.now() - alivePeer <= timeout) {
                this.timedOutPeers.delete(peer);
                this.onPeerAdded(peer, this.peers.get(peer)!);
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
            await listener.onOpenRemoteFile(peer, remoteFile.uri,noneUri, this.getEditorSync(peer, key, remoteFile));
        });
        if (remoteFile.isActive) {
            await this.activateRemoteFile(peer, key, remoteFile);
        }
    }

    private addObserverOnFile(peer : string, key : string, file: Y.Map<any>) {
        let observer = this.guard((event : Y.YMapEvent<any>) => {
            this.onRemoteDocumentChanged(peer, key, event);
        });
        if(this.observers.has(file)) {
            file.unobserve(this.observers.get(file));
        }
        file.observe(observer);
        this.observers.set(file,observer);
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
                if(peerAndKey.peer === this.localPeer) {
                    this.me.delete(peerAndKey.key);
                }
                
            }
        });
    }

    syncLocalFileToRemote(fileid: string): Promise<IEditorSync> {
        console.debug("Syncing local file "+fileid+"@"+this.localPeer+" to remote");
        let remoteFile = new RemoteFile(this.localPeer,fileid,new Y.Array<RemoteSelection>(), new Y.Text(), false);
        this.transact(() => {
            this.me.set(fileid, remoteFile);
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
        for(let observable of this.observers.keys()) {
            observable.unobserve(this.observers.get(observable));
        }
        this.peers.delete(this.localPeer);
    }

    supportsLocalshare(): boolean {
        return true;
    }
    
    async shareLocal(workspace: string, fileid: string, initialContent : string): Promise<IEditorSync> {
        this.createWorkspaceIfNotExists(workspace);

        let remoteFile: IRemoteFile = this.getWorkspaceRemoteFile(workspace, fileid, initialContent);

        return this.getEditorSync(workspace, fileid, remoteFile);
    }


    private createWorkspaceIfNotExists(workspace: string) {
        this.transact(() => {
            if (!this.workspaces.has(workspace)) {
                this.workspaces.set(workspace, new Y.Map<Y.Map<any>>());
            }
        });
    }

    private getWorkspaceRemoteFile(workspace: string, fileid: string, initialContent : string) {
        let remoteFile: IRemoteFile = {} as IRemoteFile;
        this.transact(() => {
            let workspaceEntry = this.workspaces.get(workspace);
            if (workspaceEntry!.has(fileid)) {
                remoteFile = new RemoteFileProxy(workspaceEntry!.get(fileid)!);
            } else {
                remoteFile = new RemoteFile(this.localPeer, fileid, new Y.Array<RemoteSelection>(), new Y.Text(initialContent), false);
                workspaceEntry!.set(fileid, remoteFile as RemoteFile);
            }
        });
        return remoteFile;
    }
}