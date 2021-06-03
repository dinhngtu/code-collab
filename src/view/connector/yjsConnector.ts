import { BaseConnector } from "./baseConnector";
import { IConnector } from "./iConnector";
import * as vscode from 'vscode';
import { YSyncPortal } from "../../sync/yjs/ySyncPortal";
import { WebsocketProvider } from "y-websocket";
import { unfakeWindow } from "../../base/functions";
import * as Y from 'yjs';

export class YJSConnector extends BaseConnector implements IConnector {
    
    async newConnection(): Promise<void> {
        unfakeWindow();
		let yjsUrl = await this.input(async () => await vscode.window.showInputBox({ prompt: 'Enter the url to the YJS Websocket server' }));
        let yjsRoom = await this.input(async () => await vscode.window.showInputBox({ prompt: 'Enter the YJS Room you wish to join or create' }));
        vscode.window.showInformationMessage('Trying to connect to YJS URL ' + yjsUrl + ' and room '+yjsRoom);
        let doc = new Y.Doc();
        const wsProvider = new WebsocketProvider(yjsUrl, yjsRoom, doc, { WebSocketPolyfill: require('ws') });
        wsProvider.on('status', (event : any) => {
            let status = event.status;
            if(status === "connected") {
                vscode.window.showInformationMessage('Connected to YJS URL ' + yjsUrl + ' and room '+yjsRoom);
            } else {
                vscode.window.showInformationMessage('Connection stringstatus YJS URL ' + yjsUrl + ' and room '+yjsRoom+ " = "+status);
            }
        });
        this.addConnection(yjsUrl+":"+yjsRoom, new YSyncPortal(doc), true);
    
    }

    getName(): string {
        return "YJS";
    }

}