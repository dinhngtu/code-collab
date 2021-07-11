import { IEditorSync } from "./iEditorSync";
import { IPortalListener } from "./iPortalListener";

export interface ISyncPortal {
    syncLocalFileToRemote(fileid : string) : Promise<IEditorSync>;
    activateFileToRemote(editorSync : IEditorSync) : Promise<void>;
    closeFileToRemote(editorSync : IEditorSync) : Promise<void>;
    setListener(listener : IPortalListener) : void;
    close() : void;
    getType() : string;
    isHost() : boolean;
    supportsLocalshare() : boolean;
    shareLocal(workspace : string, fileid : string, initialContent : string) : Promise<IEditorSync>;
}