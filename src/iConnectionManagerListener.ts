import { SyncConnection } from "./binding/syncConnection";

export interface IConnectionManagerListener {
    onConnectionAdded(connection : SyncConnection) : void;
}