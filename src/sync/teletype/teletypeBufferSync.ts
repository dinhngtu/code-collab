import { BufferProxy } from "@atom/teletype-client";
import { TextChange } from "../data/textChange";
import { IBufferListener } from "../iBufferListener";
import { IBufferSync } from "../iBufferSync";

export class TeletypeBufferSync implements IBufferSync {

    private listener : IBufferListener | null = null;

    constructor(public bufferProxy : BufferProxy) {
        this.bufferProxy.setDelegate(this);
    }

    setListener(listener: IBufferListener): void {
        this.listener = listener;
    }
    
    async saveToRemote(): Promise<void> {
		this.bufferProxy.requestSave();
    }
    
    sendChangeToRemote(change: TextChange): Promise<void> {
        this.bufferProxy.setTextInRange(change.start, change.start, change.text);
        return Promise.resolve();
    }

    
	dispose() {
		this.listener?.dispose();
	}

    setText(text: string) {
		this.listener?.onSetText(text);
	}

    updateText(textUpdates: any) {
        let textChanges : TextChange[] = [];
        for(let textUpdate of textUpdates) {
            textChanges.push(new TextChange(textUpdate.oldStart, textUpdate.oldEnd, textUpdate.newText));
        }
        this.listener?.onTextChanges(textChanges);
	}

    save() {
		this.listener?.onSave();
	}
    
}