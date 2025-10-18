import { PeerSource } from './PeerSource.js';
export class ConfigPeerSource extends PeerSource {
    options;
    constructor(options) {
        super();
        this.options = options;
    }
    async start() {
        for (const peer of this.options.peers) {
            this.addOrUpdatePeer(peer);
        }
    }
    async stop() {
        this.peers.clear();
    }
}
//# sourceMappingURL=ConfigPeerSource.js.map