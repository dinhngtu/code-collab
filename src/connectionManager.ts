import { IDisposable } from "./base/iDisposable";
import { IConnectionManagerListener } from "./iConnectionManagerListener";
import PortalBinding from "./PortalBinding";
import { ISyncPortal } from "./sync/iSyncPortal";
import { DelayedListenerExecution } from "./sync/teletype/delayedListenerExecution";

export class ConnectionManager extends DelayedListenerExecution<IConnectionManagerListener> implements IDisposable {
    private connections : PortalBinding [] = [];

    addConnection(connection : PortalBinding) {
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