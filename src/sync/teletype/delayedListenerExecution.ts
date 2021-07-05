export type DelayedCall<T> = (listener : T) => Promise<void>;

export abstract class DelayedListenerExecution<T> {
    private cachedCalls : DelayedCall<T>[] = [];
    private listener : T | null = null;

    async executeOnListener(call : DelayedCall<T>) {
        if(this.listener) {
            await call(this.listener);
        } else {
            this.cachedCalls.push(call);
        }
    }

    async setListener(listener : T) {
        this.listener = listener;
        for(let call of this.cachedCalls) {
            await call(this.listener);
        }
        this.cachedCalls = [];
    }
}