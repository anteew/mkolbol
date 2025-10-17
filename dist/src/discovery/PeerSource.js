import { EventEmitter } from 'events';
export class PeerSource extends EventEmitter {
    peers = new Map();
    getPeers() {
        return Array.from(this.peers.values()).map(p => ({ ...p }));
    }
    getPeer(hostId) {
        const peer = this.peers.get(hostId);
        return peer ? { ...peer } : null;
    }
    addOrUpdatePeer(peer) {
        const existing = this.peers.get(peer.hostId);
        const now = Date.now();
        const updated = {
            ...peer,
            discoveredAt: existing?.discoveredAt ?? now,
            lastSeen: now
        };
        this.peers.set(peer.hostId, updated);
        if (existing) {
            this.emit('peerUpdated', updated);
        }
        else {
            this.emit('peerDiscovered', updated);
        }
    }
    removePeer(hostId) {
        const peer = this.peers.get(hostId);
        if (this.peers.delete(hostId) && peer) {
            this.emit('peerRemoved', peer);
        }
    }
}
//# sourceMappingURL=PeerSource.js.map