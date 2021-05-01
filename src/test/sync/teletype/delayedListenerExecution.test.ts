import * as assert from 'assert';
import { DelayedListenerExecution } from '../../../sync/teletype/delayedListenerExecution';

class FakeDelayedListenerExecution extends DelayedListenerExecution<any> {

    count : number = 0;

    doExecution() {
        this.executeOnListener((_) => {
            this.count++;
        });
    }
}


suite("DelayedListenerExecution", function () {
    test("Test cache execution until set", function() {
        let execution = new FakeDelayedListenerExecution();
        execution.doExecution();
        assert.strictEqual(execution.count, 0);
        execution.setListener({});
        assert.strictEqual(execution.count, 1);
    });

    test("Test cache execution after already set", function() {
        let execution = new FakeDelayedListenerExecution();
        execution.setListener({});
        execution.doExecution();
        assert.strictEqual(execution.count, 1);
    });
});