import { Uri } from "vscode";
import { IEditorSync } from "../sync/iEditorSync";
import { IPeerListener } from "../sync/iPeerListener";
import { IPortalListener } from "../sync/iPortalListener";
import { IRemoteFileListener } from "../sync/iRemoteFileListener";
import { ISyncPortal } from "../sync/iSyncPortal";
import { BindingStorage } from "./bindingStorage";
import { BufferBindingFactory } from "./bufferBindingFactory";
import { DocumentListener } from "./documentListener";
import { EditorBindingFactory } from "./editorBindingFactory";
import { EditorManager } from "./editorManager";
import { IBindingStorage } from "./iBindingStorage";
import { IBufferBindingFactory } from "./iBufferBindingFactory";
import { IDocumentListener } from "./iDocumentListener";
import { IEditorManager } from "./iEditorManager";
import { IEditorBindingFactory } from "./iEdtorBindingFactory";
import { IShareLocalToRemote } from "./iShareLocalToRemote";
import { ShareLocalToRemote } from "./shareLocalToRemote";

export class PortalListener implements IPortalListener {


    constructor(private remoteFileListener : IRemoteFileListener, private peerListener : IPeerListener, private syncPortal : ISyncPortal) {
        syncPortal.setListener(this);
    }


    onOpenRemoteFile(peer: string, uniqueUri: string, fileUri: Uri, editorSync: IEditorSync): Promise<void> {
        return this.remoteFileListener.onOpenRemoteFile(peer,uniqueUri, fileUri, editorSync);
    }

    onActivateRemoveFile(editorSync: IEditorSync): Promise<void> {
        console.debug("Ignoring activate, only used by other editors such as atom");
        return Promise.resolve();
    }

    onCloseRemoteFile(editorSync: IEditorSync): Promise<void> {
        return this.remoteFileListener.onCloseRemoteFile(editorSync);
    }

    onPeerJoined(peer: string): Promise<void> {
        return this.peerListener.onPeerJoined(peer);
    }

    onPeerLeft(peer: string): Promise<void> {
        return this.peerListener.onPeerLeft(peer);
    }

    dispose(): void {
        this.syncPortal.close();
    }

}
