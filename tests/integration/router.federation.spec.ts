import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RoutingServer } from '../../src/router/RoutingServer.js';
import { Federation, ConfigPeerSource } from '../../src/router/Federation.js';

describe('Router Federation', () => {
  let router1: RoutingServer;
  let router2: RoutingServer;
  let federation1: Federation;
  let federation2: Federation;

  beforeEach(() => {
    router1 = new RoutingServer({ ttlMs: 30000 });
    router2 = new RoutingServer({ ttlMs: 30000 });
  });

  afterEach(() => {
    federation1?.stop();
    federation2?.stop();
    router1?.stopSweeper();
    router2?.stopSweeper();
  });

  it('creates federation with static peer source', async () => {
    const peerSource1 = new ConfigPeerSource(['tcp://router-2:30020']);
    federation1 = new Federation({
      routerId: 'router-1',
      router: router1,
      peerSource: peerSource1,
      propagateIntervalMs: 1000,
    });

    await federation1.start();

    const status = federation1.getStatus();
    expect(status.routerId).toBe('router-1');
    expect(status.peerCount).toBe(1);
    expect(status.peers[0].peerId).toBe('router-2');
  });

  it('tracks local endpoints separately from peer endpoints', async () => {
    const peerSource1 = new ConfigPeerSource(['tcp://router-2:30020']);
    federation1 = new Federation({
      routerId: 'router-1',
      router: router1,
      peerSource: peerSource1,
    });

    await federation1.start();

    // Announce local endpoint
    router1.announce({
      id: 'local-ep-1',
      type: 'inproc',
      coordinates: 'node:service-a',
    });

    // Simulate receiving from peer
    federation1.receiveFromPeer('router-2', {
      id: 'remote-ep-1',
      type: 'inproc',
      coordinates: 'node:service-b',
    });

    const status = federation1.getStatus();
    expect(status.localEndpointCount).toBe(1);

    const endpoints = router1.list();
    expect(endpoints.length).toBe(2);

    const localEndpoint = endpoints.find((ep) => ep.id === 'local-ep-1');
    expect(localEndpoint).toBeDefined();
    expect(localEndpoint?.metadata?.federationSource).toBeUndefined();

    const remoteEndpoint = endpoints.find((ep) => ep.id === 'remote-ep-1');
    expect(remoteEndpoint).toBeDefined();
    expect(remoteEndpoint?.metadata?.federationSource).toBe('router-2');
  });

  it('propagates local announcements to peers', async () => {
    const peerSource1 = new ConfigPeerSource(['tcp://router-2:30020']);
    federation1 = new Federation({
      routerId: 'router-1',
      router: router1,
      peerSource: peerSource1,
      propagateIntervalMs: 100,
    });

    await federation1.start();

    // Announce local endpoint
    router1.announce({
      id: 'local-ep-1',
      type: 'inproc',
      coordinates: 'node:service-a',
    });

    // Wait for propagation cycle
    await new Promise((resolve) => setTimeout(resolve, 200));

    const status = federation1.getStatus();
    expect(status.localEndpointCount).toBe(1);
  });

  it('handles multiple peers', async () => {
    const peerSource1 = new ConfigPeerSource([
      'tcp://router-2:30020',
      'tcp://router-3:30020',
      'tcp://router-4:30020',
    ]);

    federation1 = new Federation({
      routerId: 'router-1',
      router: router1,
      peerSource: peerSource1,
    });

    await federation1.start();

    const status = federation1.getStatus();
    expect(status.peerCount).toBe(3);
    expect(status.peers.map((p) => p.peerId)).toEqual(['router-2', 'router-3', 'router-4']);
  });

  it('skips self when listed as peer', async () => {
    const peerSource1 = new ConfigPeerSource([
      'tcp://router-1:30020', // Self
      'tcp://router-2:30020',
    ]);

    federation1 = new Federation({
      routerId: 'router-1',
      router: router1,
      peerSource: peerSource1,
    });

    await federation1.start();

    const status = federation1.getStatus();
    expect(status.peerCount).toBe(1); // Only router-2, not self
    expect(status.peers[0].peerId).toBe('router-2');
  });

  it('simulates two-router federation', async () => {
    // Router 1 setup
    const peerSource1 = new ConfigPeerSource(['tcp://router-2:30020']);
    federation1 = new Federation({
      routerId: 'router-1',
      router: router1,
      peerSource: peerSource1,
    });

    // Router 2 setup
    const peerSource2 = new ConfigPeerSource(['tcp://router-1:30020']);
    federation2 = new Federation({
      routerId: 'router-2',
      router: router2,
      peerSource: peerSource2,
    });

    await federation1.start();
    await federation2.start();

    // Router 1 announces local endpoint
    router1.announce({
      id: 'r1-service-a',
      type: 'inproc',
      coordinates: 'node:service-a',
    });

    // Router 2 announces local endpoint
    router2.announce({
      id: 'r2-service-b',
      type: 'inproc',
      coordinates: 'node:service-b',
    });

    // Simulate cross-propagation
    // In real implementation, this would happen via network
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

    // Verify router 1 has both local and remote
    const r1List = router1.list();
    expect(r1List.length).toBe(2);
    expect(r1List.find((ep) => ep.id === 'r1-service-a')).toBeDefined();
    expect(r1List.find((ep) => ep.id === 'r2-service-b')).toBeDefined();
    expect(r1List.find((ep) => ep.id === 'r2-service-b')?.metadata?.federationSource).toBe(
      'router-2',
    );

    // Verify router 2 has both local and remote
    const r2List = router2.list();
    expect(r2List.length).toBe(2);
    expect(r2List.find((ep) => ep.id === 'r2-service-b')).toBeDefined();
    expect(r2List.find((ep) => ep.id === 'r1-service-a')).toBeDefined();
    expect(r2List.find((ep) => ep.id === 'r1-service-a')?.metadata?.federationSource).toBe(
      'router-1',
    );
  });

  it('removes local endpoints when withdrawn', async () => {
    const peerSource1 = new ConfigPeerSource(['tcp://router-2:30020']);
    federation1 = new Federation({
      routerId: 'router-1',
      router: router1,
      peerSource: peerSource1,
    });

    await federation1.start();

    router1.announce({
      id: 'local-ep-1',
      type: 'inproc',
      coordinates: 'node:service-a',
    });

    expect(federation1.getStatus().localEndpointCount).toBe(1);

    router1.withdraw('local-ep-1');

    expect(federation1.getStatus().localEndpointCount).toBe(0);
  });

  it('updates peer lastSeen when receiving announcements', async () => {
    const peerSource1 = new ConfigPeerSource(['tcp://router-2:30020']);
    federation1 = new Federation({
      routerId: 'router-1',
      router: router1,
      peerSource: peerSource1,
    });

    await federation1.start();

    const statusBefore = federation1.getStatus();
    const initialLastSeen = statusBefore.peers[0].lastSeen;

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Receive announcement from peer
    federation1.receiveFromPeer('router-2', {
      id: 'remote-ep-1',
      type: 'inproc',
      coordinates: 'node:service-b',
    });

    const statusAfter = federation1.getStatus();
    const updatedLastSeen = statusAfter.peers[0].lastSeen;

    expect(updatedLastSeen).toBeGreaterThan(initialLastSeen);
  });
});
