import { Position } from "../sync/data/position";

export class StringPositionCalculator {
    
    static lineAndCharacterToIndex(text: string, position: Position) : number {
        var line = 0;
        var character = 0;

        for(let i = 0;i<text.length;i++) {
            if(text.charAt(i)==='\r') {
                if(!(i+1<text.length && text.charAt(i+1) === '\n')) {
                    line++;
                    character=0;
                }
            } else if(text.charAt(i)==='\n') {
                line++;
                character=0;
            } else {
                character++;
            }
            
            if(line === position.row && character === position.column) {
                return i;
            }
        }
        return text.length;
    }

    static indexToLineAndCharacter(text : string, position: number): Position {
        var line = 0;
        var character = 0;

        for(let i = 0;i<Math.min(text.length, position+1);i++) {
            if(text.charAt(i)==='\r') {
                if(!(i+1<text.length && text.charAt(i+1) === '\n')) {
                    line++;
                    character=0;
                }
            } else if(text.charAt(i)==='\n') {
                line++;
                character=0;
            } else {
                character++;
            }
        }
        return new Position(line, character);
    }
}