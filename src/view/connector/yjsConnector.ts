import { IConnector } from "./iConnector";
import * as vscode from 'vscode';
import { removeValueFromArray, unfakeWindow } from "../../base/functions";
import { input } from "../base/viewFunctions";
import { ExtensionContext } from "../../extensionContext";
import { SyncConnection } from "../../binding/syncConnection";
import { YjsBaseConnector } from "./yjsBaseConnector";
import { IUserStorage } from "../../storage/iUserStorage";


class YjsConnection {
    constructor(public url : string, public room : string) {

    }
}

const CONNECTION_KEY = "yjs.connections";

export class YJSConnector extends YjsBaseConnector implements IConnector {
    
    constructor(storage : IUserStorage, extensionContext : ExtensionContext) {
        super(storage, extensionContext);
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
        for(let connection of await this.retrieveConnections()) {
            this.connect(connection.url, connection.room);
        }
    }

    async disconnect(connection : SyncConnection) {
        await super.disconnect(connection);
        var connections = await this.retrieveConnections();
        for(let existing of connections) {
            if(existing.url+":"+existing.room === connection.getName()) {
                removeValueFromArray(connections, existing);
                break;
            }
        }
        await this.storage.store(CONNECTION_KEY,connections);
    }


    private async store(connection : YjsConnection) : Promise<void> {
        var connections = await this.retrieveConnections();
        connections.push(connection);
        await this.storage.store(CONNECTION_KEY,connections);
    }



    private async retrieveConnections() {
        var connections = await this.storage.get<YjsConnection[]>(CONNECTION_KEY);
        if (!connections) {
            connections = [];
        }
        return connections;
    }

    getName(): string {
        return "YJS";
    }

}