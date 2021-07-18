import * as vscode from 'vscode';import { ExtensionContext } from '../../extensionContext';
import { v4 } from 'uuid';
import { MockableApis } from '../../base/mockableApis';

export class FrontendConnectionViewProvider implements vscode.WebviewViewProvider {

    public resolver : (() => void) | null = null;

	constructor(public extensionContext : ExtensionContext) {
        
    }

    awaitConnection() : Promise<void> {
        if(this.extensionContext.userid !== null) {
            return Promise.resolve();
        } else {
            return new Promise((resolve,reject)=> {
                this.resolver = resolve;
            });
        }
    }

    private view : vscode.WebviewView | null = null;

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true
		};
		webviewView.webview.onDidReceiveMessage(data => {
			if(data.type === "connection") {
                console.log("Got connection event from frontend by userid "+data.userid);
				vscode.commands.executeCommand('setContext', 'ext.connected', true);
                this.extensionContext.userid = data.userid;
                if(this.resolver !== null) {
                    this.resolver();
                }
			}
		});
        let newUid = v4();
		webviewView.webview.html = `<html><head>
		</head><body>Transmitting userid to backend...
		<script>
				const vscode = acquireVsCodeApi();
                let userid = window.localStorage.getItem("userid");
                if(!userid) {
                    userid = "`+newUid+`";
                    window.localStorage.setItem("userid",userid);
                } 
                vscode.postMessage({type: "connection", userid: userid});
			</script>
		</html>`;
        this.view = webviewView;
	}

    async showWebview() {
        vscode.commands.executeCommand("extension.collabConnection.focus");
        if(this.view !== null) {
            this.view.show(true);
            MockableApis.executor.executeTimeout(() => this.checkIfWebviewHasShown(), 2000);
        } else {
            MockableApis.executor.executeTimeout(() => this.showWebview(), 100);
        }
    }

    async checkIfWebviewHasShown() {
        if(this.view !== null && this.extensionContext.userid === null && this.resolver) {
            console.warn("Appearently webviews don't work, cannot assign userid");
            this.extensionContext.userid = "unknown";
            vscode.commands.executeCommand('setContext', 'ext.connected', true);
            this.resolver();
        } 
    }

}