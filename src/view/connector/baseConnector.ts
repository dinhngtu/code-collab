import { IColorManager } from "../../color/iColorManager";
import { ConnectionManager } from "../../connectionManager";
import { ExtensionContext } from "../../extensionContext";
import PortalBinding from "../../PortalBinding";
import { ISyncPortal } from "../../sync/iSyncPortal";

export abstract class BaseConnector {
    constructor(public extensionContext : ExtensionContext) {

    }

    protected addConnection(name : string, syncPortal : ISyncPortal, host : boolean) {
        let binding = new PortalBinding(syncPortal, host,name, this.extensionContext);
        binding.initialize();
        this.extensionContext.connectionManager.addConnection(binding);
    }

    protected async input(inputter : () => Promise<string | undefined | null>) {
        let result = await inputter();
        if(!result) {
            throw new Error("Input aborted by user");
        }
        return result;
    }
}