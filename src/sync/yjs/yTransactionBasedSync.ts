import { DelayedListenerExecution } from "../teletype/delayedListenerExecution";
import * as Y from 'yjs';

export abstract class YTransactionBasedSync<T> extends DelayedListenerExecution<T> {
    constructor(public doc : Y.Doc, public localPeer : string) {
        super();
    }

    protected transact(f : () => void) {
        this.doc.transact(f, this.localPeer);
    }

    protected guard<S>(f : (event : S, transaction : Y.Transaction) => void) {
        return (event : S, transaction : Y.Transaction) => {
            if(transaction.origin !== this.localPeer) {
                f(event, transaction);
            }
        };
    }
}