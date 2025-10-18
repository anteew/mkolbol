import { EventEmitter } from 'events';
import type { PeerInfo } from '../types/network.js';
import type { Hostess } from '../hostess/Hostess.js';
import { TCPPipeClient } from '../pipes/adapters/TCPPipe.js';

interface ProbeEntry {
  client: TCPPipeClient;
  beacon: PeerInfo;
}

/**
 * Manages probing and connecting to beacon peers in the network.
 *
 * The ProbeManager is responsible for attempting connections to discovered beacons,
 * tracking active probes, and emitting events to signal connection success or failure.
 *
 * @emits probeConnected - Emitted when a connection to a beacon is successfully established.
 *   Payload: { hostId: string, addr: string }
 * @emits probeFailed - Emitted when a connection attempt to a beacon fails.
 *   Payload: { hostId: string, error: string }
 */
export class ProbeManager extends EventEmitter {
  private probes = new Map<string, ProbeEntry>();

  constructor(private hostess: Hostess) {
    super();
  }

  /**
   * Attempts to connect to a remote peer beacon using the provided PeerInfo.
   *
   * When called, this method tries to establish a TCP connection to the beacon's address.
   * If the connection is successful, the probe is stored and the 'probeConnected' event is emitted.
   * If the connection fails, the 'probeFailed' event is emitted with the error message.
   *
   * Events emitted:
   * - 'probeConnected': { hostId, addr } on successful connection.
   * - 'probeFailed': { hostId, error } on connection failure.
   *
   * @param beacon - The peer information object containing hostId, addr (host:port), and protocol.
   * @returns Resolves when the probe attempt completes.
   *
   * Call this method when a new beacon is discovered and you want to attempt a connection.
   */
  async probeBeacon(beacon: PeerInfo): Promise<void> {
    const { hostId, addr } = beacon;
    
    if (this.probes.has(hostId)) return;

    try {
      const [host, port] = addr.split(':');
      const portNum = Number(port);
      
      if (!port || !/^\d+$/.test(port) || isNaN(portNum) || portNum < 1 || portNum > 65535) {
        throw new Error(`Invalid port format in beacon address: ${addr}`);
      }
      
      const client = new TCPPipeClient({ host, port: portNum });
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
