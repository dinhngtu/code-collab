import { IEditorSync } from "./iEditorSync";
import { IPortalListener } from "./iPortalListener";

export interface ISyncPortal {
    syncLocalFileToRemote(fileid : string) : Promise<IEditorSync>;
    activateFileToRemote(editorSync : IEditorSync) : Promise<void>;
    setListener(listener : IPortalListener) : void;
    close() : void;
}