import * as path from 'path';

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