import { ExtensionContext } from "../extensionContext";
import { IEditorListener } from "../sync/iEditorListener";
import { IPeerListener } from "../sync/iPeerListener";
import { IPortalListener } from "../sync/iPortalListener";
import { IRemoteFileListener } from "../sync/iRemoteFileListener";
import { ISyncPortal } from "../sync/iSyncPortal";
import { FileAgeQuery } from "../view/sharing/fileAgeQuery";
import { IFileAgeQuery } from "../view/sharing/iFileAgeQuery";
import { Autosharer } from "./autosharer";
import { BindingStorage } from "./bindingStorage";
import { BufferBindingFactory } from "./bufferBindingFactory";
import { DocumentListener } from "./documentListener";
import { EditorBindingFactory } from "./editorBindingFactory";
import { EditorListener } from "./editorListener";
import { EditorManager } from "./editorManager";
import { IAutosharer } from "./iAutosharer";
import { IBindingStorage } from "./iBindingStorage";
import { IBufferBindingFactory } from "./iBufferBindingFactory";
import { IDocumentListener } from "./iDocumentListener";
import { IEditorManager } from "./iEditorManager";
import { IEditorBindingFactory } from "./iEdtorBindingFactory";
import { IShareLocalToRemote } from "./iShareLocalToRemote";
import { IShareRemoteToLocal } from "./iShareRemoteToLocal";
import { PeerManager } from "./peerManager";
import { PortalListener } from "./portalListener";
import { ShareLocalToRemote } from "./shareLocalToRemote";
import { ShareRemoteToLocal } from "./shareRemoteToLocal";

export class SyncConnection {

    public bindingStorage : IBindingStorage = new BindingStorage();
    public editorManager : EditorManager = new EditorManager(this.bindingStorage);
    public documentListener : DocumentListener = new DocumentListener(this.bindingStorage);
    public bufferBindingFactory : IBufferBindingFactory = new BufferBindingFactory();
    public editorBindingFactory : IEditorBindingFactory = new EditorBindingFactory(this.extensionContext.colorManager);
    public shareLocalToRemote : IShareLocalToRemote = new ShareLocalToRemote(this.documentListener, this.editorManager, this.bindingStorage, this.bufferBindingFactory, this.editorBindingFactory, this.syncPortal);
    public shareRemoteToLocal : ShareRemoteToLocal & IRemoteFileListener = new ShareRemoteToLocal(this.bindingStorage, this.editorManager, this.bufferBindingFactory, this.editorBindingFactory);
    public peerManager : PeerManager = new PeerManager();
    public portalListener : IPortalListener = new PortalListener(this.shareRemoteToLocal, this.peerManager, this.syncPortal);
    public editorListener : EditorListener = new EditorListener(this.bindingStorage);
    public fileAgeQuery : IFileAgeQuery = new FileAgeQuery();
    public autoshare : IAutosharer = new Autosharer(this.syncPortal, this.editorManager, this.bufferBindingFactory, this.editorBindingFactory, this.bindingStorage, this.fileAgeQuery);

    constructor(private extensionContext : ExtensionContext, public syncPortal : ISyncPortal, private name : string, public persistent : boolean) {

    }

    isHost() {
        return this.syncPortal.isHost();
    }

    initialize() {
        this.documentListener.initialize();
        this.editorListener.initialize();
        this.editorManager.initialize();
    }

    getName() : string {
		return this.name;
	}

	getType() : string {
		return this.syncPortal.getType();
	}

    dispose() {
        this.syncPortal.close();
    }
}