import * as vscode from 'vscode';
import { IColorManager } from '../../color/iColorManager';
import { ConnectionManager } from '../../connectionManager';
import { ExtensionContext } from '../../extensionContext';
import { input } from '../base/viewFunctions';
import { BaseConnector } from './baseConnector';
import { IConnector } from './iConnector';

export class MultiConnector extends BaseConnector implements IConnector{

    constructor(extensionContext : ExtensionContext, public connectors : IConnector[]) {
        super(extensionContext);
    }

    getName(): string {
        return "Multi";
    }

    async newConnection() : Promise<void> {
        let namedConnectors = new Map<string,IConnector>();
        for(let connector of this.connectors) {
            namedConnectors.set(connector.getName(),connector);
        }
        let choice = await input(async () => await vscode.window.showQuickPick(Array.from(namedConnectors.keys()), {canPickMany : false}));
        await namedConnectors.get(choice)?.newConnection();
    }
}