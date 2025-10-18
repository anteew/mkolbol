import { EventEmitter } from 'events';
import { TCPPipeClient } from '../pipes/adapters/TCPPipe.js';
export class ProbeManager extends EventEmitter {
    hostess;
    probes = new Map();
    constructor(hostess) {
        super();
        this.hostess = hostess;
    }
    async probeBeacon(beacon) {
        const { hostId, addr, proto } = beacon;
        if (this.probes.has(hostId))
            return;
        try {
            const [host, port] = addr.split(':');
            const client = new TCPPipeClient({ host, port: parseInt(port) });
            await client.connect();
            this.probes.set(hostId, { client, beacon });
            this.emit('probeConnected', { hostId, addr });
        }
        catch (err) {
            this.emit('probeFailed', { hostId, error: err.message });
        }
    }
    getProbes() {
        return Array.from(this.probes.values()).map(p => p.beacon);
    }
}
//# sourceMappingURL=ProbeManager.js.map