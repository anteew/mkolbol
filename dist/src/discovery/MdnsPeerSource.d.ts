import { PeerSource, PeerSourceOptions } from './PeerSource.js';
export interface MdnsPeerSourceOptions extends PeerSourceOptions {
    multicastAddr?: string;
    port?: number;
    hostId: string;
    addr: string;
    proto: 'tcp' | 'ws';
    supportedVersions?: number[];
}
export declare class MdnsPeerSource extends PeerSource {
    private options;
    private socket?;
    private beaconTimer?;
    constructor(options: MdnsPeerSourceOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private sendBeacon;
}
//# sourceMappingURL=MdnsPeerSource.d.ts.map