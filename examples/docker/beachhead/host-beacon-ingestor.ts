import dgram from 'node:dgram';
import { Hostess } from '../../../src/hostess/Hostess.js';
import { BeaconCodec } from '../../../src/discovery/BeaconCodec.js';

const PORT = Number(process.env.BEACON_PORT || 53530);

async function main() {
  const hostess = new Hostess();
  hostess.startEvictionLoop();

  const udp = dgram.createSocket('udp4');
  udp.on('message', (msg) => {
    const b = BeaconCodec.decode(msg);
    if (!b) return;
    const id = `${b.hostId}:${b.addr}`;
    hostess.registerEndpoint(id, { type: b.proto, coordinates: b.addr });
    console.log('[ingestor] endpoint registered:', id);
  });
  udp.bind(PORT, () => {
    console.log(`[ingestor] listening for beacons on udp://0.0.0.0:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
