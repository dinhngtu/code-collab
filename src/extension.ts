'use strict';

import * as vscode from 'vscode';
import { Portal, TeletypeClient } from '@atom/teletype-client';
import PortalBinding from './PortalBinding';
import { TeletypeSyncPortal } from './sync/teletype/teletypeSyncPortal';


const fetch = require('node-fetch');
const constants = require('./constants');
const globalAny: any = global;
const wrtc = require('wrtc');

globalAny.window = {};
globalAny.window = global;
globalAny.window.fetch = fetch;
globalAny.RTCPeerConnection = wrtc.RTCPeerConnection;

var activePortal : Portal | null = null;

// this method is called when the extension is activated
// the extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Great, your extension "vscode-teletype" is now active!');
	addJoinCommand(context);

	addCreateCommand(context);
}

function addCreateCommand(context: vscode.ExtensionContext) {
	let createCommand = vscode.commands.registerCommand('extension.create-portal', async () => {
		await createPortal();
	});
	context.subscriptions.push(createCommand);
}

function addJoinCommand(context: vscode.ExtensionContext) {
	let joinCommand = vscode.commands.registerCommand('extension.join-portal', async () => {

		let portalIdInput = await getPortalID();
		if (!portalIdInput) {
			vscode.window.showInformationMessage("No Portal ID has been entered. Please try again");
		}
		else {
			vscode.window.showInformationMessage('Trying to Join Portal with ID' + ' ' + portalIdInput + ' ');
			await joinPortal(portalIdInput);
		}

	});
	context.subscriptions.push(joinCommand);
}

async function getPortalID() {
	let portalID = await vscode.window.showInputBox({ prompt: 'Enter ID of the Portal you wish to join' });
	return portalID;
}

function closeActivePortal() {
	if(activePortal !== null) {
		vscode.window.showInformationMessage('Closing Portal with ID' + ' ' + (activePortal as any).id);
		activePortal.dispose();
		activePortal = null;
	}
}


async function joinPortal(portalId: any) {
	let client = await getAuthenticatedClient();
	if(client) {
		try {
			closeActivePortal();
			let portal = await client.joinPortal(portalId);
			activePortal = portal;
			vscode.window.showInformationMessage('Joined Portal with ID' + ' ' + portalId + ' ');
			await createBindingForPortal(client, portal, false);
		} catch (error) {
			vscode.window.showErrorMessage('Unable to join the Portal with ID' + ' ' + portalId + ' error='+error);
		}
	}	
}

async function createPortal() {
	let client = await getAuthenticatedClient();
	if(client) {
		try {
			closeActivePortal();
			let portal : any = await client.createPortal();
			activePortal = portal;
			vscode.window.showInputBox({ prompt: 'Created portal with ID', value: portal.id});
			await createBindingForPortal(client, portal, true);
		} catch (error) {
			vscode.window.showErrorMessage('Unable to create a Portal with ID error='+error);
		}
	}
}

async function createBindingForPortal(client: TeletypeClient, portal: Portal, isHost : boolean) {
	let portal_binding = new PortalBinding(new TeletypeSyncPortal(portal), isHost);
	await portal_binding.initialize();
}

async function getAuthenticatedClient() {
	if (constants.AUTH_TOKEN !== '') {
		try {
			let client = new TeletypeClient({
				pusherKey: constants.PUSHER_KEY,
				pusherOptions: {
					cluster: constants.PUSHER_CLUSTER
				},
				baseURL: constants.API_URL_BASE,
			}
			);

			await client.initialize();
			await client.signIn(constants.AUTH_TOKEN);
			return client;
		} catch (e) {
			console.log("Exception Error Message " + e);
		}
	}
	else {
		vscode.window.showErrorMessage("GitHub Auth Token. Please provide it in the constants.ts file");
	}
	return null;
}

export function deactivate() { }
