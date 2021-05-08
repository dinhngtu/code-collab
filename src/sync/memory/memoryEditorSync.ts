import { Selection } from "../data/selection";
import { IBufferSync } from "../iBufferSync";
import { IEditorListener } from "../iEditorListener";
import { IEditorSync } from "../iEditorSync";
import { MemoryBufferSync } from "./memoryBufferSync";

export class MemoryEditorSync implements IEditorSync {

    localSelections : Selection[][] = [];
    listener : IEditorListener | null = null;
    bufferSync : IBufferSync = new MemoryBufferSync();
    closeCount = 0;

    sendSelectionsToRemote(selections: Selection[]): Promise<void> {
        this.localSelections.push(selections);
        return Promise.resolve();
    }

    setListener(listener: IEditorListener): void {
        this.listener = listener;
    }

    getBufferSync(): IBufferSync {
        return this.bufferSync;
    }
    close(): void {
        this.closeCount++;
    }

}