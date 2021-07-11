import { ITimedExecutor } from "./iTimedExecutor";

export class TimedExecutor implements ITimedExecutor {
    executeTimeout(call: () => Promise<void>, timeoutInMs: number): void {
        setTimeout(call, timeoutInMs);
    }
    executeCyclic(call: () => Promise<void>, timeoutInMs: number): void {
        setInterval(call, timeoutInMs);
    }

}