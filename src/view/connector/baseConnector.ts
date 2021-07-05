import { SyncConnection } from "../../binding/syncConnection";
import { CachedSyncPortal } from "../../cache/cachedSyncPortal";
import { ExtensionContext } from "../../extensionContext";
import { ISyncPortal } from "../../sync/iSyncPortal";
import { IConnector } from "./iConnector";

export abstract class BaseConnector implements IConnector {
    constructor(public extensionContext : ExtensionContext) {

    }
    

    protected addConnection(name : string, syncPortal : ISyncPortal) : SyncConnection {
        let binding = new SyncConnection(this.extensionContext,new CachedSyncPortal(syncPortal, this.extensionContext,name),name);
        binding.initialize();
        this.extensionContext.connectionManager.addConnection(binding, this);
        return binding;
    }


    async disconnect(syncConnection : SyncConnection) {
    }

    abstract newConnection(): Promise<SyncConnection>;
    abstract getName(): string;
    abstract restoreConnections(): Promise<void>;

    
}