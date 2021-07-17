import { IFileSystem } from "./iFileSystem";
import { MockableApis } from "./mockableApis";

export class FileSystem implements IFileSystem{
    getLastModifyDate(path: string): number {
        return MockableApis.fs.statSync(path).mtimeMs;
    }

}