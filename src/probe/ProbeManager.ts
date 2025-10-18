import { EventEmitter } from 'events';
import type { PeerInfo } from '../types/network.js';
import type { Hostess } from '../hostess/Hostess.js';
import { TCPPipeClient } from '../pipes/adapters/TCPPipe.js';

export class ProbeManager extends EventEmitter {
  private probes = new Map<string, any>();

  constructor(private hostess: Hostess) {
    super();
  }

  async probeBeacon(beacon: PeerInfo): Promise<void> {
    const { hostId, addr, proto } = beacon;
    
    if (this.probes.has(hostId)) return;

    try {
      const [host, port] = addr.split(':');
      const client = new TCPPipeClient({ host, port: parseInt(port) });
      await client.connect();
      
      this.probes.set(hostId, { client, beacon });
      this.emit('probeConnected', { hostId, addr });
    } catch (err) {
      this.emit('probeFailed', { hostId, error: (err as Error).message });
    }
  }

  getProbes(): PeerInfo[] {
    return Array.from(this.probes.values()).map(p => p.beacon);
  }
}
