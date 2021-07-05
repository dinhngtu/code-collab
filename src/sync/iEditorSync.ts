import { Selection } from "./data/selection";
import { IBufferSync } from "./iBufferSync";
import { IEditorListener } from "./iEditorListener";

export interface IEditorSync {
    sendSelectionsToRemote(selections : Selection[]) : Promise<void>;
    setListener(listener : IEditorListener) : void;
    getBufferSync() : IBufferSync;
    close() : void;
}