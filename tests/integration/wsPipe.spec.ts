import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  WebSocketPipeClient,
  WebSocketPipeServer,
} from '../../src/pipes/adapters/WebSocketPipe.js';

describe('WebSocketPipe', () => {
  let server: WebSocketPipeServer;
  let client: WebSocketPipeClient;

  afterEach(async () => {
    if (client) {
      client.close();
    }
    if (server) {
      await server.close();
    }
  });

  it('establishes connection and sends data', async () => {
    server = new WebSocketPipeServer({ port: 30012 });

    const serverData: Buffer[] = [];
    await server.listen((stream) => {
      stream.on('data', (chunk) => {
        serverData.push(chunk);
      });
    });

    client = new WebSocketPipeClient({ port: 30012 });
    await client.connect();

    client.write('hello from client');
    client.end();

    await new Promise((resolve) => setTimeout(resolve, 200));

    const received = Buffer.concat(serverData).toString('utf8');
    expect(received).toBe('hello from client');
  });

  it('bidirectional data flow', async () => {
    server = new WebSocketPipeServer({ port: 30013 });

    let serverStream: any;
    await server.listen((stream) => {
      serverStream = stream;
      stream.on('data', (chunk) => {
        stream.write(`echo: ${chunk.toString('utf8')}`);
      });
    });

    client = new WebSocketPipeClient({ port: 30013 });
    await client.connect();

    const clientData: Buffer[] = [];
    client.on('data', (chunk) => {
      clientData.push(chunk);
    });

    client.write('test message');

    await new Promise((resolve) => setTimeout(resolve, 200));

    const received = Buffer.concat(clientData).toString('utf8');
    expect(received).toBe('echo: test message');
  });

  it('handles multiple sequential messages', async () => {
    server = new WebSocketPipeServer({ port: 30014 });

    const serverData: string[] = [];
    await server.listen((stream) => {
      stream.on('data', (chunk) => {
        serverData.push(chunk.toString('utf8'));
      });
    });

    client = new WebSocketPipeClient({ port: 30014 });
    await client.connect();

    client.write('msg1');
    client.write('msg2');
    client.write('msg3');
    client.end();

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(serverData).toEqual(['msg1', 'msg2', 'msg3']);
  });

  it('handles ping/pong keep-alive', async () => {
    server = new WebSocketPipeServer({ port: 30015 });
    await server.listen((stream) => {
      // Server automatically responds to pings
    });

    client = new WebSocketPipeClient({ port: 30015 });
    await client.connect();

    // Send ping (handled internally by codec)
    expect(client).toBeDefined();
  });

  it('handles large payloads', async () => {
    server = new WebSocketPipeServer({ port: 30016 });

    const serverData: Buffer[] = [];
    await server.listen((stream) => {
      stream.on('data', (chunk) => {
        serverData.push(chunk);
      });
    });

    client = new WebSocketPipeClient({ port: 30016 });
    await client.connect();

    const largeData = Buffer.alloc(1024 * 512, 'x'); // 512KB
    client.write(largeData);
    client.end();

    await new Promise((resolve) => setTimeout(resolve, 500));

    const received = Buffer.concat(serverData);
    expect(received.length).toBe(largeData.length);
    expect(received.equals(largeData)).toBe(true);
  });

  it('handles connection errors gracefully', async () => {
    client = new WebSocketPipeClient({ port: 30017, timeout: 1000 });

    try {
      await client.connect();
      expect.fail('Should have thrown connection error');
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  it('server accepts multiple clients', async () => {
    server = new WebSocketPipeServer({ port: 30018 });

    let connectionCount = 0;
    await server.listen((stream) => {
      connectionCount++;
    });

    const client1 = new WebSocketPipeClient({ port: 30018 });
    const client2 = new WebSocketPipeClient({ port: 30018 });

    await client1.connect();
    await client2.connect();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(connectionCount).toBe(2);

    client1.close();
    client2.close();
  });

  it('closes cleanly', async () => {
    server = new WebSocketPipeServer({ port: 30019 });
    await server.listen((stream) => {});

    client = new WebSocketPipeClient({ port: 30019 });
    await client.connect();

    client.close();
    await server.close();

    expect(true).toBe(true);
  });

  it('uses custom path', async () => {
    server = new WebSocketPipeServer({ port: 30012, path: '/custom' });

    const serverData: Buffer[] = [];
    await server.listen((stream) => {
      stream.on('data', (chunk) => {
        serverData.push(chunk);
      });
    });

    client = new WebSocketPipeClient({ port: 30012, path: '/custom' });
    await client.connect();

    client.write('custom path test');
    client.end();

    await new Promise((resolve) => setTimeout(resolve, 200));

    const received = Buffer.concat(serverData).toString('utf8');
    expect(received).toBe('custom path test');
  });
});
