import { WebsocketProvider } from "y-websocket";
import { BaseConnector } from "./baseConnector";
import * as Y from 'yjs';
import * as vscode from 'vscode';
import { YSyncPortal } from "../../sync/yjs/ySyncPortal";
import { IUserStorage } from "../../storage/iUserStorage";
import { ExtensionContext } from "../../extensionContext";
import { input } from "../base/viewFunctions";

export abstract class YjsBaseConnector extends BaseConnector {

    constructor(protected storage : IUserStorage, extensionContext : ExtensionContext) {
        super(extensionContext);
    }

    protected async connect(yjsUrl: string, yjsRoom: string, name : string = yjsUrl + ":" + yjsRoom) {
        let displayName = await this.getDisplayName();
        let doc = new Y.Doc();
        const wsProvider = new WebsocketProvider(yjsUrl, yjsRoom, doc, { WebSocketPolyfill: require('ws') });
        let promise = new Promise<void>((resolve,reject) => {
            wsProvider.on('status', (event: any) => {
                let status = event.status;
                if (status === "connected") {
                    console.debug('Connected to YJS URL ' + yjsUrl + ' and room ' + yjsRoom);
                    vscode.window.showInformationMessage('Connected to YJS URL ' + yjsUrl + ' and room ' + yjsRoom);
                    resolve();
                } else {
                    vscode.window.showInformationMessage('Connection YJS URL ' + yjsUrl + ' and room ' + yjsRoom + " (status= " + status+")");
                }
            });
        });
        await promise;
        return this.addConnection(name, new YSyncPortal(doc, displayName));
    }

    private async getDisplayName() : Promise<string> {
        if(this.extensionContext.userid !== "unknown") {
            let displayName = await this.storage.get<string>("collab.displayName");
            if (!displayName) {
                displayName = await input(async () => await vscode.window.showInputBox({ prompt: 'Please enter a name to use for collaboration' }));
                await this.storage.store("collab.displayName", displayName);
            }
            return displayName;
        } else {
            return "unknown";
        }
    }
}