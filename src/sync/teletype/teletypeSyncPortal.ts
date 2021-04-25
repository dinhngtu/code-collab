import { BufferProxy, EditorProxy, Portal } from "@atom/teletype-client";
import { IEditorSync } from "../iEditorSync";
import { IPortalListener } from "../iPortalListener";
import { ISyncPortal } from "../iSyncPortal";
import { TeletypeEditorSync } from "./teletypeEditorSync";

export class TeletypeSyncPortal implements ISyncPortal {

    private listener : IPortalListener | null = null;
    private syncsByProxy = new  Map<EditorProxy, IEditorSync>();

    constructor(public portal : Portal) {
        this.portal.setDelegate(this);
    }

    syncLocalFileToRemote(fileid: string): Promise<IEditorSync> {
        let bufferProxy = this.portal.createBufferProxy() as unknown as BufferProxy;
		let editorProxy = this.portal.createEditorProxy({bufferProxy}) as unknown as EditorProxy;
        let editorSync = new TeletypeEditorSync(editorProxy);
        this.syncsByProxy.set(editorProxy, editorSync);
        return Promise.resolve(editorSync);
    }

    activateFileToRemote(editorSync: IEditorSync): Promise<void> {
        let teletypeSync = editorSync as TeletypeEditorSync;
        this.portal.activateEditorProxy(teletypeSync.editorProxy);
        return Promise.resolve();
    }

    setListener(listener: IPortalListener): void {
        this.listener = listener;
    }

    dispose() {
        this.listener?.dispose();
    }

    async updateTether(state: any, editorProxy: any, position: any) {
		if (editorProxy) {
            let uniquePath = "/"+(this.portal as any).id+"/"+(editorProxy as any).bufferProxy.uri;
            if(this.syncsByProxy.has(editorProxy)) {
                await this.listener?.onOpenRemoteFile(uniquePath, this.syncsByProxy.get(editorProxy)!);
            } else {
                let editorSync = new TeletypeEditorSync(editorProxy);
                this.syncsByProxy.set(editorProxy, editorSync);
                await this.listener?.onOpenRemoteFile(uniquePath,editorSync);
            }
		}
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
		//TODO: implement
	}

	siteDidLeave(siteId: never) {
		//TODO: implement
	}

	didChangeEditorProxies() { 
        //TODO: implement
    }

}