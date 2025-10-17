#!/usr/bin/env tsx
import { TCPPipeClient } from '../../../src/pipes/adapters/TCPPipe.js';

console.log('[Client] Connecting to server on port 30018...');

const client = new TCPPipeClient({ port: 30018 });

client.connect().then(() => {
  console.log('[Client] Connected! Receiving data:\n');

  client.on('data', (chunk: Buffer) => {
    process.stdout.write(`[Client] ${chunk.toString('utf8')}\n`);
  });

  client.on('end', () => {
    console.log('\n[Client] Connection closed');
    process.exit(0);
  });

  client.on('error', (err) => {
    console.error('[Client] Error:', err);
    process.exit(1);
  });
}).catch((err) => {
  console.error('[Client] Failed to connect:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n[Client] Disconnecting...');
  client.close();
  process.exit(0);
});
