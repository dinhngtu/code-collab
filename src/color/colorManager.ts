import { ThemeColor } from "vscode";
import { IColorManager } from "./iColorManager";

export class ColorManager implements IColorManager {
    
    // its absolutely shit that you cannot access the value of ThemeColor and can't create new ThemeColors dynamically, so we will have to sync the colors here and in the package.json manually
    private colors = [
        "rgba(255,0,0,0.4)",
        "rgba(0,255,0,0.4)",
        "rgba(0,0,255,0.4)",
        "rgba(255,255,0,0.4)",
        "rgba(0,255,255,0.4)"
    ];

    private colorCount = 5;
    private peers : (string | null)[] = [];
    
    removePeer(uniquepeer: string): void {
        let index = this.peers.indexOf(uniquepeer);
        if(index >= 0) {
            this.peers[index] = null;
        }
    }
    
    getVSCodeColor(uniquepeer: string): ThemeColor {
        return new ThemeColor("collab.peer."+this.getOrAddPeerIndex(uniquepeer));
    }

    getColorString(uniquepeer: string): string {
        return this.colors[this.getOrAddPeerIndex(uniquepeer)];
    }

    private getOrAddPeerIndex(peer : string) {
        let index = this.peers.indexOf(peer);
        if(index<0) {
            index = this.getEmptySlot(peer);

            if(index<0) {
                this.peers.push(peer);
                index = this.peers.length-1;
            }
        }

        return index % this.colorCount;
    }

    private getEmptySlot(peer : string) : number {
        for(let i = 0;i<this.peers.length;i++) {
            if(!this.peers[i]) {
                this.peers[i] = peer;
                return i;
            }
        }
        return -1;
    }

}