import { describe, it, expect } from 'vitest';
import { MessageChannel } from 'node:worker_threads';
import { WorkerBusAdapter } from '../../src/control/adapters/WorkerBusAdapter.js';
import { WorkerPipe } from '../../src/pipes/adapters/WorkerPipe.js';

describe('WorkerBusAdapter', () => {
  it('round-trip a control frame', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerBusAdapter(port1);
    const adapter2 = new WorkerBusAdapter(port2);

    const received: any[] = [];
    const topic2 = adapter2.topic('test');
    topic2.on('data', (data) => {
      received.push(data);
    });

    await new Promise(resolve => setImmediate(resolve));

    const topic1 = adapter1.topic('test');
    topic1.write({ kind: 'event', type: 'test', id: 'test-1', ts: 123 });

    await new Promise(resolve => setImmediate(resolve));

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ kind: 'event', type: 'test', id: 'test-1', ts: 123 });

    adapter1.close();
    adapter2.close();
  });
});

describe('WorkerPipe', () => {
  it('round-trip a Buffer', async () => {
    const { port1, port2 } = new MessageChannel();
    const pipe1 = new WorkerPipe(port1).createDuplex();
    const pipe2 = new WorkerPipe(port2).createDuplex();

    const received: Buffer[] = [];
    pipe2.on('data', (chunk) => {
      received.push(chunk);
    });

    const testBuffer = Buffer.from('hello worker');
    pipe1.write(testBuffer);

    await new Promise(resolve => setImmediate(resolve));

    expect(received).toHaveLength(1);
    expect(Buffer.isBuffer(received[0])).toBe(true);
    expect(received[0].toString()).toBe('hello worker');

    pipe1.end();
    pipe2.end();
  });
});

describe('Worker handshake', () => {
  it('assert handshake event structure', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerBusAdapter(port1);
    const adapter2 = new WorkerBusAdapter(port2);

    const received: any[] = [];
    const helloTopic = adapter2.topic('control.hello');
    helloTopic.on('data', (data) => {
      received.push(data);
    });

    await new Promise(resolve => setImmediate(resolve));

    const topic1 = adapter1.topic('control.hello');
    const handshakeEvent = {
      kind: 'event',
      type: 'worker.ready',
      id: 'node-42',
      ts: Date.now(),
      payload: { nodeId: 'node-42' }
    };
    topic1.write(handshakeEvent);

    await new Promise(resolve => setImmediate(resolve));

    expect(received).toHaveLength(1);
    expect(received[0]).toHaveProperty('kind', 'event');
    expect(received[0]).toHaveProperty('type', 'worker.ready');
    expect(received[0]).toHaveProperty('id', 'node-42');
    expect(received[0]).toHaveProperty('ts');
    expect(received[0]).toHaveProperty('payload');
    expect(received[0].payload).toHaveProperty('nodeId', 'node-42');

    adapter1.close();
    adapter2.close();
  });
});
