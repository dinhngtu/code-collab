import * as vscode from 'vscode';
import { ConnectionManager } from '../../connectionManager';
import { IConnectionManagerListener } from '../../iConnectionManagerListener';
import PortalBinding from '../../PortalBinding';
import { ICollaborationTreeElement } from './iCollaborationTreeElement';
import { ConnectionsTreeElement } from './connectionsTreeElement';
import { ConnectionTreeElement } from './connectionTreeElement';
import { PeerTreeElement } from './peerTreeElement';
import { IPortalBindingListener } from '../../iPortalBindingListener';

export class CollaborationTreeDataProvider implements vscode.TreeDataProvider<ICollaborationTreeElement>, IConnectionManagerListener, IPortalBindingListener {

    private _onDidChangeTreeData: vscode.EventEmitter<ICollaborationTreeElement | undefined | null> = new vscode.EventEmitter<ICollaborationTreeElement | undefined | null>();

    constructor(private connectionManager : ConnectionManager) {
        this.connectionManager.setListener(this);
    }

    onPeerAddedOrRemoved(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    onConnectionAdded(connection: PortalBinding): void {
        connection.setListener(this);
        this._onDidChangeTreeData.fire(undefined);
    }
    
    onDidChangeTreeData: vscode.Event<ICollaborationTreeElement | null | undefined> = this._onDidChangeTreeData.event;
    
    getTreeItem(element: ICollaborationTreeElement): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: ICollaborationTreeElement): vscode.ProviderResult<ICollaborationTreeElement[]> {
        if(element) {
            if(element instanceof ConnectionsTreeElement) {
                let connections : ConnectionTreeElement[] = [];
                for(let connection of this.connectionManager.getConnections()) {
                    connections.push(new ConnectionTreeElement(connection));
                }
                return Promise.resolve(connections);
            } else if(element instanceof ConnectionTreeElement) {
                let connection = element as ConnectionTreeElement;
                let portal = connection.binding;
                let peers : PeerTreeElement[] = [];
                for(let peer of portal.peers) {
                    peers.push(new PeerTreeElement(peer));
                }
                return Promise.resolve(peers);
            }
            return Promise.resolve([]);
        } else {
            return Promise.resolve([new ConnectionsTreeElement(this.connectionManager.getConnections().length>0)]);
        }
    }

}