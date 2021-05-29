import { TextChange } from "../data/textChange";
import { IBufferListener } from "../iBufferListener";
import { IBufferSync } from "../iBufferSync";

export class MemoryBufferSync implements IBufferSync {

    localChanges : TextChange[] = [];
    saveCount = 0;
    listener : IBufferListener | null = null;
    closeCount = 0;

    sendChangeToRemote(change: TextChange): Promise<void> {
        console.debug("Storing change "+JSON.stringify(change));
        this.localChanges.push(change);
        return Promise.resolve();
    }
    saveToRemote(): Promise<void> {
        this.saveCount++;
        return Promise.resolve();
    }
    setListener(listener: IBufferListener): void {
        this.listener = listener;
    }

    close(): void {
        this.closeCount++;
    }

}