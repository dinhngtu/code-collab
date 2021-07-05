import { removeValueFromArray } from "./base/functions";
import { IDisposable } from "./base/iDisposable";
import { SyncConnection } from "./binding/syncConnection";
import { IConnectionManagerListener } from "./iConnectionManagerListener";
import { DelayedListenerExecution } from "./sync/teletype/delayedListenerExecution";
import { IConnector } from "./view/connector/iConnector";

export class ConnectionManager extends DelayedListenerExecution<IConnectionManagerListener> implements IDisposable {
    private connections : SyncConnection [] = [];
    private sources = new Map<SyncConnection, IConnector>();

    addConnection(connection : SyncConnection, source : IConnector) {
        this.connections.push(connection);
        this.executeOnListener(async (listener) => {
            listener.onConnectionAdded(connection);
        });
        this.sources.set(connection, source);
    }

    getConnections() {
        return this.connections;
    }

    async remove(connection : SyncConnection) {
        connection.dispose();
        removeValueFromArray(this.connections, connection);
        this.executeOnListener(async (listener) => {
            listener.onConnectionRemoved(connection);
        });
        await this.sources.get(connection)?.disconnect(connection);
    }

    dispose(): void {
        for(let connection of this.connections) {
            connection.dispose();
        }
    }

}