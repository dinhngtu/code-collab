/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import * as path from 'path';
import * as vscode from 'vscode';
import { BufferCache } from '../cache/bufferCache';

export class CollaborationFile implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    name: string;
    data: string = "";

    constructor(public bufferCache : BufferCache, name: string) {
        this.type = vscode.FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
    }


    getData() : Uint8Array {
        return Buffer.from(this.bufferCache.text);
    }

    isClosed() : boolean {
        return this.bufferCache.isClosed;
    }
}

export class CollaborationDirectory implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    name: string;
    entries: Map<string, CollaborationFile | CollaborationDirectory>;

    constructor(name: string) {
        this.type = vscode.FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.entries = new Map();
    }

}

export type Entry = CollaborationFile | CollaborationDirectory;

//Based on vscode examples MemFs
export class CollaborationFs implements vscode.FileSystemProvider {

    root = new CollaborationDirectory('');

    constructor(public urlBase : string) {

    }

    registerBufferCache(providertype : string, provider : string, uri : string, cache : BufferCache) : vscode.Uri {
        let lowerprovidertype = providertype.toLowerCase();
        let lowerprovider = provider.toLowerCase().replace(/\//g,"_");
        var path = this.urlBase+"://"+lowerprovidertype+"/"+lowerprovider+"/";
        var current = this.navigateAndCreate(this.root, lowerprovidertype);
        current = this.navigateAndCreate(current, lowerprovider);
        let parts = uri.split(new RegExp("[\\/]"));
        for(let i = 0;i<parts.length-1;i++) {
            if(parts[i]) {
                path+=parts[i]+"/";
                current = this.navigateAndCreate(current, parts[i]);
            }
        }
        let filename = parts[parts.length-1];
        current.entries.set(filename, new CollaborationFile(cache, filename));
        return vscode.Uri.parse(path+filename);
    }

    private navigateAndCreate(currentNode : CollaborationDirectory, next : string) : CollaborationDirectory {
        if(!currentNode.entries.has(next)) {
            currentNode.entries.set(next, new CollaborationDirectory(next));
        }
        return currentNode.entries.get(next) as CollaborationDirectory;
    }

    // --- manage file metadata

    stat(uri: vscode.Uri): vscode.FileStat {
        return this._lookup(uri, false);
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        const entry = this._lookupAsDirectory(uri, false);
        const result: [string, vscode.FileType][] = [];
        for (const [name, child] of entry.entries) {
            result.push([name, child.type]);
        }
        return result;
    }

    // --- manage file contents

    readFile(uri: vscode.Uri): Uint8Array {
        const data = this._lookupAsFile(uri, false).getData();
        if (data) {
            return data;
        }
        throw vscode.FileSystemError.FileNotFound();
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
        console.log("Doing nothing during write of remote file, the remote file is probably just told to save");
        let file = this._lookupAsFile(uri, false);
        if(!file) {
            throw new Error("Cannot interact with non existing remote file");
        } 
        if(file.isClosed()) {
            throw new Error("Remote file is closed");
        }
    }

    // --- manage files/folders

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        throw new Error("File rename is not supported in collaboration fs");
    }

    delete(uri: vscode.Uri): void {
        throw new Error("File delete is not supported in collaboration fs");
    }

    createDirectory(uri: vscode.Uri): void {
        throw new Error("Directory create is not supported in collaboration fs");
    }

    // --- lookup

    private _lookup(uri: vscode.Uri, silent: false): Entry;
    private _lookup(uri: vscode.Uri, silent: boolean): Entry | undefined;
    private _lookup(uri: vscode.Uri, silent: boolean): Entry | undefined {
        const parts = (uri.authority+"/"+uri.path).split('/');
        let entry: Entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child: Entry | undefined;
            if (entry instanceof CollaborationDirectory) {
                child = entry.entries.get(part);
            }
            if (!child) {
                if (!silent) {
                    throw vscode.FileSystemError.FileNotFound(uri);
                } else {
                    return undefined;
                }
            }
            entry = child;
        }
        return entry;
    }

    private _lookupAsDirectory(uri: vscode.Uri, silent: boolean): CollaborationDirectory {
        const entry = this._lookup(uri, silent);
        if (entry instanceof CollaborationDirectory) {
            return entry;
        }
        throw vscode.FileSystemError.FileNotADirectory(uri);
    }

    private _lookupAsFile(uri: vscode.Uri, silent: boolean): CollaborationFile {
        const entry = this._lookup(uri, silent);
        if (entry instanceof CollaborationFile) {
            return entry;
        }
        throw vscode.FileSystemError.FileIsADirectory(uri);
    }

    private _lookupParentDirectory(uri: vscode.Uri): CollaborationDirectory {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        return this._lookupAsDirectory(dirname, false);
    }

    // --- manage file events

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    watch(_resource: vscode.Uri): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    private _fireSoon(...events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...events);

        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }

        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }
}