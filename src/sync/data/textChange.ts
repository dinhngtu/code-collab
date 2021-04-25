import { Position } from "./position";

export class TextChange {
    constructor(public start : Position, public end : Position, public text : string) {

    }
}