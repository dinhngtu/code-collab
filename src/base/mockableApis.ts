import { TimedExecutor } from "./timedExecutor";
import { ITimedExecutor } from "./iTimedExecutor";
import * as fs from 'fs';
import * as vscode from 'vscode';
import { IFileSystem } from "./iFileSystem";
import { FileSystem } from "./fileSystem";
let fsPromises = fs.promises;

export class MockableApis {
    static executor : ITimedExecutor = new TimedExecutor();
    static fs : typeof fs = fs;
    static window : typeof vscode.window = vscode.window;
    static workspace : typeof vscode.workspace = vscode.workspace;
    static commands : typeof vscode.commands = vscode.commands;
    static fsPromises : typeof fs.promises = fsPromises;
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
