import { IEditorSync } from "../iEditorSync";
import { IPortalListener } from "../iPortalListener";
import { ISyncPortal } from "../iSyncPortal";
import { MemoryEditorSync } from "./memoryEditorSync";

export class MemorySyncPortal implements ISyncPortal {

    localFiles : string[] = [];
    activeEditorSync : IEditorSync | null = null;
    listener : IPortalListener | null = null;
    closeCount = 0;

    syncLocalFileToRemote(fileid: string): Promise<IEditorSync> {
        this.localFiles.push(fileid);
        return Promise.resolve(new MemoryEditorSync());
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