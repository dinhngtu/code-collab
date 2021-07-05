import * as vscode from 'vscode';

export interface IColorManager {
    getVSCodeColor(uniquepeer : string) : vscode.ThemeColor;
    getColorString(uniquepeer : string) : string;
    removePeer(uniquepeer : string) : void;
}