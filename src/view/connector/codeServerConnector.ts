import { SyncConnection } from "../../binding/syncConnection";
import { BaseConnector } from "./baseConnector";
import * as vscode from 'vscode';
import { YjsBaseConnector } from "./yjsBaseConnector";
import envPaths = require("env-paths");
import { config } from "process";
import * as YAML from 'yaml';
import * as fs from 'fs';
import * as http from 'http';

export class CodeServerConnector extends YjsBaseConnector {

    private testing = true;

    async newConnection(): Promise<SyncConnection> {
        throw new Error("New Connections are not supported");
    }

    getName(): string {
        throw new Error("code-server");
    }

    async restoreConnections(): Promise<void> {
        if(this.extensionContext.isCodeServer || this.testing) {
            let baseUrl = await this.determineBaseUrl();
            if(await this.isBackendPluginInstalled(baseUrl)) {
                let connection = await this.connect(baseUrl+"/collab/yjs", "collab", "code-server");
                connection.autoshare.enable();
            } else {
                console.warn("code-server was detected but cannot be used for collaboration, please install https://github.com/kainzpat14/code-server-collab");
            }
            
        } else {
            console.log("Don't connect to code-server, as we are not running on code-server");
        }
    }

    private isBackendPluginInstalled(baseUrl: string) : Promise<boolean> {
        return new Promise((resolve, reject) => {
            let httpBaseUrl = baseUrl.replace("ws://","http://").replace("wss://","https://");
            let req = http.request(httpBaseUrl+"/collab", (res) => {
                if(res.statusCode) {
                    if(res.statusCode < 200 || res.statusCode > 300) {
                        resolve(false);
                    }
                    resolve(true);
                }
            });
            req.on('error', (err) => {
                console.error(err);
                resolve(false);
            });
            req.end();
        });
    }

    

    supportsDisconnect() {
        return false;
    }

    supportsNewConnection() {
        return false;
    }

    async disconnect(syncConnection : SyncConnection) {
        throw new Error("Delete not supported");
    }

    private async determineBaseUrl() {
        let baseUrl;
        if (this.extensionContext.extensionKind === vscode.ExtensionKind.Workspace || this.testing) {
            baseUrl = await this.parseBaseUrl();
        } else {
            baseUrl = window.location.protocol.replace("http","ws") + '//' + window.location.host + window.location.pathname;
        }
        return baseUrl;
    }

    private async parseBaseUrl(): Promise<string> {
        let paths = envPaths("code-server",{suffix: ""});
        let configFile = paths.config+"/config.yaml";
        if(fs.existsSync(configFile)) {
            const content = fs.readFileSync(configFile).toString();
            let parsed = YAML.parse(content);
            let address = parsed["bind-addr"] as string;
            return "ws://"+address.replace("0.0.0.0","127.0.0.1");
        } else {
            throw new Error("Code-server is installed, but could not find config.yaml");
        }
    }

}