import BufferBinding from "./BufferBinding";
import { IEditorSync } from "./sync/iEditorSync";

export class RemoteFileEntry {
    constructor(public bufferBinding : BufferBinding, public editorSync : IEditorSync) {
        
    }
}