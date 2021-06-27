import { IDisposable } from "./base/iDisposable";
import { SyncConnection } from "./binding/syncConnection";
import { IConnectionManagerListener } from "./iConnectionManagerListener";
import { DelayedListenerExecution } from "./sync/teletype/delayedListenerExecution";

export class ConnectionManager extends DelayedListenerExecution<IConnectionManagerListener> implements IDisposable {
    private connections : SyncConnection [] = [];

    addConnection(connection : SyncConnection) {
        this.connections.push(connection);
        this.executeOnListener(async (listener) => {
            listener.onConnectionAdded(connection);
        });
    }

    getConnections() {
        return this.connections;
    }

    dispose(): void {
        for(let connection of this.connections) {
            connection.dispose();
        }
    }

}