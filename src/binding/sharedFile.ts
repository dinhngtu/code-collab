import BufferBinding from "../BufferBinding";
import { IEditorSync } from "../sync/iEditorSync";

export class SharedFile {
	constructor(public bufferBinding : BufferBinding, public editorSync : IEditorSync) {

	}
}