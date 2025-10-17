import { describe, it, expect } from 'vitest';
import { BeaconCodec } from '../../src/discovery/BeaconCodec.js';

describe('MdnsPeerSource', () => {
  it('encodes and decodes beacon', () => {
    const beacon = {
      hostId: 'test-host',
      addr: 'localhost:3000',
      proto: 'tcp' as const,
      supportedVersions: [1, 2],
      ttl: 30000
    };

    const encoded = BeaconCodec.encode(beacon);
    const decoded = BeaconCodec.decode(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.hostId).toBe('test-host');
  });
});
