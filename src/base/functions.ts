import * as path from 'path';
const globalAny: any = global;
const wrtc = require('wrtc');
const fetch = require('node-fetch');

export function fileUrl(str : string) {	
    var pathName = path.resolve(str).replace(/\\/g, '/');

    if (pathName[0] !== '/') {
        pathName = '/' + pathName;
    }

    return encodeURI('file://' + pathName);
}

export function sleep(ms : number) : Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

export function fakeWindow() {
	globalAny.window = {};
	globalAny.window = global;
	globalAny.window.fetch = fetch;
	globalAny.RTCPeerConnection = wrtc.RTCPeerConnection;
}

export function unfakeWindow() {
	globalAny.window = undefined;
}

export function removeValueFromArray<T>(array : T[], value : T) {
    let index = array.indexOf(value);
    if(index>=0) {
        array.splice(index,1);
    }
}
