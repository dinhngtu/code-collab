import { ExtensionContext } from "../extensionContext";
import { Selection } from "../sync/data/selection";
import { IBufferSync } from "../sync/iBufferSync";
import { IEditorListener } from "../sync/iEditorListener";
import { IEditorSync } from "../sync/iEditorSync";
import { BufferCache } from "./bufferCache";

export class CachedEditorSync implements IEditorSync {
    
    public bufferSync : BufferCache;

    constructor(private delegate : IEditorSync) {
        this.bufferSync = new BufferCache(delegate.getBufferSync());
    }
    
    sendSelectionsToRemote(selections: Selection[]): Promise<void> {
        return this.delegate.sendSelectionsToRemote(selections);
    }

    setListener(listener: IEditorListener): void {
        this.delegate.setListener(listener);
    }

    getBufferSync(): IBufferSync {
        return this.bufferSync;
    }

    close(): void {
        this.bufferSync.close();
        this.delegate.close();
    }

}