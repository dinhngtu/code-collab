import { Selection } from "../data/selection";
import * as Y from 'yjs';
import { RemoteSelection } from "./remoteSelection";

export interface IRemoteFile {
    peer : string;
    uri : string;
    selections : Y.Array<RemoteSelection>;
    buffer : Y.Text;
    isActive : boolean;
    saveRequests : Y.Array<string>;
}

export class RemoteFileProxy implements IRemoteFile {
    constructor(public delegate : Y.Map<any>) {

    }
    get peer() : string {
        return this.delegate.get("peer");
    }

    set peer(peer : string) {
        this.delegate.set("peer", peer);
    }

    get uri() : string {
        return this.delegate.get("uri");
    }

    set uri(uri : string) {
        this.delegate.set("uri",uri);
    }

    get selections() : Y.Array<RemoteSelection> {
        let selections = this.delegate.get("selections");
        if(selections === undefined) {
            console.warn("Proxy: Selections are undefined");
        }
        return selections;
    }

    set selections(selections : Y.Array<RemoteSelection>) {
        if(selections === undefined) {
            console.error("Proxy: Settings selections to undefined");
        }
        this.delegate.set("selections", selections);
    }

    get buffer() : Y.Text {
        return this.delegate.get("buffer");
    }

    set buffer(buffer : Y.Text) {
        this.delegate.set("buffer", buffer);
    }

    get isActive() : boolean {
        return this.delegate.get("isActive");
    }

    set isActive(isActive : boolean) {
        this.delegate.set("isActive", isActive);
    }

    get saveRequests() : Y.Array<string> {
        return this.delegate.get("saveRequests");
    }

    set saveRequests(saveRequests : Y.Array<string>) {
        this.delegate.set("saveRequests", saveRequests);
    }

}

export class RemoteFile extends Y.Map<any> implements IRemoteFile{


    get peer() : string {
        return this.get("peer");
    }

    set peer(peer : string) {
        this.set("peer", peer);
    }

    get uri() : string {
        return this.get("uri");
    }

    set uri(uri : string) {
        this.set("uri",uri);
    }

    get selections() : Y.Array<RemoteSelection> {
        let selections = this.get("selections");
        if(selections === undefined) {
            console.warn("Proxy: Selections are undefined");
        }
        return selections;
    }

    set selections(selections : Y.Array<RemoteSelection>) {
        if(selections === undefined) {
            console.error("Settings selections to undefined");
        }
        this.set("selections", selections);
    }

    get buffer() : Y.Text {
        return this.get("buffer");
    }

    set buffer(buffer : Y.Text) {
        this.set("buffer", buffer);
    }

    get isActive() : boolean {
        return this.get("isActive");
    }

    set isActive(isActive : boolean) {
        this.set("isActive", isActive);
    }

    get saveRequests() : Y.Array<string> {
        return this.get("saveRequests");
    }

    set saveRequests(saveRequests : Y.Array<string>) {
        this.set("saveRequests", saveRequests);
    }

    constructor(peer : string, uri : string, selections : Y.Array<RemoteSelection>, buffer : Y.Text, isActive : boolean, saveRequests : Y.Array<string> = new Y.Array<string>()) {
        super();
        this.peer = peer;
        this.uri = uri;
        this.selections = selections;
        this.buffer = buffer;
        this.isActive = isActive;
        this.saveRequests = saveRequests;
    }
}
