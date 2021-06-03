export interface IConnector {
    newConnection() : Promise<void>;
    getName() : string;
}