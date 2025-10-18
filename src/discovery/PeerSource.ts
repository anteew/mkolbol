import type { PeerInfo } from '../types/network.js';
import { EventEmitter } from 'events';

export interface PeerSourceOptions {
  discoveryInterval?: number;
  peerTtl?: number;
}

export abstract class PeerSource extends EventEmitter {
  protected peers = new Map<string, PeerInfo>();

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;

  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values()).map(p => ({ ...p }));
  }

  getPeer(hostId: string): PeerInfo | null {
    const peer = this.peers.get(hostId);
    return peer ? { ...peer } : null;
  }

  protected addOrUpdatePeer(peer: PeerInfo): void {
    const existing = this.peers.get(peer.hostId);
    const now = Date.now();
    
    const updated: PeerInfo = {
      ...peer,
      discoveredAt: existing?.discoveredAt ?? now,
      lastSeen: now
    };

    this.peers.set(peer.hostId, updated);
    
    if (existing) {
      this.emit('peerUpdated', updated);
    } else {
      this.emit('peerDiscovered', updated);
    }
  }

  protected removePeer(hostId: string): void {
    const peer = this.peers.get(hostId);
    if (this.peers.delete(hostId) && peer) {
      this.emit('peerRemoved', peer);
    }
  }
}
