import { IDisposable } from "../base/iDisposable";
import { IEditorSync } from "./iEditorSync";

export interface IPortalListener extends IDisposable {
    onOpenRemoteFile(uniqueUri: string, editorSync : IEditorSync) : Promise<void>;
}