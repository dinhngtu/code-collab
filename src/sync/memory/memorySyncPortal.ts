import { IEditorSync } from "../iEditorSync";
import { IPortalListener } from "../iPortalListener";
import { ISyncPortal } from "../iSyncPortal";
import { MemoryEditorSync } from "./memoryEditorSync";

export class MemorySyncPortal implements ISyncPortal {
    
    

    localFiles : string[] = [];
    editorSyncFiles = new Map<IEditorSync, string>();
    activeEditorSync : IEditorSync | null = null;
    listener : IPortalListener | null = null;
    closeCount = 0;

    isHost(): boolean {
        return true;
    }

    getType(): string {
        return "Memory";
    }

    async closeFileToRemote(editorSync: IEditorSync): Promise<void> {
        let fileid = this.editorSyncFiles.get(editorSync);
        if(fileid) {
            this.localFiles = this.localFiles.filter(file => fileid !== file);
        }
        if(this.activeEditorSync === editorSync) {
            this.activeEditorSync = null;
        }
    }

    syncLocalFileToRemote(fileid: string): Promise<IEditorSync> {
        this.localFiles.push(fileid);
        let sync = new MemoryEditorSync();
        this.editorSyncFiles.set(sync,fileid);
        return Promise.resolve(sync);
    }

    activateFileToRemote(editorSync: IEditorSync): Promise<void> {
        this.activeEditorSync = editorSync;
        return Promise.resolve();
    }

    setListener(listener: IPortalListener): void {
        this.listener = listener;
    }

    close(): void {
        this.closeCount++;
    }

}