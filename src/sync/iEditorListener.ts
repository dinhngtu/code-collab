import { IDisposable } from "../base/iDisposable";
import { Selection } from "./data/selection";

export interface IEditorListener extends IDisposable {
    onSelectionsChangedForPeer(peerid : string, selections : Selection[]) : Promise<void>;
}