#!/usr/bin/env tsx
import { RoutingServer } from '../../../src/router/RoutingServer.js';
import { Federation, ConfigPeerSource } from '../../../src/router/Federation.js';
async function main() {
    console.log('[Router-2] Starting...\n');
    // Create router with 10-second TTL
    const router = new RoutingServer({ ttlMs: 10000, sweepIntervalMs: 3000 });
    router.startSweeper();
    // Configure static peer (Router-1)
    const peerSource = new ConfigPeerSource(['tcp://router-1:30020']);
    // Create federation
    const federation = new Federation({
        routerId: 'router-2',
        router,
        peerSource,
        propagateIntervalMs: 2000, // Propagate every 2 seconds
    });
    // Subscribe to router events for monitoring
    router.subscribe((event) => {
        const prefix = `[Router-2/${event.type.toUpperCase()}]`;
        const source = event.endpoint.metadata?.federationSource || 'local';
        console.log(`${prefix} ${event.endpoint.id} (${event.endpoint.coordinates}) source=${source}`);
    });
    // Start federation
    await federation.start();
    console.log('[Router-2] Federation started');
    console.log('[Router-2] Peers:', federation
        .getStatus()
        .peers.map((p) => p.peerId)
        .join(', '));
    console.log();
    // Announce local service-a endpoint (backup for Router-1's service-a)
    console.log('[Router-2] Announcing local service-a (backup)...');
    router.announce({
        id: 'r2-service-a',
        type: 'inproc',
        coordinates: 'node:service-a',
        metadata: { info: 'Backup service-a on Router-2' },
    });
    // Announce local service-b endpoint (primary for service-b)
    setTimeout(() => {
        console.log('[Router-2] Announcing local service-b (primary)...');
        router.announce({
            id: 'r2-service-b',
            type: 'inproc',
            coordinates: 'node:service-b',
            metadata: { info: 'Primary service-b on Router-2' },
        });
    }, 1000);
    // Periodically show routing table
    setInterval(() => {
        console.log('\n[Router-2] === Routing Table ===');
        const endpoints = router.list();
        endpoints.forEach((ep) => {
            const source = ep.metadata?.federationSource || 'LOCAL';
            const best = router.resolve(ep.coordinates);
            const isBest = best?.id === ep.id ? ' [BEST]' : '';
            console.log(`  ${ep.coordinates} <- ${ep.id} (${source})${isBest}`);
        });
        const status = federation.getStatus();
        console.log(`\n[Router-2] Local endpoints: ${status.localEndpointCount}`);
        console.log(`[Router-2] Total endpoints: ${endpoints.length}`);
    }, 5000);
    // Keep alive
    console.log('[Router-2] Running... Press Ctrl+C to stop\n');
}
main().catch((err) => {
    console.error('[Router-2] Error:', err);
    process.exit(1);
});
//# sourceMappingURL=router2.js.map