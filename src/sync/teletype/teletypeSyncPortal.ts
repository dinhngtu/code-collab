import { EditorProxy, Portal } from "@atom/teletype-client";
import { IEditorSync } from "../iEditorSync";
import { IPortalListener } from "../iPortalListener";
import { ISyncPortal } from "../iSyncPortal";
import { DelayedListenerExecution } from "./delayedListenerExecution";
import { TeletypeEditorSync } from "./teletypeEditorSync";
import * as vscode from 'vscode';

const noneUri = vscode.Uri.parse("none://");

export class TeletypeSyncPortal extends DelayedListenerExecution<IPortalListener> implements ISyncPortal {

    private syncsByProxy = new  Map<EditorProxy, IEditorSync>();

    constructor(public portal : Portal) {
        super();
        this.portal.setDelegate(this);
        if(!portal.isHost) {
            this.executeOnListener(async (listener) => {
                listener.onPeerJoined("host");
            });
        }
    }

    isHost(): boolean {
        return this.portal.isHost;
    }

    getType(): string {
        return "Teletype";
    }

    async closeFileToRemote(editorSync: IEditorSync): Promise<void> {
        editorSync.close();
    }

    onRemoteFileClosed(sync: TeletypeEditorSync) {
        if(!this.portal.isHost) {
            this.executeOnListener(async (listener) => {
                await listener.onCloseRemoteFile(sync);
            });    
        }
    }
    
    close(): void {
        this.portal.dispose();
        for(let editorSync of this.syncsByProxy.values()) {
            editorSync.close();
        }
    }

    syncLocalFileToRemote(fileid: string): Promise<IEditorSync> {
        let bufferProxy = this.portal.createBufferProxy({uri: fileid});
		let editorProxy = this.portal.createEditorProxy({bufferProxy});
        let editorSync = new TeletypeEditorSync(this.portal, editorProxy,this);
        this.syncsByProxy.set(editorProxy, editorSync);
        this.activateFileToRemote(editorSync);
        return Promise.resolve(editorSync);
    }

    activateFileToRemote(editorSync: IEditorSync): Promise<void> {
        let teletypeSync = editorSync as TeletypeEditorSync;
        this.portal.activateEditorProxy(teletypeSync.editorProxy);
        return Promise.resolve();
    }

    dispose() {
        this.executeOnListener(async (listener) => {
            listener.dispose();
        });
    }

    async updateTether(state: any, editorProxy: EditorProxy | null, position: any) {
		if (editorProxy) {
            let uniquePath = this.getUniquePath(editorProxy);
            if(this.syncsByProxy.has(editorProxy)) {
                this.executeOnListener(async (listener) => {
                   await listener.onActivateRemoveFile(this.syncsByProxy.get(editorProxy)!);
                });
            } else {
                let editorSync = new TeletypeEditorSync(this.portal,editorProxy,this);
                this.syncsByProxy.set(editorProxy, editorSync);
                this.executeOnListener(async (listener) => {
                    await listener.onOpenRemoteFile("host", uniquePath,noneUri,editorSync);
                    await listener.onActivateRemoveFile(editorSync);
                });
            }
		}
	}

    private getUniquePath(editorProxy: any) {
        return "/" + (this.portal as any).id + "/" + (editorProxy as any).bufferProxy.uri;
    }

    hostDidClosePortal() {
        this.executeOnListener(async (listener) => {
            listener.onPeerLeft("host");
        });
	}

    hostDidLoseConnection() {
        this.hostDidClosePortal();
	}

    updateActivePositions(positionsBySiteId: any) {
		//TODO: implement
	}

    siteDidJoin(siteId: any) {
		this.executeOnListener(async (listener) => {
            listener.onPeerJoined(this.portal.getSiteIdentity(siteId).login);
        });
	}

	siteDidLeave(siteId: any) {
		this.executeOnListener(async (listener) => {
            listener.onPeerLeft(this.portal.getSiteIdentity(siteId).login);
        });
	}

	didChangeEditorProxies() { 
        //TODO: implement
    }

    supportsLocalshare(): boolean {
        return false;
    }
    
    async shareLocal(workspace: string, fileid: string, initialContent : string): Promise<IEditorSync> {
        throw new Error("Localshare is not supported");
    }

    supportsFileAge(): boolean {
        return false;
    }
    getFileAge(workspace: string, fileid: string): number | null {
        throw new Error("Method not implemented.");
    }

}