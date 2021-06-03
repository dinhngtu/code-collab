import { BaseConnector } from "./baseConnector";
import { IConnector } from "./iConnector";
import * as vscode from 'vscode';
import { ConnectionManager } from "../../connectionManager";
import { Portal, TeletypeClient } from "@atom/teletype-client";
import { TeletypeSyncPortal } from "../../sync/teletype/teletypeSyncPortal";
import { fakeWindow } from "../../base/functions";

export class TeletypeConnection {
    public url = 'https://api.teletype.atom.io';
    public pusherKey = 'f119821248b7429bece3';
    public pusherCluster = 'mt1';
    public authToken = '';

}

export class TeletypeConnector extends BaseConnector implements IConnector {

    constructor(public storage : vscode.Memento, connectionManager : ConnectionManager) {
        super(connectionManager);
    }

    async newConnection(): Promise<void> {

        fakeWindow();

        let client = await this.inputConnection();

        await this.connectToPortal(client);
        
    }

    private async connectToPortal(client: TeletypeClient) {
        let choice = await this.input(async () => vscode.window.showQuickPick(["Create Portal", "Join Portal"], { canPickMany: false }));
        let portal: Portal;
        let host: boolean;
        if (choice === "Create Portal") {
            portal = await this.createPortal(client);
            host = true;
        } else {
            portal = await this.joinPortal(client);
            host = false;
        }
        this.addConnection(portal.id, new TeletypeSyncPortal(portal), host);
    }

    private async joinPortal(client: TeletypeClient) {
        let portalID = await this.input(async () => await vscode.window.showInputBox({ prompt: 'Enter ID of the Portal you wish to join' }));
        vscode.window.showInformationMessage('Trying to Join Portal with ID' + ' ' + portalID + ' ');
        let portal = await client.joinPortal(portalID);
        vscode.window.showInformationMessage('Joined Portal with ID' + ' ' + portalID + ' ');
        return portal;
    }

    private async createPortal(client: TeletypeClient) {
        vscode.window.showInformationMessage('Creating portal');
        let portal = await client.createPortal();
        vscode.window.showInputBox({ prompt: 'Created portal with ID', value: portal.id });
        return portal;
    }

    private async inputConnection() {
        let existingConnections = this.storage.get<TeletypeConnection[]>("teletype.connections");
        var selectedConnection: TeletypeConnection | undefined;
        if (existingConnections) {
            selectedConnection = await this.selectConnection(existingConnections, selectedConnection);
        } else {
            existingConnections = [];
        }
        var save = false;
        if (!selectedConnection) {
            selectedConnection = await this.inputNewConnection(existingConnections);
            save = true;
        }

        let client = await this.connect(selectedConnection!);

        if (save) {
            this.storage.update("teletype.connections", existingConnections);
        }
        return client;
    }

    private async connect(selectedConnection: TeletypeConnection) {
        let client = new TeletypeClient({
            pusherKey: selectedConnection.pusherKey,
            pusherOptions: {
                cluster: selectedConnection.pusherCluster
            },
            baseURL: selectedConnection.url,
        }
        );

        await client.initialize();
        await client.signIn(selectedConnection.authToken);
        return client;
    }

    private async inputNewConnection(existingConnections: TeletypeConnection[]) {
        let selectedConnection = new TeletypeConnection();
        selectedConnection.url = await this.input(async () => await vscode.window.showInputBox({ prompt: 'Enter teletype url', value: selectedConnection.url, valueSelection: [0, selectedConnection.url.length] }));
        selectedConnection.pusherKey = await this.input(async () => await vscode.window.showInputBox({ prompt: 'Enter Pusher Key', value: selectedConnection.pusherKey, valueSelection: [0, selectedConnection.pusherKey.length] }));
        selectedConnection.pusherCluster = await this.input(async () => await vscode.window.showInputBox({ prompt: 'Enter Pusher Cluster', value: selectedConnection.pusherCluster, valueSelection: [0, selectedConnection.pusherCluster.length] }));
        selectedConnection.authToken = await this.input(async () => await vscode.window.showInputBox({ prompt: 'Enter OAuth Token', value: selectedConnection.authToken, valueSelection: [0, selectedConnection.authToken.length] }));
        existingConnections.push(selectedConnection);
        return selectedConnection;
    }

    private async selectConnection(existingConnections: TeletypeConnection[], selectedConnection: TeletypeConnection | undefined) {
        let namedConnections = new Map<string, TeletypeConnection>();
        for (let connection of existingConnections) {
            namedConnections.set(connection.url, connection);
        }
        let names = Array.from(namedConnections.keys());
        names.push("New...");

        let choice = await this.input(async () => await vscode.window.showQuickPick(names, { canPickMany: false }));
        if (choice !== "New...") {
            selectedConnection = namedConnections.get(choice);
        }
        return selectedConnection;
    }

    getName(): string {
        return "Teletype";
    }

}