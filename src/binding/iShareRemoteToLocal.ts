import { RemoteFileEntry } from "../remoteFileEntry";
import { IEditorSync } from "../sync/iEditorSync";

export interface IShareRemoteToLocal {
    getFiles(peer : string) : RemoteFileEntry[];
    activateRemoteFile(editorSync: IEditorSync): Promise<void>;
}