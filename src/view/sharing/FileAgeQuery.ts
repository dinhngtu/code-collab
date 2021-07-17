import { IFileAgeQuery } from "./iFileAgeQuery";
import * as vscode from 'vscode';

export class FileAgeQuery implements IFileAgeQuery {
    async askOverride(filename: string): Promise<boolean> {
        let choice = await vscode.window.showInformationMessage("The file "+filename+" is newer on the filesystem than on collaboration, what do you wish to do?", "Use Local","Use Collaboration","Don't autoshare");
        if(choice === "Don't autoshare") {
            throw new Error("Cannot autoshare file "+filename+" user has declined to autoshare");
        }
        return choice === "Use Local";
    }

}