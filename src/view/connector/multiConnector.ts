import * as vscode from 'vscode';
import { SyncConnection } from '../../binding/syncConnection';
import { IColorManager } from '../../color/iColorManager';
import { ConnectionManager } from '../../connectionManager';
import { ExtensionContext } from '../../extensionContext';
import { input } from '../base/viewFunctions';
import { BaseConnector } from './baseConnector';
import { IConnector } from './iConnector';

export class MultiConnector extends BaseConnector implements IConnector{

    private connectorByConnection = new Map<SyncConnection, IConnector>();

    constructor(extensionContext : ExtensionContext, public connectors : IConnector[]) {
        super(extensionContext);
    }

    getName(): string {
        return "Multi";
    }

    async newConnection() : Promise<SyncConnection> {
        let namedConnectors = new Map<string,IConnector>();
        for(let connector of this.connectors) {
            namedConnectors.set(connector.getName(),connector);
        }
        let choice = await input(async () => await vscode.window.showQuickPick(Array.from(namedConnectors.keys()), {canPickMany : false}));
        let connector = namedConnectors.get(choice)!;
        let connection = await connector.newConnection();
        this.connectorByConnection.set(connection, connector);
        return connection;
    }


    async restoreConnections(): Promise<void> {
        for(let connector of this.connectors) {
            await connector.restoreConnections();
        }
    }

    async disconnect(connection : SyncConnection) : Promise<void> {
        await super.disconnect(connection);
        await this.connectorByConnection.get(connection)?.disconnect(connection);
    }
}