import { describe, it, expect, afterEach } from 'vitest';
import { TCPPipeClient, TCPPipeServer } from '../../src/pipes/adapters/TCPPipe.js';

describe('TCPPipe', () => {
  let server: TCPPipeServer;
  let client: TCPPipeClient;

  afterEach(async () => {
    if (client) client.close();
    if (server) await server.close();
  });

  it('bidirectional data flow', async () => {
    server = new TCPPipeServer({ port: 30010 });
    await server.listen((stream) => {
      stream.on('data', (chunk) => stream.write(`echo: ${chunk}`));
    });

    client = new TCPPipeClient({ port: 30010 });
    await client.connect();

    const data: Buffer[] = [];
    client.on('data', (c) => data.push(c));
    client.write('test');

    await new Promise((r) => setTimeout(r, 200));
    expect(Buffer.concat(data).toString()).toBe('echo: test');
  });
});
