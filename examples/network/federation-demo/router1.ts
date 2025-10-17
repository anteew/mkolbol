#!/usr/bin/env tsx
import { RoutingServer } from '../../../src/router/RoutingServer.js';
import { Federation, ConfigPeerSource } from '../../../src/router/Federation.js';

async function main() {
  console.log('[Router-1] Starting...\n');

  // Create router with 10-second TTL
  const router = new RoutingServer({ ttlMs: 10000, sweepIntervalMs: 3000 });
  router.startSweeper();

  // Configure static peer (Router-2)
  const peerSource = new ConfigPeerSource(['tcp://router-2:30020']);

  // Create federation
  const federation = new Federation({
    routerId: 'router-1',
    router,
    peerSource,
    propagateIntervalMs: 2000, // Propagate every 2 seconds
  });

  // Subscribe to router events for monitoring
  router.subscribe((event) => {
    const prefix = `[Router-1/${event.type.toUpperCase()}]`;
    const source = event.endpoint.metadata?.federationSource || 'local';
    console.log(`${prefix} ${event.endpoint.id} (${event.endpoint.coordinates}) source=${source}`);
  });

  // Start federation
  await federation.start();

  console.log('[Router-1] Federation started');
  console.log(
    '[Router-1] Peers:',
    federation
      .getStatus()
      .peers.map((p) => p.peerId)
      .join(', '),
  );
  console.log();

  // Announce local service-a endpoint
  console.log('[Router-1] Announcing local service-a...');
  router.announce({
    id: 'r1-service-a',
    type: 'inproc',
    coordinates: 'node:service-a',
    metadata: { info: 'Primary service-a on Router-1' },
  });

  // Announce local service-b endpoint
  setTimeout(() => {
    console.log('[Router-1] Announcing local service-b...');
    router.announce({
      id: 'r1-service-b',
      type: 'inproc',
      coordinates: 'node:service-b',
      metadata: { info: 'Backup service-b on Router-1' },
    });
  }, 1000);

  // Periodically show routing table
  setInterval(() => {
    console.log('\n[Router-1] === Routing Table ===');
    const endpoints = router.list();
    endpoints.forEach((ep) => {
      const source = ep.metadata?.federationSource || 'LOCAL';
      const best = router.resolve(ep.coordinates);
      const isBest = best?.id === ep.id ? ' [BEST]' : '';
      console.log(`  ${ep.coordinates} <- ${ep.id} (${source})${isBest}`);
    });

    const status = federation.getStatus();
    console.log(`\n[Router-1] Local endpoints: ${status.localEndpointCount}`);
    console.log(`[Router-1] Total endpoints: ${endpoints.length}`);
  }, 5000);

  // Demonstrate failover: withdraw local service-a after 15 seconds
  setTimeout(() => {
    console.log('\n[Router-1] SIMULATING FAILURE: Withdrawing local service-a...');
    router.withdraw('r1-service-a');

    setTimeout(() => {
      const best = router.resolve('node:service-a');
      if (best) {
        const source = best.metadata?.federationSource || 'local';
        console.log(`[Router-1] FAILOVER: Best service-a is now ${best.id} (source=${source})`);
      } else {
        console.log('[Router-1] FAILOVER: No service-a endpoints available');
      }
    }, 1000);
  }, 15000);

  // Keep alive
  console.log('[Router-1] Running... Press Ctrl+C to stop\n');
}

main().catch((err) => {
  console.error('[Router-1] Error:', err);
  process.exit(1);
});
