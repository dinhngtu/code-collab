'use strict';

import * as vscode from 'vscode';
import { CollaborationTreeDataProvider } from './view/tree/collaborationTreeDataProvider';
import { ConnectionManager } from './connectionManager';
import { TeletypeConnector } from './view/connector/teletypeConnector';
import { YJSConnector } from './view/connector/yjsConnector';
import { MultiConnector } from './view/connector/multiConnector';
import { PeerFileDecorationProvider } from './view/tree/peerFileDecorationProvider';
import { ColorManager } from './color/colorManager';

let connectionManager = new ConnectionManager();
let colorManager = new ColorManager();

// this method is called when the extension is activated
// the extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Great, your extension "vscode-teletype" is now active!');
	
	vscode.window.registerFileDecorationProvider(new PeerFileDecorationProvider(colorManager));

	let teletypeConnector = new TeletypeConnector(context.workspaceState, connectionManager, colorManager);
	let yjsConnector = new YJSConnector(connectionManager, colorManager);
	let multiConnector = new MultiConnector(connectionManager, colorManager, [yjsConnector, teletypeConnector]);

	vscode.window.registerTreeDataProvider("extension.collaboration", new CollaborationTreeDataProvider(connectionManager));

	vscode.commands.registerCommand("extension.addCollabConnection", async () => {
		try {
			await multiConnector.newConnection();
		} catch(error) {
			await vscode.window.showErrorMessage(error.message);
		}
	});
}


export function deactivate() { 
	connectionManager.dispose();
}
