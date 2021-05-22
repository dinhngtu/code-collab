
import * as Y from 'yjs';
import { sleep } from '../../base/functions';
import { StringPositionCalculator } from '../../base/stringPositionCalculator';
import { TextChange, TextChangeType } from '../data/textChange';
import { IBufferListener } from '../iBufferListener';
import { IBufferSync } from '../iBufferSync';
import { DelayedListenerExecution } from '../teletype/delayedListenerExecution';

export class YBufferSync extends DelayedListenerExecution<IBufferListener> implements IBufferSync {

    private currentText = "";
    private lock : boolean = false;

    constructor(public doc : Y.Doc, public localpeer : string, public buffer : Y.Text, public remoteSaveRequests : Y.Array<string>) {
        super();
        this.buffer.observe(this.onRemoteTextChanged.bind(this));
        this.remoteSaveRequests.observe(this.onRemoteSave.bind(this));
    }

    //poor mans locking, because typescript doesn't has a concept of locks, because node and the browser js are normally single threaded, but 
    //this doesn't seem to be true for vscode
    private async aquire() {
        while(this.lock) {
            await sleep(10);
        }
        this.lock = true;
    }

    private release() {
        this.lock = false;
    }

    private async onRemoteTextChanged(event : Y.YTextEvent) {
        await this.aquire();
        try {
            let changes : TextChange[] = [];
            var position = 0;
            for(let delta of event.changes.delta) {
                if(delta.retain) {
                    position += delta.retain;
                } else if(delta.delete) {
                    let textDelete = new TextChange(TextChangeType.DELETE, StringPositionCalculator.indexToLineAndCharacter(this.currentText,position), StringPositionCalculator.indexToLineAndCharacter(this.currentText,position + delta.delete), "");
                    changes.push(textDelete);
                    this.applyChange(textDelete);
                } else if(delta.insert) {
                    let textInsert = new TextChange(TextChangeType.INSERT, StringPositionCalculator.indexToLineAndCharacter(this.currentText,position), StringPositionCalculator.indexToLineAndCharacter(this.currentText,position), delta.insert as string);
                    changes.push(textInsert);
                    this.applyChange(textInsert),
                    position += delta.insert.length;
                }
            }

            this.executeOnListener((listener) => {
                listener.onTextChanges(changes.reverse());
            });
        } finally {
            this.release();
        }
    }

    private onRemoteSave(event : Y.YArrayEvent<string>){
        this.executeOnListener((listener) => {
            listener.onSave();
        });
        this.remoteSaveRequests.delete(0, this.remoteSaveRequests.length);
    } 

    private applyChange(change: TextChange) {
        let startIndex = StringPositionCalculator.lineAndCharacterToIndex(this.currentText, change.start);
        let endIndex = StringPositionCalculator.lineAndCharacterToIndex(this.currentText, change.end);
        let start = this.currentText.slice(0,startIndex);
        let end = this.currentText.slice(endIndex);
        this.currentText = start+change.text+end;
    }

    

    async sendChangeToRemote(change: TextChange): Promise<void> {
        await this.aquire();
        try {
            let startIndex = StringPositionCalculator.lineAndCharacterToIndex(this.currentText, change.start);
            let endIndex = StringPositionCalculator.lineAndCharacterToIndex(this.currentText, change.end);
            if(change.type === TextChangeType.DELETE) {
                this.buffer.delete(startIndex, endIndex-startIndex);
            } else if(change.type === TextChangeType.INSERT) {
                this.buffer.insert(startIndex, change.text);
            } else if(change.type === TextChangeType.UPDATE) {
                if(startIndex !== endIndex) {
                    this.buffer.delete(startIndex, endIndex-startIndex);
                }
                this.buffer.insert(startIndex, change.text);
            }

            this.applyChange(change);
        } finally {
            this.release();
        }
    }

    saveToRemote(): Promise<void> {
        this.remoteSaveRequests.push([this.localpeer]);
        return Promise.resolve();
    }

    close(): void {
        //do nothing for now
    }
}