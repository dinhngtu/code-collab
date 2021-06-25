import { StringPositionCalculator } from "../base/stringPositionCalculator";
import { TextChange } from "../sync/data/textChange";
import { IBufferListener } from "../sync/iBufferListener";
import { IBufferSync } from "../sync/iBufferSync";

export class BufferCache implements IBufferListener, IBufferSync {
    
    
    private bufferListener : IBufferListener | null = null;
    public text : string = "";

    constructor(private bufferSync : IBufferSync) {
        bufferSync.setListener(this);
    }
    
    onSetText(text: string): Promise<void> {
        this.text = text;
        return this.executeOnListener((listener) => listener.onSetText(text));
    }
    onTextChanges(changes: TextChange[]): Promise<void> {
        for (let i = changes.length - 1; i >= 0; i--) {
			const textUpdate = changes[i];
            this.applyChange(textUpdate);
		}
        return this.executeOnListener((listener) => listener.onTextChanges(changes));
    }

    private applyChange(change: TextChange) {
        let startIndex = StringPositionCalculator.lineAndCharacterToIndex(this.text, change.start);
        let endIndex = StringPositionCalculator.lineAndCharacterToIndex(this.text, change.end);
        let start = this.text.slice(0,startIndex);
        let end = this.text.slice(endIndex);
        this.text = start+change.text+end;
    }

    onSave(): Promise<void> {
        //this is a remote file, its not our business to save it
        return Promise.resolve();
    }

    dispose(): void {
        this.executeOnListener(async (listener) => listener.dispose());
    }

    sendChangeToRemote(change: TextChange): Promise<void> {
        return this.bufferSync.sendChangeToRemote(change);
    }

    saveToRemote(): Promise<void> {
        return this.bufferSync.saveToRemote();
    }

    setListener(listener: IBufferListener): void {
        this.bufferListener = listener;
    }

    close(): void {
        this.bufferSync.close();
    }

    private executeOnListener(call : (listener : IBufferListener) => Promise<void>) : Promise<void> {
        if(this.bufferListener) {
            return call(this.bufferListener);
        }
        return Promise.resolve();
    }

}