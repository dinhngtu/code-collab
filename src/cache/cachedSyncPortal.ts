import { ExtensionContext } from "../extensionContext";
import { IEditorSync } from "../sync/iEditorSync";
import { IPortalListener } from "../sync/iPortalListener";
import { ISyncPortal } from "../sync/iSyncPortal";
import { DelayedListenerExecution } from "../sync/teletype/delayedListenerExecution";
import { CachedEditorSync } from "./cachedEditorSync";
import * as vscode from 'vscode';

export class CachedSyncPortal extends DelayedListenerExecution<IPortalListener> implements ISyncPortal, IPortalListener {

    public cachesBySync = new Map<IEditorSync, IEditorSync>();

    constructor(private delegate : ISyncPortal, private extensionContext : ExtensionContext, private name : string) {
        super();
        delegate.setListener(this);
    }

    supportsLocalshare(): boolean {
        return this.delegate.supportsLocalshare();
    }

    shareLocal(workspace: string, fileid: string, initialContent : string): Promise<IEditorSync> {
        return this.delegate.shareLocal(workspace, fileid, initialContent);
    }

    isHost(): boolean {
        return this.delegate.isHost();
    }

    async onOpenRemoteFile(peer: string, uniqueUri: string, _ : vscode.Uri, editorSync: IEditorSync): Promise<void> {
        let cachedSync = new CachedEditorSync(editorSync);
        let uri = this.extensionContext.collabFs.registerBufferCache(this.delegate.getType(), this.name, uniqueUri, cachedSync.bufferSync);
        this.cachesBySync.set(editorSync, cachedSync);
        await this.executeOnListener(async (listener) => {
            await listener.onOpenRemoteFile(peer, uniqueUri, uri, cachedSync);
        });
    }

    async onActivateRemoveFile(editorSync: IEditorSync): Promise<void> {
        let cache = this.cachesBySync.get(editorSync);
        if(cache) {
            await this.executeOnListener(async (listener) => {
                await listener.onActivateRemoveFile(cache!);
            });
        } else {
            throw new Error("Editor sync has not been cached yet");
        }
    }

    async onCloseRemoteFile(editorSync: IEditorSync): Promise<void> {
        let cache = this.cachesBySync.get(editorSync);
        if(cache) {
            await this.executeOnListener(async (listener) => {
                await listener.onCloseRemoteFile(cache!);
            });
        } else {
            throw new Error("Editor sync has not been cached yet");
        }
    }

    async onPeerJoined(peer: string): Promise<void> {
        await this.executeOnListener(async (listener) => {
            await listener.onPeerJoined(peer);
        });
    }

    async onPeerLeft(peer: string): Promise<void> {
        await this.executeOnListener(async (listener) => {
            await listener.onPeerLeft(peer);
        });
    }

    dispose(): void {
        this.executeOnListener(async (listener) => {
            listener.dispose();
        });
    }

    syncLocalFileToRemote(fileid: string): Promise<IEditorSync> {
        return this.delegate.syncLocalFileToRemote(fileid);
    }

    async activateFileToRemote(editorSync: IEditorSync): Promise<void> {
        await this.delegate.activateFileToRemote(editorSync);
    }

    closeFileToRemote(editorSync: IEditorSync): Promise<void> {
        return this.delegate.closeFileToRemote(editorSync);
    }

    close(): void {
        this.delegate.close();
    }

    getType(): string {
        return this.delegate.getType();
    }

}