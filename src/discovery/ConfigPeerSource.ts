import { PeerSource, PeerSourceOptions } from './PeerSource.js';
import type { PeerInfo } from '../types/network.js';

export interface ConfigPeerSourceOptions extends PeerSourceOptions {
  peers: PeerInfo[];
}

export class ConfigPeerSource extends PeerSource {
  constructor(private options: ConfigPeerSourceOptions) {
    super();
  }

  async start(): Promise<void> {
    for (const peer of this.options.peers) {
      this.addOrUpdatePeer(peer);
    }
  }

  async stop(): Promise<void> {
    this.peers.clear();
  }
}
