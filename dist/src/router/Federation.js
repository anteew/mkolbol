import { debug } from '../debug/api.js';
/**
 * ConfigPeerSource: Static list of peer routers from configuration.
 */
export class ConfigPeerSource {
    peers;
    constructor(peers) {
        this.peers = peers;
    }
    async getPeers() {
        return [...this.peers];
    }
}
/**
 * Federation manages router-to-router advertisement propagation.
 * Routers share endpoint announcements and TTL information across the federation.
 */
export class Federation {
    routerId;
    router;
    peerSource;
    peers = new Map();
    propagateIntervalMs;
    propagateTimer;
    unsubscribe;
    localEndpoints = new Set();
    constructor(config) {
        this.routerId = config.routerId;
        this.router = config.router;
        this.peerSource = config.peerSource;
        this.propagateIntervalMs = config.propagateIntervalMs ?? 5000;
    }
    /**
     * Start federation: subscribe to local router changes and propagate to peers.
     */
    async start() {
        debug.emit('federation', 'start', { routerId: this.routerId });
        // Subscribe to local router events
        this.unsubscribe = this.router.subscribe((event) => {
            this.handleLocalEvent(event);
        });
        // Discover peers
        await this.discoverPeers();
        // Start periodic propagation
        this.startPropagation();
        debug.emit('federation', 'started', {
            routerId: this.routerId,
            peerCount: this.peers.size,
        });
    }
    /**
     * Stop federation: unsubscribe and clean up.
     */
    stop() {
        debug.emit('federation', 'stop', { routerId: this.routerId });
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = undefined;
        }
        if (this.propagateTimer) {
            clearInterval(this.propagateTimer);
            this.propagateTimer = undefined;
        }
        this.peers.clear();
        this.localEndpoints.clear();
        debug.emit('federation', 'stopped', { routerId: this.routerId });
    }
    /**
     * Handle local router events (added/updated/removed).
     */
    handleLocalEvent(event) {
        const { type, endpoint } = event;
        // Track local endpoints (exclude peer-sourced endpoints)
        const isLocal = !endpoint.metadata?.federationSource;
        if (type === 'added' || type === 'updated') {
            if (isLocal) {
                this.localEndpoints.add(endpoint.id);
                debug.emit('federation', 'local.change', {
                    type,
                    id: endpoint.id,
                    coordinates: endpoint.coordinates,
                });
            }
        }
        else if (type === 'removed') {
            this.localEndpoints.delete(endpoint.id);
            debug.emit('federation', 'local.removed', { id: endpoint.id });
        }
    }
    /**
     * Discover peers from PeerSource.
     */
    async discoverPeers() {
        try {
            const peerUrls = await this.peerSource.getPeers();
            const now = Date.now();
            for (const url of peerUrls) {
                const peerId = this.extractPeerId(url);
                if (peerId === this.routerId) {
                    debug.emit('federation', 'peer.skip-self', { url });
                    continue;
                }
                if (!this.peers.has(peerId)) {
                    this.peers.set(peerId, {
                        peerId,
                        url,
                        lastSeen: now,
                        active: true,
                    });
                    debug.emit('federation', 'peer.discovered', { peerId, url });
                }
            }
        }
        catch (err) {
            debug.emit('federation', 'peer.discovery.error', { error: err instanceof Error ? err.message : String(err) }, 'error');
        }
    }
    /**
     * Extract peer ID from URL (e.g., "router-1" from "tcp://router-1:30020").
     */
    extractPeerId(url) {
        // Simple extraction: use hostname from URL
        const match = url.match(/^(?:tcp|ws):\/\/([^:\/]+)/);
        return match ? match[1] : url;
    }
    /**
     * Start periodic propagation of local endpoints to peers.
     */
    startPropagation() {
        if (this.propagateTimer)
            return;
        this.propagateTimer = setInterval(() => {
            this.propagateLocalEndpoints();
        }, this.propagateIntervalMs);
        // Initial propagation
        this.propagateLocalEndpoints();
    }
    /**
     * Propagate local endpoints to all active peers.
     */
    propagateLocalEndpoints() {
        const endpoints = this.router.list().filter((ep) => this.localEndpoints.has(ep.id));
        if (endpoints.length === 0) {
            debug.emit('federation', 'propagate.skip', { reason: 'no-local-endpoints' });
            return;
        }
        debug.emit('federation', 'propagate.start', {
            endpointCount: endpoints.length,
            peerCount: this.peers.size,
        });
        for (const peer of this.peers.values()) {
            if (!peer.active)
                continue;
            this.propagateToPeer(peer, endpoints);
        }
    }
    /**
     * Propagate endpoints to a specific peer.
     * TODO: Implement actual network transmission (TCP/WebSocket).
     */
    propagateToPeer(peer, endpoints) {
        // For now, just log the propagation
        // In a real implementation, this would send announcements over TCP/WebSocket
        debug.emit('federation', 'propagate.peer', {
            peerId: peer.peerId,
            url: peer.url,
            endpointCount: endpoints.length,
        });
        // TODO: Send announcements to peer over network
        // This will be implemented with actual TCP/WebSocket connections
    }
    /**
     * Receive an announcement from a peer and inject into local router.
     */
    receiveFromPeer(peerId, announcement) {
        // Mark announcement as coming from a peer
        const peerAnnouncement = {
            ...announcement,
            metadata: {
                ...announcement.metadata,
                federationSource: peerId,
            },
        };
        debug.emit('federation', 'receive.peer', {
            peerId,
            id: announcement.id,
            type: announcement.type,
        });
        // Inject into local router
        this.router.announce(peerAnnouncement);
        // Update peer last seen
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.lastSeen = Date.now();
        }
    }
    /**
     * Get federation status for monitoring.
     */
    getStatus() {
        return {
            routerId: this.routerId,
            peerCount: this.peers.size,
            localEndpointCount: this.localEndpoints.size,
            peers: Array.from(this.peers.values()).map((p) => ({
                peerId: p.peerId,
                url: p.url,
                active: p.active,
                lastSeen: p.lastSeen,
            })),
        };
    }
}
//# sourceMappingURL=Federation.js.map