import dgram from 'node:dgram';
import os from 'node:os';
import { TCPPipeServer } from '../../../src/pipes/adapters/TCPPipe.js';
import { BeaconCodec, Beacon } from '../../../src/discovery/BeaconCodec.js';

const PORT = Number(process.env.PORT || 30018);
const DISCOVERY = process.env.DISCOVERY_TARGET || 'host.docker.internal:53530';
const CLASS_HEX = process.env.CLASS_HEX || '0xBEECH';
const SERVERNAME = process.env.SERVERNAME || 'beachhead';
const OWNER = process.env.OWNER || os.hostname();

async function main() {
  const server = new TCPPipeServer({ port: PORT });
  console.log(`[beachhead] Listening on TCP ${PORT}`);

  server.listen((stream) => {
    console.log('[beachhead] client connected');
    stream.on('data', (b) => {
      // Simple echo for now
      stream.write(b);
    });
    stream.on('end', () => console.log('[beachhead] client disconnected'));
  });

  // Send UDP beacon to discovery target
  const [host, portStr] = DISCOVERY.split(':');
  const udp = dgram.createSocket('udp4');
  const beacon: Beacon = {
    hostId: OWNER,
    addr: `tcp://beachhead:${PORT}`,
    proto: 'tcp',
    versions: ['v1'],
    caps: ['echo'],
    ttl: 8000,
  };
  const encoded = BeaconCodec.encode(beacon);
  setInterval(() => {
    udp.send(encoded, Number(portStr), host, (err) => {
      if (err) console.error('[beachhead] beacon error:', err.message);
    });
  }, 3000);

  console.log(`[beachhead] sending beacons to ${DISCOVERY} every 3s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
