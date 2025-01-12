
import * as Y from 'yjs';
import { StringPositionCalculator } from '../../base/stringPositionCalculator';
import { TextChange, TextChangeType } from '../data/textChange';
import { IBufferListener } from '../iBufferListener';
import { IBufferSync } from '../iBufferSync';
import { IRemoteFile } from './remoteFile';
import { YTransactionBasedSync } from './yTransactionBasedSync';

export class YBufferSync extends YTransactionBasedSync<IBufferListener> implements IBufferSync {

    private currentText = "";
    private bufferObserver = this.guard(this.onRemoteTextChanged.bind(this));
    private saveObserver = this.guard(this.onRemoteSave.bind(this));

    constructor(doc : Y.Doc, localpeer : string, public remoteFile : IRemoteFile) {
        super(doc, localpeer);
        this.remoteFile.buffer.observe(this.bufferObserver);
        this.remoteFile.saveRequests.observe(this.saveObserver);
        this.initBuffer();
    }

    private initBuffer() {
        if (this.remoteFile.buffer.length > 0) {
            this.currentText = this.remoteFile.buffer.toString();
            let text = ""+this.currentText;
            this.executeOnListener(async (listener) => {
                listener.onSetText(text);
            });
        }
    }

    private onRemoteTextChanged(event : Y.YTextEvent) {
        let changes: TextChange[] = [];
        var position = 0;
        for (let delta of event.changes.delta) {
            if (delta.retain) {
                position += delta.retain;
            } else if (delta.delete) {
                let textDelete = new TextChange(TextChangeType.DELETE, StringPositionCalculator.indexToLineAndCharacter(this.currentText, position), StringPositionCalculator.indexToLineAndCharacter(this.currentText, position + delta.delete), "");
                changes.push(textDelete);
                this.applyChange(textDelete);
            } else if (delta.insert) {
                let textInsert = new TextChange(TextChangeType.INSERT, StringPositionCalculator.indexToLineAndCharacter(this.currentText, position), StringPositionCalculator.indexToLineAndCharacter(this.currentText, position), delta.insert as string);
                changes.push(textInsert);
                this.applyChange(textInsert),
                position += delta.insert.length;
            }
        }

        this.executeOnListener(async (listener) => {
            listener.onTextChanges(changes.reverse());
        });
    }

    private onRemoteSave(event : Y.YArrayEvent<string>){
        if(this.remoteFile.saveRequests.length>0) {
          this.remoteFile.lastSave = Date.now();
          this.executeOnListener(async (listener) => {
                listener.onSave();
            });
            this.transact(() => {
                this.remoteFile.saveRequests.delete(0, this.remoteFile.saveRequests.length);
            });
        }
    } 

    private applyChange(change: TextChange) {
        let startIndex = StringPositionCalculator.lineAndCharacterToIndex(this.currentText, change.start);
        let endIndex = StringPositionCalculator.lineAndCharacterToIndex(this.currentText, change.end);
        let start = this.currentText.slice(0,startIndex);
        let end = this.currentText.slice(endIndex);
        this.currentText = start+change.text+end;
    }

    

    async sendChangeToRemote(change: TextChange): Promise<void> {
        let startIndex = StringPositionCalculator.lineAndCharacterToIndex(this.currentText, change.start);
        let endIndex = StringPositionCalculator.lineAndCharacterToIndex(this.currentText, change.end);
        this.sendChangeInTransaction(change, startIndex, endIndex);

        this.applyChange(change);
    }

    private sendChangeInTransaction(change: TextChange, startIndex: number, endIndex: number) {
        this.transact(() => {
            if (change.type === TextChangeType.DELETE) {
                this.remoteFile.buffer.delete(startIndex, endIndex - startIndex);
            } else if (change.type === TextChangeType.INSERT) {
                this.remoteFile.buffer.insert(startIndex, change.text);
            } else if (change.type === TextChangeType.UPDATE) {
                if (startIndex !== endIndex) {
                    this.remoteFile.buffer.delete(startIndex, endIndex - startIndex);
                }
                this.remoteFile.buffer.insert(startIndex, change.text);
            }
        });
    }

    saveToRemote(): Promise<void> {
        this.transact(() => {
            this.remoteFile.lastSave = Date.now();
            this.remoteFile.saveRequests.push([this.localPeer]);
        });
        return Promise.resolve();
    }

    close(): void {
        this.remoteFile.buffer.unobserve(this.bufferObserver);
        this.remoteFile.saveRequests.unobserve(this.saveObserver);
    }

    dispose() : void {
        this.executeOnListener(async (listener) => {
            listener.dispose();
        });
    }
}