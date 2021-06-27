export interface IPeerListener {
    onPeerJoined(peer : string) : Promise<void>;
    onPeerLeft(peer : string) : Promise<void>;
}