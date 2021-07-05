import { ColorManager } from "./color/colorManager";
import { ConnectionManager } from "./connectionManager";
import { CollaborationFs } from "./filesystem/collaborationFsProvider";

export class ExtensionContext {

    private static defaultContext : ExtensionContext | null = null;

    public static default() {
        if(!ExtensionContext.defaultContext) {
            ExtensionContext.defaultContext = new ExtensionContext(new ConnectionManager(), new ColorManager(), new CollaborationFs("collabfs"));
        }
        return ExtensionContext.defaultContext;
    }

    constructor(public connectionManager : ConnectionManager, public colorManager : ColorManager, public collabFs : CollaborationFs) {
        
    }
}