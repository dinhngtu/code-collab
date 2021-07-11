import { BaseConnector } from "./baseConnector";
import { IConnector } from "./iConnector";
import * as vscode from 'vscode';
import { YSyncPortal } from "../../sync/yjs/ySyncPortal";
import { WebsocketProvider } from "y-websocket";
import { removeValueFromArray, unfakeWindow } from "../../base/functions";
import { input } from "../base/viewFunctions";
import { ExtensionContext } from "../../extensionContext";
import { SyncConnection } from "../../binding/syncConnection";
import { YjsBaseConnector } from "./yjsBaseConnector";


class YjsConnection {
    constructor(public url : string, public room : string) {

    }
}

const CONNECTION_KEY = "yjs.connections";

export class YJSConnector extends YjsBaseConnector implements IConnector {
    
    constructor(public storage : vscode.Memento, extensionContext : ExtensionContext) {
        super(extensionContext);
    }
    

    async newConnection(): Promise<SyncConnection> {
        unfakeWindow();
		let yjsUrl = await input(async () => await vscode.window.showInputBox({ prompt: 'Enter the url to the YJS Websocket server' }));
        let yjsRoom = await input(async () => await vscode.window.showInputBox({ prompt: 'Enter the YJS Room you wish to join or create' }));
        vscode.window.showInformationMessage('Trying to connect to YJS URL ' + yjsUrl + ' and room '+yjsRoom);
        let connection = await this.connect(yjsUrl, yjsRoom);
        this.store(new YjsConnection(yjsUrl, yjsRoom));
        return connection;
    }

    async restoreConnections(): Promise<void> {
        for(let connection of this.retrieveConnections()) {
            this.connect(connection.url, connection.room);
        }
    }

    async disconnect(connection : SyncConnection) {
        await super.disconnect(connection);
        var connections = this.retrieveConnections();
        for(let existing of connections) {
            if(existing.url+":"+existing.room === connection.getName()) {
                removeValueFromArray(connections, existing);
                break;
            }
        }
        await this.storage.update(CONNECTION_KEY,connections);
    }


    private async store(connection : YjsConnection) : Promise<void> {
        var connections = this.retrieveConnections();
        connections.push(connection);
        await this.storage.update(CONNECTION_KEY,connections);
    }



    private retrieveConnections() {
        var connections = this.storage.get<YjsConnection[]>(CONNECTION_KEY);
        if (!connections) {
            connections = [];
        }
        return connections;
    }

    getName(): string {
        return "YJS";
    }

}