import * as vscode from 'vscode';
import { ConnectionManager } from '../../connectionManager';
import { IConnectionManagerListener } from '../../iConnectionManagerListener';
import PortalBinding from '../../PortalBinding';
import { CollaborationTreeElement } from './collaborationTreeElement';
import { ConnectionsTreeElement } from './connectionsTreeElement';
import { ConnectionTreeElement } from './connectionTreeElement';

export class CollaborationTreeDataProvider implements vscode.TreeDataProvider<CollaborationTreeElement>, IConnectionManagerListener {
    
    constructor(private connectionManager : ConnectionManager) {
        this.connectionManager.setListener(this);
    }

    onConnectionAdded(connection: PortalBinding): void {
        this._onDidChangeTreeData.fire();
    }

    private _onDidChangeTreeData: vscode.EventEmitter<CollaborationTreeElement | undefined | null> = new vscode.EventEmitter<CollaborationTreeElement | undefined | null>();

    onDidChangeTreeData: vscode.Event<CollaborationTreeElement | null | undefined> = this._onDidChangeTreeData.event;
    
    getTreeItem(element: CollaborationTreeElement): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: CollaborationTreeElement): vscode.ProviderResult<CollaborationTreeElement[]> {
        if(element) {
            if(element instanceof ConnectionsTreeElement) {
                let connections : ConnectionTreeElement[] = [];
                for(let connection of this.connectionManager.getConnections()) {
                    connections.push(new ConnectionTreeElement(connection));
                }
                return Promise.resolve(connections);
            }
            return Promise.resolve([]);
        } else {
            return Promise.resolve([new ConnectionsTreeElement(this.connectionManager.getConnections().length>0)]);
        }
    }

}