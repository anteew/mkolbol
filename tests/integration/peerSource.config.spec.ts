import { describe, it, expect } from 'vitest';
import { ConfigPeerSource } from '../../src/discovery/ConfigPeerSource.js';

describe('ConfigPeerSource', () => {
  it('loads static peers from config', async () => {
    const source = new ConfigPeerSource({
      peers: [
        { hostId: 'host1', addr: 'localhost:3001', proto: 'tcp', supportedVersions: [1] },
        { hostId: 'host2', addr: 'localhost:3002', proto: 'ws', supportedVersions: [1, 2] },
      ],
    });

    await source.start();
    const peers = source.getPeers();

    expect(peers).toHaveLength(2);
    expect(peers[0].hostId).toBe('host1');
    expect(peers[1].proto).toBe('ws');
  });

  it('emits peerDiscovered events', async () => {
    const events: any[] = [];
    const source = new ConfigPeerSource({
      peers: [{ hostId: 'host1', addr: 'localhost:3001', proto: 'tcp', supportedVersions: [1] }],
    });

    source.on('peerDiscovered', (peer) => events.push(peer));
    await source.start();

    expect(events).toHaveLength(1);
    expect(events[0].hostId).toBe('host1');
  });

  it('getPeer returns specific peer', async () => {
    const source = new ConfigPeerSource({
      peers: [{ hostId: 'host1', addr: 'localhost:3001', proto: 'tcp', supportedVersions: [1] }],
    });

    await source.start();
    const peer = source.getPeer('host1');

    expect(peer).not.toBeNull();
    expect(peer!.addr).toBe('localhost:3001');
  });
});
