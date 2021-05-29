import { BufferProxy } from "@atom/teletype-client";
import { TextChange, TextChangeType } from "../data/textChange";
import { IBufferListener } from "../iBufferListener";
import { IBufferSync } from "../iBufferSync";
import { DelayedListenerExecution } from "./delayedListenerExecution";

export class TeletypeBufferSync extends DelayedListenerExecution<IBufferListener> implements IBufferSync {

    constructor(public bufferProxy : BufferProxy) {
        super();
        this.bufferProxy.setDelegate(this);
    }

    close(): void {
        this.bufferProxy.dispose();
    }

    async saveToRemote(): Promise<void> {
		this.bufferProxy.requestSave();
    }
    
    sendChangeToRemote(change: TextChange): Promise<void> {
        this.bufferProxy.setTextInRange(change.start, change.end, change.text);
        return Promise.resolve();
    }

    
	dispose() {
        this.executeOnListener(async (listener) => {
            listener.dispose();
        });
	}

    setText(text: string) {
        this.executeOnListener(async (listener) => {
            listener.onSetText(text);
        });
	}

    updateText(textUpdates: any) {
        let textChanges : TextChange[] = [];
        for(let textUpdate of textUpdates) {
            textChanges.push(new TextChange(this.getChangeType(textUpdate), textUpdate.oldStart, textUpdate.oldEnd, textUpdate.newText));
        }
        this.executeOnListener(async (listener) => {
            listener.onTextChanges(textChanges);
        });
	}

    getChangeType(textUpdate: any): TextChangeType {
        if(textUpdate.oldStart.row ===  textUpdate.oldEnd.row &&
            textUpdate.oldStart.column === textUpdate.oldEnd.column) {
            return TextChangeType.INSERT;
        } else {
            if(textUpdate.newText === "") {
                return TextChangeType.DELETE;
            } else {
                return TextChangeType.UPDATE;
            }
        }
    }

    save() {
        this.executeOnListener(async (listener) => {
            listener.onSave();
        });
	}
    
}