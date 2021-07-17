import { SyncConnection } from "../../binding/syncConnection";

export interface IConnector {
    newConnection() : Promise<SyncConnection>;
    getName() : string;
    restoreConnections() : Promise<void>;
    disconnect(connection : SyncConnection) : Promise<void>;
    supportsNewConnection() : boolean;
    supportsDisconnect() : boolean;
}