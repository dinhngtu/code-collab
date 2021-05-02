import { CyclicExecutor } from "./CyclicExecutor";
import { ICyclicExecutor } from "./iCyclicExecutor";
import * as fs from 'fs';
import * as vscode from 'vscode';

export class MockableApis {
    static executor : ICyclicExecutor = new CyclicExecutor(); 
    static fs : any = fs;
    static window : any = vscode.window;
}