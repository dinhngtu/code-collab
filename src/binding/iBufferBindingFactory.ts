import BufferBinding from "../BufferBinding";
import { IBufferSync } from "../sync/iBufferSync";
import * as vscode from 'vscode';

export interface IBufferBindingFactory {
    createBinding(buffer : vscode.TextDocument, sync : IBufferSync, uri : string) : BufferBinding;
}