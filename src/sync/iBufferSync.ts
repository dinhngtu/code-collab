import { IDisposable } from "../base/iDisposable";
import { TextChange } from "./data/textChange";
import { IBufferListener } from "./iBufferListener";

export interface IBufferSync {
    sendChangeToRemote(change : TextChange) : Promise<void>;
    saveToRemote() : Promise<void>;
    setListener(listener : IBufferListener) : void;
    close() : void;
} 