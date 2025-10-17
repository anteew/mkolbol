import { PeerSource, PeerSourceOptions } from './PeerSource.js';
import type { PeerInfo } from '../types/network.js';
export interface ConfigPeerSourceOptions extends PeerSourceOptions {
    peers: PeerInfo[];
}
export declare class ConfigPeerSource extends PeerSource {
    private options;
    constructor(options: ConfigPeerSourceOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=ConfigPeerSource.d.ts.map