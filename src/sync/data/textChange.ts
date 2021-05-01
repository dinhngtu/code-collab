import { Position } from "./position";

export enum TextChangeType {
    INSERT, UPDATE, DELETE
}

export class TextChange {

    constructor(public type : TextChangeType, public start : Position, public end : Position, public text : string) {

    }
}