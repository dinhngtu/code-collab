import { ICyclicExecutor } from "./iCyclicExecutor";

export class CyclicExecutor implements ICyclicExecutor {
    executeCyclic(call: () => Promise<void>, timeoutInMs: number): void {
        setInterval(call, timeoutInMs);
    }

}