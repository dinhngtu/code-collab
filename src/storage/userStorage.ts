import { Memento } from "vscode";
import { ExtensionContext } from "../extensionContext";
import { IUserStorage } from "./iUserStorage";

export class UserStorage implements IUserStorage {
    constructor(private memory : Memento, private extensionContext : ExtensionContext) {

    }

    async store<T>(key: string, value: T): Promise<void> {
        await this.memory.update(this.extensionContext.userid+"."+key,value);
    }

    async get<T>(key: string): Promise<T | undefined> {
        return await this.memory.get<T>(this.extensionContext.userid+"."+key);
    }

    
}