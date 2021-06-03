import * as vscode from 'vscode'
import { MockableApis } from '../../base/mockableApis'
import { ConnectionManager } from '../../connectionManager';
import { BaseConnector } from './baseConnector';
import { IConnector } from './iConnector';

export class MultiConnector extends BaseConnector implements IConnector{

    constructor(connectionManager : ConnectionManager, public connectors : IConnector[]) {
        super(connectionManager);
    }

    getName(): string {
        return "Multi";
    }

    async newConnection() : Promise<void> {
        let namedConnectors = new Map<string,IConnector>();
        for(let connector of this.connectors) {
            namedConnectors.set(connector.getName(),connector);
        }
        let choice = await this.input(async () => await vscode.window.showQuickPick(Array.from(namedConnectors.keys()), {canPickMany : false}));
        await namedConnectors.get(choice)?.newConnection();
    }
}