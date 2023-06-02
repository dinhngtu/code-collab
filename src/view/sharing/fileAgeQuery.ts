import { IFileAgeQuery } from "./iFileAgeQuery";

export class FileAgeQuery implements IFileAgeQuery {
    askOverride(_filename: string): Promise<boolean> {
        return Promise.resolve(true);
    }

}
