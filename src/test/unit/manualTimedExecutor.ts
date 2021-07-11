import { removeValueFromArray } from "../../base/functions";
import { ITimedExecutor } from "../../base/iTimedExecutor";

type ScheduledCall = {
    call: () => Promise<void>;
    nextTime: number,
    timeout: number
};

export class ManualTimedExecutor implements ITimedExecutor {
    

    private currentTime = 0; 
    private schedules : ScheduledCall[] = [];
    private onceSchedules : ScheduledCall[] = [];

    executeCyclic(call: () => Promise<void>, timeoutInMs: number): void {
        this.schedules.push({call: call, nextTime: this.currentTime + timeoutInMs, timeout: timeoutInMs});
    }

    executeTimeout(call: () => Promise<void>, timeoutInMs: number): void {
        this.onceSchedules.push({call: call, nextTime: this.currentTime + timeoutInMs, timeout: timeoutInMs});
    }

    async cycle(ms : number) {
        this.currentTime+=ms;
        for(let schedule of this.schedules) {
            if(schedule.nextTime<=this.currentTime) {
                schedule.nextTime+=schedule.timeout;
                await schedule.call();
            }
        }

        let toRemove : ScheduledCall[] = [];
        for(let schedule of this.onceSchedules) {
            if(schedule.nextTime<=this.currentTime) {
                await schedule.call();
                toRemove.push(schedule);
            }
        }
        for(let schedule of toRemove) {
            removeValueFromArray(this.onceSchedules,schedule);
        }
    }

}