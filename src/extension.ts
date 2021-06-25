'use strict';

import * as vscode from 'vscode';
import { CollaborationTreeDataProvider } from './view/tree/collaborationTreeDataProvider';
import { TeletypeConnector } from './view/connector/teletypeConnector';
import { YJSConnector } from './view/connector/yjsConnector';
import { MultiConnector } from './view/connector/multiConnector';
import { PeerFileDecorationProvider } from './view/tree/peerFileDecorationProvider';
import { ExtensionContext } from './extensionContext';
import { IEditorSync } from './sync/iEditorSync';
import PortalBinding from './PortalBinding';

let extensionContext = ExtensionContext.default();

// this method is called when the extension is activated
// the extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Great, your extension "vscode-teletype" is now active!');
	
	context.subscriptions.push(vscode.workspace.registerFileSystemProvider("collabfs",extensionContext.collabFs, {isCaseSensitive: true}));

	vscode.window.registerFileDecorationProvider(new PeerFileDecorationProvider(extensionContext.colorManager));

	let teletypeConnector = new TeletypeConnector(context.workspaceState, extensionContext);
	let yjsConnector = new YJSConnector(extensionContext);
	let multiConnector = new MultiConnector(extensionContext, [yjsConnector, teletypeConnector]);

	vscode.window.registerTreeDataProvider("extension.collaboration", new CollaborationTreeDataProvider(extensionContext.connectionManager));

	vscode.commands.registerCommand("extension.addCollabConnection", async () => {
		try {
			await multiConnector.newConnection();
		} catch(error) {
			await vscode.window.showErrorMessage(error.message);
		}
	});

	vscode.commands.registerCommand("extension.openCollabFile", (portalBinding : PortalBinding, editorSync : IEditorSync) => {
		portalBinding.activateRemoteFile(editorSync);
	});
}


export function deactivate() { 
	extensionContext.connectionManager.dispose();
}
