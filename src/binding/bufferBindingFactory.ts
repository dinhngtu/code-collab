import { TextDocument } from "vscode";
import BufferBinding from "../BufferBinding";
import { IBufferSync } from "../sync/iBufferSync";
import { IBufferBindingFactory } from "./iBufferBindingFactory";

export class BufferBindingFactory implements IBufferBindingFactory {
    createBinding(buffer: TextDocument, sync: IBufferSync, uri : string): BufferBinding {
        return new BufferBinding(buffer, sync, uri);
    }

}