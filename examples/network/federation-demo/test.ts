#!/usr/bin/env tsx
/**
 * Automated acceptance test for router federation with failover.
 * This test verifies:
 * 1. Two routers with static peer configuration
 * 2. Endpoint propagation across federation
 * 3. Path preference (local > remote)
 * 4. Automatic failover when local endpoint is withdrawn
 */

import { RoutingServer } from '../../../src/router/RoutingServer.js';
import { Federation, ConfigPeerSource } from '../../../src/router/Federation.js';

async function test() {
  console.log('Federation Acceptance Test\n');

  // Create Router-1
  const router1 = new RoutingServer({ ttlMs: 10000 });
  const peerSource1 = new ConfigPeerSource(['tcp://router-2:30020']);
  const federation1 = new Federation({
    routerId: 'router-1',
    router: router1,
    peerSource: peerSource1,
  });

  // Create Router-2
  const router2 = new RoutingServer({ ttlMs: 10000 });
  const peerSource2 = new ConfigPeerSource(['tcp://router-1:30020']);
  const federation2 = new Federation({
    routerId: 'router-2',
    router: router2,
    peerSource: peerSource2,
  });

  // Start both federations
  await federation1.start();
  await federation2.start();

  console.log('✓ Federation initialized');

  // Verify peer discovery
  const status1 = federation1.getStatus();
  const status2 = federation2.getStatus();

  if (status1.peerCount !== 1 || status1.peers[0].peerId !== 'router-2') {
    throw new Error(
      `Router-1 peer discovery failed: expected router-2, got ${status1.peers[0]?.peerId}`,
    );
  }

  if (status2.peerCount !== 1 || status2.peers[0].peerId !== 'router-1') {
    throw new Error(
      `Router-2 peer discovery failed: expected router-1, got ${status2.peers[0]?.peerId}`,
    );
  }

  console.log('✓ Peer discovery works (router-1 ↔ router-2)');

  // Router-1 announces service-a (primary)
  router1.announce({
    id: 'r1-service-a',
    type: 'inproc',
    coordinates: 'node:service-a',
  });

  // Router-2 announces service-a (backup)
  router2.announce({
    id: 'r2-service-a',
    type: 'inproc',
    coordinates: 'node:service-a',
  });

  console.log('✓ Endpoints announced on both routers');

  // Simulate cross-propagation (in real impl, this happens via network)
  const r1Endpoints = router1.list().filter((ep) => !ep.metadata?.federationSource);
  for (const ep of r1Endpoints) {
    federation2.receiveFromPeer('router-1', {
      id: ep.id,
      type: ep.type,
      coordinates: ep.coordinates,
      metadata: ep.metadata,
    });
  }

  const r2Endpoints = router2.list().filter((ep) => !ep.metadata?.federationSource);
  for (const ep of r2Endpoints) {
    federation1.receiveFromPeer('router-2', {
      id: ep.id,
      type: ep.type,
      coordinates: ep.coordinates,
      metadata: ep.metadata,
    });
  }

  console.log('✓ Cross-propagation simulated');

  // Verify Router-1 has both endpoints
  const r1List = router1.list();
  if (r1List.length !== 2) {
    throw new Error(`Router-1 should have 2 endpoints, has ${r1List.length}`);
  }

  // Verify Router-2 has both endpoints
  const r2List = router2.list();
  if (r2List.length !== 2) {
    throw new Error(`Router-2 should have 2 endpoints, has ${r2List.length}`);
  }

  console.log('✓ Both routers see all endpoints');

  // Verify path preference (local > remote)
  const r1Best = router1.resolve('node:service-a');
  if (!r1Best || r1Best.id !== 'r1-service-a') {
    throw new Error(`Router-1 should prefer local r1-service-a, got ${r1Best?.id}`);
  }

  const r2Best = router2.resolve('node:service-a');
  if (!r2Best || r2Best.id !== 'r2-service-a') {
    throw new Error(`Router-2 should prefer local r2-service-a, got ${r2Best?.id}`);
  }

  console.log('✓ Path preference works (local > remote)');

  // Simulate link failure on Router-1
  router1.withdraw('r1-service-a');

  console.log('✓ Simulated link failure (r1-service-a withdrawn)');

  // Verify failover on Router-1
  const r1BestAfter = router1.resolve('node:service-a');
  if (!r1BestAfter || r1BestAfter.id !== 'r2-service-a') {
    throw new Error(`Router-1 should failover to r2-service-a, got ${r1BestAfter?.id}`);
  }

  if (
    !r1BestAfter.metadata?.federationSource ||
    r1BestAfter.metadata.federationSource !== 'router-2'
  ) {
    throw new Error(
      `Failover endpoint should be from router-2, got ${r1BestAfter.metadata?.federationSource}`,
    );
  }

  console.log('✓ Automatic failover works (router-1 → router-2)');

  // Verify Router-2 still has its local endpoint as best
  const r2BestAfter = router2.resolve('node:service-a');
  if (!r2BestAfter || r2BestAfter.id !== 'r2-service-a') {
    throw new Error(`Router-2 should still prefer local, got ${r2BestAfter?.id}`);
  }

  console.log('✓ Router-2 unaffected by Router-1 failure');

  // Cleanup
  federation1.stop();
  federation2.stop();
  router1.stopSweeper();
  router2.stopSweeper();

  console.log('\n✓ All federation acceptance tests passed!');
}

test().catch((err) => {
  console.error('\n✗ Federation acceptance test failed:', err.message);
  process.exit(1);
});
