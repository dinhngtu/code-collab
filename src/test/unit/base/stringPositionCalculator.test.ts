import * as assert from "assert";
import { StringPositionCalculator } from "../../../base/stringPositionCalculator";
import { Position } from "../../../sync/data/position";


suite("StringPositionCalculator", function () {
    test("Test calculate position in linux endings", function() {
        let text = "Test\nTest2\nTest3";
        let index = 6;
        let position = StringPositionCalculator.indexToLineAndCharacter(text, index);
        assert.strictEqual(position.row, 1);
        assert.strictEqual(position.column, 1);
    });

    test("Test calculate position in windows endings", function() {
        let text = "Test\r\nTest2\r\nTest3";
        let index = 7;
        let position = StringPositionCalculator.indexToLineAndCharacter(text, index);
        assert.strictEqual(position.row, 1);
        assert.strictEqual(position.column, 1);
    });

    test("Test calculate position in osx endings", function() {
        let text = "Test\rTest2\rTest3";
        let index = 6;
        let position = StringPositionCalculator.indexToLineAndCharacter(text, index);
        assert.strictEqual(position.row, 1);
        assert.strictEqual(position.column, 1);
    });

    test("Test calculate index in linux endings", function() {
        let text = "Test\nTest2\nTest3";
        let position = new Position(1,1);
        let index = StringPositionCalculator.lineAndCharacterToIndex(text,position);
        assert.strictEqual(index, 6);
    });

    test("Test calculate index in windows endings", function() {
        let text = "Test\r\nTest2\r\nTest3";
        let position = new Position(1,1);
        let index = StringPositionCalculator.lineAndCharacterToIndex(text,position);
        assert.strictEqual(index, 7);
    });

    test("Test calculate position in osx endings", function() {
        let text = "Test\rTest2\rTest3";
        let position = new Position(1,1);
        let index = StringPositionCalculator.lineAndCharacterToIndex(text,position);
        assert.strictEqual(index, 6);
    });

});