'use strict';

import * as vscode from 'vscode';
import { CollaborationTreeDataProvider } from './view/tree/collaborationTreeDataProvider';
import { ConnectionManager } from './connectionManager';
import { TeletypeConnector } from './view/connector/teletypeConnector';
import { YJSConnector } from './view/connector/yjsConnector';
import { MultiConnector } from './view/connector/multiConnector';

let connectionManager = new ConnectionManager();

// this method is called when the extension is activated
// the extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Great, your extension "vscode-teletype" is now active!');
	
	let teletypeConnector = new TeletypeConnector(context.workspaceState, connectionManager);
	let yjsConnector = new YJSConnector(connectionManager);
	let multiConnector = new MultiConnector(connectionManager, [yjsConnector, teletypeConnector]);

	vscode.window.registerTreeDataProvider("extension.collaboration", new CollaborationTreeDataProvider(connectionManager));

	vscode.commands.registerCommand("extension.addCollabConnection", async () => {
		try {
			await multiConnector.newConnection();
		} catch(error) {
			await vscode.window.showErrorMessage(error.message);
		}
	});
}


export function deactivate() { }
