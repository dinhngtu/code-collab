import { Position } from "../data/position";
import { Selection } from "../data/selection";

export class RemoteSelection extends Selection {
    constructor(public peer : string, id : string, start : Position, end : Position, reversed : boolean, isCursor : boolean) {
        super(id,start,end,reversed,isCursor);
    }

    static fromSource(peer : string, source : Selection) : RemoteSelection {
        return new RemoteSelection(peer, source.id, source.start, source.end, source.reversed, source.isCursor);
    }
}