import { IPeerListener } from "../sync/iPeerListener";
import { DelayedListenerExecution } from "../sync/teletype/delayedListenerExecution";
import { IPeerManagementListener } from "./iPeerManagementListener";

export class PeerManager extends DelayedListenerExecution<IPeerManagementListener> implements IPeerListener {
	public peers : string[] = [];

    async onPeerJoined(peer: string): Promise<void> {
        this.peers.push(peer);
		this.informPeerListeners();
    }
    async onPeerLeft(peer: string): Promise<void> {
        for(var i = 0;i<this.peers.length;i++) {
			if(this.peers[i] === peer) {
				this.peers.splice(i,1);
			}
		}
		this.informPeerListeners();
    }

    private informPeerListeners() {
		this.executeOnListener(async (listener) => {
			listener.onPeerAddedOrRemoved();
		});
	}
}