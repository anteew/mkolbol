import { PeerSource, PeerSourceOptions } from './PeerSource.js';
import { BeaconCodec, Beacon } from './BeaconCodec.js';
import { createSocket, Socket } from 'dgram';

export interface MdnsPeerSourceOptions extends PeerSourceOptions {
  multicastAddr?: string;
  port?: number;
  hostId: string;
  addr: string;
  proto: 'tcp' | 'ws';
  supportedVersions?: number[];
}

export class MdnsPeerSource extends PeerSource {
  private socket?: Socket;
  private beaconTimer?: NodeJS.Timeout;

  constructor(private options: MdnsPeerSourceOptions) {
    super();
  }

  async start(): Promise<void> {
    const port = this.options.port ?? 5353;
    const multicastAddr = this.options.multicastAddr ?? '224.0.0.251';

    this.socket = createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('message', (msg) => {
      const beacon = BeaconCodec.decode(msg);
      if (beacon && beacon.hostId !== this.options.hostId) {
        const peerInfo = BeaconCodec.beaconToPeerInfo(beacon);
        this.addOrUpdatePeer(peerInfo);
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.socket!.bind(port, () => {
        try {
          this.socket!.addMembership(multicastAddr);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    const interval = this.options.discoveryInterval ?? 5000;
    this.beaconTimer = setInterval(() => {
      this.sendBeacon();
    }, interval);

    this.sendBeacon();
  }

  async stop(): Promise<void> {
    if (this.beaconTimer) {
      clearInterval(this.beaconTimer);
      this.beaconTimer = undefined;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }

    this.peers.clear();
  }

  private sendBeacon(): void {
    if (!this.socket) return;

    const beacon: Beacon = {
      hostId: this.options.hostId,
      addr: this.options.addr,
      proto: this.options.proto,
      supportedVersions: this.options.supportedVersions ?? [1],
      ttl: this.options.peerTtl ?? 30000,
    };

    const encoded = BeaconCodec.encode(beacon);
    const multicastAddr = this.options.multicastAddr ?? '224.0.0.251';
    const port = this.options.port ?? 5353;

    this.socket.send(encoded, port, multicastAddr);
  }
}
