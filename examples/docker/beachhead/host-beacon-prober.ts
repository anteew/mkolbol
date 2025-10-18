import dgram from 'node:dgram';
import net from 'node:net';
import WebSocket from 'ws';
import { Hostess } from '../../../src/hostess/Hostess.js';
import { BeaconCodec } from '../../../src/discovery/BeaconCodec.js';

type ActiveConn = {
  coord: string;
  close: () => void;
};

const BEACON_PORT = Number(process.env.BEACON_PORT || 53530);
const PING = Buffer.from('PING\n');

async function main() {
  const hostess = new Hostess();
  hostess.startEvictionLoop();
  const active = new Map<string, ActiveConn>();

  const udp = dgram.createSocket('udp4');
  udp.on('message', async (msg) => {
    const b = BeaconCodec.decode(msg);
    if (!b) return;
    const id = `${b.hostId}:${b.addr}`;

    // Register endpoint snapshot
    hostess.registerEndpoint(id, { type: b.proto, coordinates: b.addr });

    // If already connected, refresh and skip
    if (active.has(id)) return;

    try {
      if (b.proto === 'tcp' && b.addr.startsWith('tcp://')) {
        const { host, port } = parseTcp(b.addr);
        const socket = net.connect({ host, port: Number(port) });
        socket.once('connect', () => {
          console.log('[prober] connected tcp:', b.addr);
          socket.write(PING);
        });
        socket.on('data', (buf) => {
          console.log('[prober] recv:', buf.toString('utf8').trim());
        });
        socket.on('error', (e) => console.warn('[prober] tcp error:', e.message));
        socket.on('close', () => {
          console.log('[prober] tcp closed:', b.addr);
          active.delete(id);
        });
        active.set(id, { coord: b.addr, close: () => socket.destroy() });
      } else if ((b.proto === 'ws' || b.proto === 'wss') && b.addr.startsWith('ws')) {
        const ws = new WebSocket(b.addr);
        ws.on('open', () => {
          console.log('[prober] connected ws:', b.addr);
          ws.send(PING);
        });
        ws.on('message', (d) => console.log('[prober] ws recv:', d.toString()));
        ws.on('error', (e) => console.warn('[prober] ws error:', e.message));
        ws.on('close', () => {
          console.log('[prober] ws closed:', b.addr);
          active.delete(id);
        });
        active.set(id, { coord: b.addr, close: () => ws.close() });
      }
    } catch (e: any) {
      console.warn('[prober] connect error:', e?.message || String(e));
    }
  });
  udp.bind(BEACON_PORT, () => {
    console.log(`[prober] listening for beacons on udp://0.0.0.0:${BEACON_PORT}`);
  });
}

function parseTcp(coord: string): { host: string; port: string } {
  // tcp://host:port
  const s = coord.replace('tcp://', '');
  const [host, port] = s.split(':');
  return { host, port };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
