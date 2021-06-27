import * as vscode from 'vscode';
import { ConnectionManager } from '../../connectionManager';
import { IConnectionManagerListener } from '../../iConnectionManagerListener';
import { ICollaborationTreeElement } from './iCollaborationTreeElement';
import { ConnectionsTreeElement } from './connectionsTreeElement';
import { ConnectionTreeElement } from './connectionTreeElement';
import { PeerTreeElement } from './peerTreeElement';
import { FileTreeElement } from './fileTreeElement';
import { SyncConnection } from '../../binding/syncConnection';
import { IPeerManagementListener } from '../../binding/iPeerManagementListener';
import { IRemoteFileManagementListener } from '../../binding/iRemoteFileManagementListener';

export class CollaborationTreeDataProvider implements vscode.TreeDataProvider<ICollaborationTreeElement>, IConnectionManagerListener, IPeerManagementListener, IRemoteFileManagementListener {

    private _onDidChangeTreeData: vscode.EventEmitter<ICollaborationTreeElement | undefined | null> = new vscode.EventEmitter<ICollaborationTreeElement | undefined | null>();

    constructor(private connectionManager : ConnectionManager) {
        this.connectionManager.setListener(this);
    }

    onPeerAddedOrRemoved(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    onFileAddedOrRemoved() : void {
        this._onDidChangeTreeData.fire(undefined);
    }

    onConnectionAdded(connection: SyncConnection): void {
        connection.shareRemoteToLocal.setListener(this);
        connection.peerManager.setListener(this);
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
                let syncConnection = connection.connection;
                let peers : PeerTreeElement[] = [];
                for(let peer of syncConnection.peerManager.peers) {
                    peers.push(new PeerTreeElement(syncConnection, peer));
                }
                return Promise.resolve(peers);
            } else if(element instanceof PeerTreeElement) {
                let peer = element as PeerTreeElement;
                let files : FileTreeElement[] = [];
                for(let file of peer.syncConnection.shareRemoteToLocal.getFiles(peer.peer)) {
                    files.push(new FileTreeElement(peer.syncConnection, file.editorSync, file.bufferBinding));
                }
                return files;
            }
            return Promise.resolve([]);
        } else {
            return Promise.resolve([new ConnectionsTreeElement(this.connectionManager.getConnections().length>0)]);
        }
    }

}