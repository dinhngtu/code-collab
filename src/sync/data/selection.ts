import { Position } from "./position";

export class Selection {
    constructor(public id : string, public start : Position, public end : Position, public reversed : boolean, public isCursor : boolean) {
        
    }
}