import { sleep } from "../base/functions";

export async function pollNotEqual(timeoutInMs : number, expected : any, actual : () => any) {
    // in most cases this is a string vs. a buffer, and we want that comparison to work
    // tslint:disable-next-line: triple-equals
    await poll(timeoutInMs, "Expected: |"+expected+"| Actual: |"+actual()+"|", () => expected != actual());
}

export async function pollEqual(timeoutInMs : number, expected : any, actual : () => any) {
    // in most cases this is a string vs. a buffer, and we want that comparison to work
    // tslint:disable-next-line: triple-equals
    await poll(timeoutInMs, "Expected: |"+expected+"| Actual: |"+actual()+"|", () => expected == actual());
}


export async function poll(timeoutInMs : number, message : string, check : () => boolean) {
    var waited = 0;
    while(!check() && waited <= timeoutInMs) {
        await sleep(10);
        waited+=10;
    }
    if(waited>timeoutInMs) {
        throw new Error(message);
    }
}
