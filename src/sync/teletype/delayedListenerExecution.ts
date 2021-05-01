export type DelayedCall<T> = (listener : T) => void;

export abstract class DelayedListenerExecution<T> {
    private cachedCalls : DelayedCall<T>[] = [];
    private listener : T | null = null;

    executeOnListener(call : DelayedCall<T>) {
        if(this.listener) {
            call(this.listener);
        } else {
            this.cachedCalls.push(call);
        }
    }

    setListener(listener : T) {
        this.listener = listener;
        for(let call of this.cachedCalls) {
            call(this.listener);
        }
        this.cachedCalls=[];
    }
}