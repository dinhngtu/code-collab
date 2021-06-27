import { SyncConnection } from "../../binding/syncConnection";
import { CachedSyncPortal } from "../../cache/cachedSyncPortal";
import { ExtensionContext } from "../../extensionContext";
import { ISyncPortal } from "../../sync/iSyncPortal";

export abstract class BaseConnector {
    constructor(public extensionContext : ExtensionContext) {

    }

    protected addConnection(name : string, syncPortal : ISyncPortal) {
        let binding = new SyncConnection(this.extensionContext,new CachedSyncPortal(syncPortal, this.extensionContext,name),name);
        binding.initialize();
        this.extensionContext.connectionManager.addConnection(binding);
    }

    
}