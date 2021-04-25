import { IDisposable } from "../base/iDisposable";
import { TextChange } from "./data/textChange";

export interface IBufferListener extends IDisposable {
    onSetText(text : string) : Promise<void>;
    onTextChanges(changes : TextChange[]) : Promise<void>;
    onSave() : Promise<void>;
}