import type { PeerInfo } from '../types/network.js';

export interface Beacon {
  hostId: string;
  addr: string;
  proto: 'tcp' | 'ws';
  supportedVersions: number[];
  namespaces?: string[];
  caps?: string[];
  ttl: number;
}

export class BeaconCodec {
  static encode(beacon: Beacon): Buffer {
    const json = JSON.stringify(beacon);
    return Buffer.from(json, 'utf8');
  }

  static decode(buffer: Buffer): Beacon | null {
    try {
      const json = buffer.toString('utf8');
      const beacon = JSON.parse(json) as Beacon;
      
      if (!beacon.hostId || !beacon.addr || !beacon.proto || !beacon.supportedVersions) {
        return null;
      }
      
      return beacon;
    } catch {
      return null;
    }
  }

  static beaconToPeerInfo(beacon: Beacon): PeerInfo {
    return {
      hostId: beacon.hostId,
      addr: beacon.addr,
      proto: beacon.proto,
      supportedVersions: beacon.supportedVersions,
      namespaces: beacon.namespaces,
      caps: beacon.caps,
      ttl: beacon.ttl
    };
  }
}
