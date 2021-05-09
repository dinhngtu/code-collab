import { ICyclicExecutor } from "../../base/iCyclicExecutor";

type ScheduledCall = {
    call: () => Promise<void>;
    nextTime: number,
    timeout: number
}

export class ManualCyclicExecutor implements ICyclicExecutor {

    private currentTime = 0; 
    private schedules : ScheduledCall[] = [];

    executeCyclic(call: () => Promise<void>, timeoutInMs: number): void {
        this.schedules.push({call: call, nextTime: this.currentTime + timeoutInMs, timeout: timeoutInMs});
    }

    async cycle(ms : number) {
        this.currentTime+=ms;
        for(let schedule of this.schedules) {
            if(schedule.nextTime<=this.currentTime) {
                schedule.nextTime+=schedule.timeout;
                await schedule.call();
            }
        }
    }

}