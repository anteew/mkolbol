import { EventEmitter } from 'events';
import type { PeerInfo } from '../types/network.js';
import type { Hostess } from '../hostess/Hostess.js';
export declare class ProbeManager extends EventEmitter {
    private hostess;
    private probes;
    constructor(hostess: Hostess);
    probeBeacon(beacon: PeerInfo): Promise<void>;
    getProbes(): PeerInfo[];
}
//# sourceMappingURL=ProbeManager.d.ts.map