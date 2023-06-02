'use strict';

import * as vscode from 'vscode';
import { CollaborationTreeDataProvider } from './view/tree/collaborationTreeDataProvider';
import { MultiConnector } from './view/connector/multiConnector';
import { PeerFileDecorationProvider } from './view/tree/peerFileDecorationProvider';
import { ExtensionContext } from './extensionContext';
import { IEditorSync } from './sync/iEditorSync';
import { SharingFileDecorationProvider } from './view/sharing/sharingFileDecorationProvider';
import { SyncConnection } from './binding/syncConnection';
import envPaths from "env-paths";
import { CodeServerConnector } from './view/connector/codeServerConnector';
import { FrontendConnectionViewProvider } from './view/frontendConnection/frontendConnectionViewProvider';
import { UserStorage } from './storage/userStorage';


let extensionContext = ExtensionContext.default();
let shareProvider = new SharingFileDecorationProvider(extensionContext.connectionManager);

export function activate(context: vscode.ExtensionContext) {

	extensionContext.extensionKind = context.extension.extensionKind;
	determineCodeServer(context);

	let extensionMode = context.extension.extensionKind === vscode.ExtensionKind.UI ? "UI" : "Backend";
	console.log("Starting the collaboration extension in mode "+extensionMode+ " CodeServer="+extensionContext.isCodeServer);

	let webViewProvider = new FrontendConnectionViewProvider(extensionContext);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("extension.collabConnection", webViewProvider));

	context.subscriptions.push(vscode.workspace.registerFileSystemProvider("collabfs",extensionContext.collabFs, {isCaseSensitive: true}));

	setupExtension(webViewProvider, extensionContext, context.workspaceState);

	console.log("Completed startup");
}

async function setupExtension(webviewProvider : FrontendConnectionViewProvider, extensionContext : ExtensionContext, workspaceState : vscode.Memento) {
	webviewProvider.showWebview();
	await webviewProvider.awaitConnection();
	vscode.window.registerFileDecorationProvider(new PeerFileDecorationProvider(extensionContext.colorManager));
	vscode.window.registerFileDecorationProvider(shareProvider);

	let userStorage = new UserStorage(workspaceState, extensionContext);
	let codeServerConnector = new CodeServerConnector(userStorage,extensionContext);
	let multiConnector = new MultiConnector(extensionContext, [codeServerConnector]);

	vscode.window.registerTreeDataProvider("extension.collaboration", new CollaborationTreeDataProvider(extensionContext.connectionManager));

	createCommands();

	multiConnector.restoreConnections();

}


function determineCodeServer(context: vscode.ExtensionContext) {
	if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
		if (typeof window !== 'undefined') {
			extensionContext.isCodeServer = true;
		}
	} else {
		let probableCodeServerPath = envPaths("code-server",  { suffix: "" }).data;
		extensionContext.isCodeServer = context.extensionPath.startsWith(probableCodeServerPath);
	}
}

function createCommands() {
	vscode.commands.registerCommand("extension.openCollabFile", (syncConnection: SyncConnection, editorSync: IEditorSync) => {
		syncConnection.shareRemoteToLocal.activateRemoteFile(editorSync);
	});
}

export function deactivate() {
	extensionContext.connectionManager.dispose();
}
