import { RoutingServer } from './RoutingServer.js';
import type { RoutingAnnouncement } from '../types.js';
/**
 * PeerSource provides a list of peer router URLs for federation.
 */
export interface PeerSource {
    getPeers(): Promise<string[]>;
}
/**
 * ConfigPeerSource: Static list of peer routers from configuration.
 */
export declare class ConfigPeerSource implements PeerSource {
    private peers;
    constructor(peers: string[]);
    getPeers(): Promise<string[]>;
}
export interface FederationConfig {
    routerId: string;
    router: RoutingServer;
    peerSource: PeerSource;
    propagateIntervalMs?: number;
}
/**
 * Federation manages router-to-router advertisement propagation.
 * Routers share endpoint announcements and TTL information across the federation.
 */
export declare class Federation {
    private routerId;
    private router;
    private peerSource;
    private peers;
    private propagateIntervalMs;
    private propagateTimer?;
    private unsubscribe?;
    private localEndpoints;
    constructor(config: FederationConfig);
    /**
     * Start federation: subscribe to local router changes and propagate to peers.
     */
    start(): Promise<void>;
    /**
     * Stop federation: unsubscribe and clean up.
     */
    stop(): void;
    /**
     * Handle local router events (added/updated/removed).
     */
    private handleLocalEvent;
    /**
     * Discover peers from PeerSource.
     */
    private discoverPeers;
    /**
     * Extract peer ID from URL (e.g., "router-1" from "tcp://router-1:30020").
     */
    private extractPeerId;
    /**
     * Start periodic propagation of local endpoints to peers.
     */
    private startPropagation;
    /**
     * Propagate local endpoints to all active peers.
     */
    private propagateLocalEndpoints;
    /**
     * Propagate endpoints to a specific peer.
     * TODO: Implement actual network transmission (TCP/WebSocket).
     */
    private propagateToPeer;
    /**
     * Receive an announcement from a peer and inject into local router.
     */
    receiveFromPeer(peerId: string, announcement: RoutingAnnouncement): void;
    /**
     * Get federation status for monitoring.
     */
    getStatus(): {
        routerId: string;
        peerCount: number;
        localEndpointCount: number;
        peers: Array<{
            peerId: string;
            url: string;
            active: boolean;
            lastSeen: number;
        }>;
    };
}
//# sourceMappingURL=Federation.d.ts.map