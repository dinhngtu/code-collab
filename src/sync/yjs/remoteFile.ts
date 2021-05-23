import { Selection } from "../data/selection";
import * as Y from 'yjs';
import { RemoteSelection } from "./remoteSelection";

export class RemoteFile extends Y.Map<any> {


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
        return this.get("selections");
    }

    set selections(selections : Y.Array<RemoteSelection>) {
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
