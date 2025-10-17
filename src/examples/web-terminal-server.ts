import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { PTYServerWrapper } from '../wrappers/PTYServerWrapper.js';
import type { ExternalServerManifest } from '../types.js';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { WebSocketServer } from 'ws';

const WS_PORT = 3001;
const HTML_PORT = 9090;

async function main() {
  console.log('🚀 Starting mkolbol web terminal server...');

  const kernel = new Kernel();
  const hostess = new Hostess();

  // Spawn bash PTY
  const pty = new PTYServerWrapper(kernel, hostess, {
    fqdn: 'localhost',
    servername: 'web-bash',
    classHex: '0x0000',
    owner: 'demo',
    auth: 'no',
    authMechanism: 'none',
    terminals: [
      { name: 'input', type: 'local', direction: 'input' },
      { name: 'output', type: 'local', direction: 'output' },
      { name: 'error', type: 'local', direction: 'output' },
    ],
    capabilities: { type: 'source', accepts: [], produces: [] },
    command: 'bash',
    args: ['-l'],
    env: process.env,
    cwd: process.cwd(),
    ioMode: 'pty',
    restart: 'never',
  } as ExternalServerManifest);

  await pty.spawn();

  // WebSocket: browser <-> PTY
  const wss = new WebSocketServer({ port: WS_PORT });
  console.log('🔌 WebSocket server running on port', WS_PORT);

  wss.on('connection', (ws) => {
    // PTY → WS
    const onData = (chunk: Buffer) => {
      ws.readyState === ws.OPEN && ws.send(chunk);
    };
    pty.outputPipe.on('data', onData);

    // WS → PTY
    ws.on('message', (msg) => {
      const buf = Buffer.isBuffer(msg) ? msg : Buffer.from(msg as any);
      pty.inputPipe.write(buf);
    });

    ws.on('close', () => {
      pty.outputPipe.off('data', onData);
    });
  });

  // Static HTTP server for the terminal page
  const publicDir = path.resolve(process.cwd(), 'examples', 'web-terminal', 'public');
  const server = http.createServer((req, res) => {
    const p = req.url === '/' ? '/terminal.html' : req.url!;
    const fp = path.join(publicDir, p);
    fs.readFile(fp, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not Found');
      }
      const ext = path.extname(fp);
      const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : 'text/plain';
      res.writeHead(200, { 'content-type': type });
      res.end(data);
    });
  });
  server.listen(HTML_PORT, () => {
    console.log(`✨ Open http://localhost:${HTML_PORT} in your browser`);
  });

  const onSignal = async () => {
    await pty.shutdown();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
}

main().catch((err) => {
  console.error('[web-terminal] Error:', err);
  process.exit(1);
});
