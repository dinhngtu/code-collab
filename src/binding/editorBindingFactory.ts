import { TextEditor } from "vscode";
import { IColorManager } from "../color/iColorManager";
import EditorBinding from "../EditorBinding";
import { IEditorSync } from "../sync/iEditorSync";
import { IEditorBindingFactory } from "./iEdtorBindingFactory";

export class EditorBindingFactory implements IEditorBindingFactory {

    constructor(private colorManager : IColorManager) {

    }

    createBinding(editor: TextEditor, sync: IEditorSync): EditorBinding {
        return new EditorBinding(editor, sync, this.colorManager);
    }
    
}