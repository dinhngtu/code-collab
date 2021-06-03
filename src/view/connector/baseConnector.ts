import { ConnectionManager } from "../../connectionManager";
import PortalBinding from "../../PortalBinding";
import { ISyncPortal } from "../../sync/iSyncPortal";

export abstract class BaseConnector {
    constructor(public connectionManager : ConnectionManager) {

    }

    protected addConnection(name : string, syncPortal : ISyncPortal, host : boolean) {
        let binding = new PortalBinding(syncPortal, host,name);
        binding.initialize();
        this.connectionManager.addConnection(binding);
    }

    protected async input(inputter : () => Promise<string | undefined | null>) {
        let result = await inputter();
        if(!result) {
            throw new Error("Input aborted by user");
        }
        return result;
    }
}