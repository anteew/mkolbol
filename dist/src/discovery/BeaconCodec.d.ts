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
export declare class BeaconCodec {
    static encode(beacon: Beacon): Buffer;
    static decode(buffer: Buffer): Beacon | null;
    static beaconToPeerInfo(beacon: Beacon): PeerInfo;
}
//# sourceMappingURL=BeaconCodec.d.ts.map