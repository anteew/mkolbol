import { PeerSource } from './PeerSource.js';
import { BeaconCodec } from './BeaconCodec.js';
import { createSocket } from 'dgram';
export class MdnsPeerSource extends PeerSource {
    options;
    socket;
    beaconTimer;
    constructor(options) {
        super();
        this.options = options;
    }
    async start() {
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
        await new Promise((resolve, reject) => {
            this.socket.bind(port, () => {
                try {
                    this.socket.addMembership(multicastAddr);
                    resolve();
                }
                catch (err) {
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
    async stop() {
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
    sendBeacon() {
        if (!this.socket)
            return;
        const beacon = {
            hostId: this.options.hostId,
            addr: this.options.addr,
            proto: this.options.proto,
            supportedVersions: this.options.supportedVersions ?? [1],
            ttl: this.options.peerTtl ?? 30000
        };
        const encoded = BeaconCodec.encode(beacon);
        const multicastAddr = this.options.multicastAddr ?? '224.0.0.251';
        const port = this.options.port ?? 5353;
        this.socket.send(encoded, port, multicastAddr);
    }
}
//# sourceMappingURL=MdnsPeerSource.js.map