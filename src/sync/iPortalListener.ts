import { IDisposable } from "../base/iDisposable";
import { IEditorSync } from "./iEditorSync";

export interface IPortalListener extends IDisposable {
    onOpenRemoteFile(uniqueUri: string, editorSync : IEditorSync) : Promise<void>;
    onCloseRemoteFile(editorSync : IEditorSync) : Promise<void>;
    onPeerJoined(peer : string) : Promise<void>;
    onPeerLeft(peer : string) : Promise<void>;
}