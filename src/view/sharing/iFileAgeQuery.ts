export interface IFileAgeQuery {
    askOverride(filename : string) : Promise<boolean>;
}