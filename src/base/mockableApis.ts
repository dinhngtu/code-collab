import { TimedExecutor } from "./timedExecutor";
import { ITimedExecutor } from "./iTimedExecutor";
import * as fs from 'fs';
import * as vscode from 'vscode';
import { IFileSystem } from "./iFileSystem";
import { FileSystem } from "./fileSystem";
let fsPromises = fs.promises;

export class MockableApis {
    static executor : ITimedExecutor = new TimedExecutor(); 
    static fs : any = fs;
    static window : any = vscode.window;
    static workspace : any = vscode.workspace;
    static commands : any = vscode.commands;
    static fsPromises : any = fsPromises;
    static filesystem : IFileSystem = new FileSystem();

    static restore() {
        MockableApis.executor = new TimedExecutor(); 
        MockableApis.fs = fs;
        MockableApis.window = vscode.window;
        MockableApis.workspace = vscode.workspace;
        MockableApis.commands = vscode.commands;
        MockableApis.fsPromises = fsPromises;
    }
}