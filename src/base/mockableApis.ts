import { TimedExecutor } from "./timedExecutor";
import { ITimedExecutor } from "./iTimedExecutor";
import * as fs from 'fs';
import * as vscode from 'vscode';
let fsPromises = fs.promises;

export class MockableApis {
    static executor : ITimedExecutor = new TimedExecutor(); 
    static fs : any = fs;
    static window : any = vscode.window;
    static workspace : any = vscode.workspace;
    static commands : any = vscode.commands;
    static fsPromises : any = fsPromises;

    static restore() {
        MockableApis.executor = new TimedExecutor(); 
        MockableApis.fs = fs;
        MockableApis.window = vscode.window;
        MockableApis.workspace = vscode.workspace;
        MockableApis.commands = vscode.commands;
        MockableApis.fsPromises = fsPromises;
    }
}