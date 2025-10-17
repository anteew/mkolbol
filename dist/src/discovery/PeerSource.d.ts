import type { PeerInfo } from '../types/network.js';
import { EventEmitter } from 'events';
export interface PeerSourceOptions {
    discoveryInterval?: number;
    peerTtl?: number;
}
export declare abstract class PeerSource extends EventEmitter {
    protected peers: Map<string, PeerInfo>;
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
    getPeers(): PeerInfo[];
    getPeer(hostId: string): PeerInfo | null;
    protected addOrUpdatePeer(peer: PeerInfo): void;
    protected removePeer(hostId: string): void;
}
//# sourceMappingURL=PeerSource.d.ts.map