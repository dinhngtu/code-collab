import { BaseConnector } from "./baseConnector";
import { IConnector } from "./iConnector";
import * as vscode from 'vscode';
import { YSyncPortal } from "../../sync/yjs/ySyncPortal";
import { WebsocketProvider } from "y-websocket";
import { removeValueFromArray, unfakeWindow } from "../../base/functions";
import * as Y from 'yjs';
import { input } from "../base/viewFunctions";
import { ExtensionContext } from "../../extensionContext";
import { SyncConnection } from "../../binding/syncConnection";


class YjsConnection {
    constructor(public url : string, public room : string) {

    }
}

const CONNECTION_KEY = "yjs.connections";

export class YJSConnector extends BaseConnector implements IConnector {
    
    constructor(public storage : vscode.Memento, extensionContext : ExtensionContext) {
        super(extensionContext);
    }
    

    async newConnection(): Promise<SyncConnection> {
        unfakeWindow();
		let yjsUrl = await input(async () => await vscode.window.showInputBox({ prompt: 'Enter the url to the YJS Websocket server' }));
        let yjsRoom = await input(async () => await vscode.window.showInputBox({ prompt: 'Enter the YJS Room you wish to join or create' }));
        vscode.window.showInformationMessage('Trying to connect to YJS URL ' + yjsUrl + ' and room '+yjsRoom);
        let connection = this.connect(yjsUrl, yjsRoom);
        this.store(new YjsConnection(yjsUrl, yjsRoom));
        return connection;
    }

    private connect(yjsUrl: string, yjsRoom: string) {
        let doc = new Y.Doc();
        const wsProvider = new WebsocketProvider(yjsUrl, yjsRoom, doc, { WebSocketPolyfill: require('ws') });
        wsProvider.on('status', (event: any) => {
            let status = event.status;
            if (status === "connected") {
                vscode.window.showInformationMessage('Connected to YJS URL ' + yjsUrl + ' and room ' + yjsRoom);
            } else {
                vscode.window.showInformationMessage('Connection stringstatus YJS URL ' + yjsUrl + ' and room ' + yjsRoom + " = " + status);
            }
        });
        return this.addConnection(yjsUrl + ":" + yjsRoom, new YSyncPortal(doc));
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