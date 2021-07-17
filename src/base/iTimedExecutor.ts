
export interface ITimedExecutor {
    executeCyclic(call : () => Promise<void>, timeoutInMs : number) : void;
    executeTimeout(call: () => Promise<void>, timeoutInMs : number) : void;
}