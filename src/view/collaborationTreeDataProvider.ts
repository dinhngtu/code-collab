import * as vscode from 'vscode';
import { CollaborationTreeElement } from './collaborationTreeElement';
import { ConnectionsTreeElement } from './connectionsTreeElement';

export class CollaborationTreeDataProvider implements vscode.TreeDataProvider<CollaborationTreeElement> {
    
    onDidChangeTreeData?: vscode.Event<CollaborationTreeElement | null | undefined> | undefined;
    
    getTreeItem(element: CollaborationTreeElement): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: CollaborationTreeElement): vscode.ProviderResult<CollaborationTreeElement[]> {
        if(element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve([new ConnectionsTreeElement()]);
        }
    }

}