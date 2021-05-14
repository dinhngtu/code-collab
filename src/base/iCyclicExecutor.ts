
export interface ICyclicExecutor {
    executeCyclic(call : () => Promise<void>, timeoutInMs : number) : void;
}