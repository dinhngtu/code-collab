import * as vscode from 'vscode';

import { IEditorListener } from './sync/iEditorListener';
import { Selection } from './sync/data/selection';
import { Position } from './sync/data/position';
import { IEditorSync } from './sync/iEditorSync';
import { IColorManager } from './color/iColorManager';

interface SiteDecoration {
	cursorDecoration: vscode.TextEditorDecorationType;
	selectionDecoration: vscode.TextEditorDecorationType;
}

export default class EditorBinding implements IEditorListener{
	private disposed!: boolean;
	private decorationByPeerId: Map<string, SiteDecoration>;

	constructor(
		public editor : vscode.TextEditor, public editorSync : IEditorSync, private colorManager : IColorManager) {
		this.decorationByPeerId = new Map();
		this.editorSync.setListener(this);
	}

	dispose() {
		this.disposed = true;
	}

	isDisposed() {
		return this.disposed;
	}

	onSelectionsChangedForPeer(peerid : string, selections : Selection[]) : Promise<void> {
		console.log("Remote selections changed");
		let selectionRanges: vscode.Range[] = [];
		let cursorRanges: vscode.Range[] = [];

		for(let selection of selections) {
			if(selection.isCursor) {
				cursorRanges.push(new vscode.Range(this.convertSyncPosition(selection.start), this.convertSyncPosition(selection.end)));
			} else {
				selectionRanges.push(new vscode.Range(this.convertSyncPosition(selection.start), this.convertSyncPosition(selection.end)));
			}
		}

		let peerDecoration = this.findPeerDecoration(peerid);
		this.updateDecorations(peerDecoration, cursorRanges, selectionRanges);

		return Promise.resolve();
	}

	updateSelections(selections: readonly vscode.Selection[]) {
		var index = 0;
		let remoteSelections : Selection[] = [];
		for(let selection of selections) {
			remoteSelections.push(new Selection(index+"",this.convertVSCodePosition(selection.start), this.convertVSCodePosition(selection.end), selection.isReversed, this.isCursor(selection)));
			index++;
		}
		this.editorSync.sendSelectionsToRemote(remoteSelections);
	}


	private updateDecorations(peerDecoration: SiteDecoration, cursorRanges: vscode.Range[], selectionRanges: vscode.Range[]) {
		const { cursorDecoration, selectionDecoration } = peerDecoration;
		this.editor.setDecorations(cursorDecoration, cursorRanges);
		this.editor.setDecorations(selectionDecoration, selectionRanges);
	}

	private findPeerDecoration(peerId: string) {
		let siteDecoration = this.decorationByPeerId.get(peerId);
		if (!siteDecoration) {
			siteDecoration = this.createDecorationFromPeerId(peerId);
			this.decorationByPeerId.set(peerId, siteDecoration);
		}
		return siteDecoration;
	}

	private convertVSCodePosition(position: vscode.Position): Position {
		return new Position(position.line, position.character);
	}

	private convertSyncPosition(position: Position): vscode.Position {
		return new vscode.Position(
			position.row,
			position.column
		);
	}

	private createDecorationFromPeerId(peerId: string): SiteDecoration {
		const selectionDecorationRenderOption: vscode.DecorationRenderOptions = {
			backgroundColor: this.colorManager.getColorString(peerId)
		};

		const curosrDecorationRenderOption: vscode.DecorationRenderOptions = {
			border: 'solid '+this.colorManager.getColorString(peerId),
			borderWidth: '5px 1px 5px 1px'
		};

		const create = vscode.window.createTextEditorDecorationType;

		return {
			selectionDecoration: create(selectionDecorationRenderOption),
			cursorDecoration: create(curosrDecorationRenderOption)
		};
	}



	private isCursor(selection: vscode.Selection): boolean {
		return (
			selection.start.character === selection.end.character &&
			selection.start.line === selection.end.line
		);
	}
}
