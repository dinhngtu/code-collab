import { SyncConnection } from "../../binding/syncConnection";
import * as vscode from 'vscode';
import { YjsBaseConnector } from "./yjsBaseConnector";
import envPaths from "env-paths";
import * as YAML from 'yaml';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import { URL } from "url";

export class CodeServerConnector extends YjsBaseConnector {

    private testing = true;

    async newConnection(): Promise<SyncConnection> {
        throw new Error("New Connections are not supported");
    }

    getName(): string {
        return "code-server";
    }

    async restoreConnections(): Promise<void> {
        if (this.extensionContext.isCodeServer || this.testing) {
            let baseUrl = this.determineBaseUrl();
            if (await this.isBackendPluginInstalled(baseUrl)) {
                console.debug("Connecting to " + baseUrl);
                let connection = await this.connect(baseUrl + "/collab/yjs", "collab", "code-server");
                connection.autoshare.enable();
            } else {
                console.warn("code-server was detected (tried " + baseUrl + ") but cannot be used for collaboration, please install https://github.com/kainzpat14/code-server-collab");
            }

        } else {
            console.debug("Don't connect to code-server, as we are not running on code-server");
        }
    }

    private isBackendPluginInstalled(baseUrl: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let [requester, url, options] = this.getBackendTester(baseUrl);
            let req = requester.request(url, options, (res: any) => {
                if (res.statusCode) {
                    if (res.statusCode < 200 || res.statusCode > 300) {
                        resolve(false);
                    }
                    resolve(true);
                }
            });
            req.on('error', (err: any) => {
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

    async disconnect(syncConnection: SyncConnection) {
        throw new Error("Delete not supported");
    }

    private determineBaseUrl() {
        let baseUrl;
        if (process.env.CODE_COLLAB_BASEURL) {
            baseUrl = process.env.CODE_COLLAB_BASEURL;
        } else if (this.extensionContext.extensionKind === vscode.ExtensionKind.Workspace || this.testing) {
            let paths = envPaths("code-server", { suffix: "" });
            let configFile = paths.config + "/config.yaml";
            if (fs.existsSync(configFile)) {
                const content = fs.readFileSync(configFile).toString();
                let parsed = YAML.parse(content);
                let address = parsed["bind-addr"] as string;
                var protocol = "ws";
                if (parsed["cert"] === true) {
                    protocol = "wss";
                }
                baseUrl = protocol + "://" + address.replace("0.0.0.0", "127.0.0.1");
            } else {
                throw new Error("Code-server is installed, but could not find config.yaml");
            }
        } else {
            baseUrl = window.location.protocol.replace("http", "ws") + '//' + window.location.host + window.location.pathname;
        }
        return baseUrl;
    }

    private getBackendTester(_baseUrl: string): [typeof http | typeof https, string | URL, https.RequestOptions] {
        let baseUrl = new URL(_baseUrl);
        if (baseUrl.protocol == "ws+unix:") {
            let options = {
                socketPath: baseUrl.pathname.split(":")[0],
            };
            return [http, "http://localhost/collab", options];
        } else {
            let requester: typeof http | typeof https;
            if (baseUrl.protocol == "ws:") {
                requester = http;
                baseUrl.protocol = "http:"
            } else {
                requester = https;
                baseUrl.protocol = "https:"
            }
            return [requester, new URL("/collab", baseUrl), {}];
        }
    }
}
