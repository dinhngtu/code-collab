import { EditorProxy, Portal } from "@atom/teletype-client";
import { IEditorSync } from "../iEditorSync";
import { IPortalListener } from "../iPortalListener";
import { ISyncPortal } from "../iSyncPortal";
import { DelayedListenerExecution } from "./delayedListenerExecution";
import { TeletypeEditorSync } from "./teletypeEditorSync";

export class TeletypeSyncPortal extends DelayedListenerExecution<IPortalListener> implements ISyncPortal {

    private syncsByProxy = new  Map<EditorProxy, IEditorSync>();

    constructor(public portal : Portal) {
        super();
        this.portal.setDelegate(this);
    }
    getType(): string {
        return "Teletype";
    }

    async closeFileToRemote(editorSync: IEditorSync): Promise<void> {
        editorSync.close();
    }
    
    close(): void {
        this.portal.dispose();
        for(let editorSync of this.syncsByProxy.values()) {
            editorSync.close();
        }
    }

    syncLocalFileToRemote(fileid: string): Promise<IEditorSync> {
        let bufferProxy = this.portal.createBufferProxy();
		let editorProxy = this.portal.createEditorProxy({bufferProxy});
        let editorSync = new TeletypeEditorSync(editorProxy);
        this.syncsByProxy.set(editorProxy, editorSync);
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

    async updateTether(state: any, editorProxy: any, position: any) {
		if (editorProxy) {
            let uniquePath = this.getUniquePath(editorProxy);
            if(this.syncsByProxy.has(editorProxy)) {
                this.executeOnListener(async (listener) => {
                    listener.onOpenRemoteFile(uniquePath, this.syncsByProxy.get(editorProxy)!);
                });
            } else {
                let editorSync = new TeletypeEditorSync(editorProxy);
                this.syncsByProxy.set(editorProxy, editorSync);
                this.executeOnListener(async (listener) => {
                    listener.onOpenRemoteFile(uniquePath,editorSync);
                });
            }
		}
	}

    private getUniquePath(editorProxy: any) {
        return "/" + (this.portal as any).id + "/" + (editorProxy as any).bufferProxy.uri;
    }

    hostDidClosePortal() {
		//TODO: implement
	}

    hostDidLoseConnection() {
		//TODO: implement
	}

    updateActivePositions(positionsBySiteId: any) {
		//TODO: implement
	}

    siteDidJoin(siteId: any) {
		this.executeOnListener(async (listener) => {
            listener.onPeerJoined(siteId);
        });
	}

	siteDidLeave(siteId: any) {
		this.executeOnListener(async (listener) => {
            listener.onPeerLeft(siteId);
        });
	}

	didChangeEditorProxies() { 
        //TODO: implement
    }

}