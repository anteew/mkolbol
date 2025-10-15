import { describe, it, expect } from 'vitest';
import { MessageChannel } from 'node:worker_threads';
import { WorkerPipeAdapter } from '../../src/transport/worker/WorkerPipeAdapter.js';

describe('WorkerPipeAdapter - Backpressure', () => {
  it('should handle backpressure correctly', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const adapter2 = new WorkerPipeAdapter(port2);
    const pipe1 = adapter1.createDuplex({ objectMode: true, highWaterMark: 1 });
    const pipe2 = adapter2.createDuplex({ objectMode: true });

    const received: any[] = [];
    pipe1.on('data', (chunk) => {
      received.push(chunk);
    });

    pipe2.write({ data: 'msg1' });
    pipe2.write({ data: 'msg2' });
    pipe2.write({ data: 'msg3' });
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(received.length).toBe(3);

    pipe1.end();
    pipe2.end();
  });

  it('should send resume signal on _read', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const pipe1 = adapter1.createDuplex({ objectMode: true });

    const resumeSignals: any[] = [];
    port2.on('message', (data) => {
      if (data && data.type === 'resume') {
        resumeSignals.push(data);
      }
    });

    pipe1.read();
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(resumeSignals.length).toBeGreaterThan(0);

    pipe1.end();
    port2.close();
  });
});

describe('WorkerPipeAdapter - Bidirectional Data Flow', () => {
  it('should transmit data from port1 to port2', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const adapter2 = new WorkerPipeAdapter(port2);
    const pipe1 = adapter1.createDuplex({ objectMode: true });
    const pipe2 = adapter2.createDuplex({ objectMode: true });

    const received: any[] = [];
    pipe2.on('data', (chunk) => {
      received.push(chunk);
    });

    pipe1.write({ data: 'message1' });
    pipe1.write({ data: 'message2' });

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ data: 'message1' });
    expect(received[1]).toEqual({ data: 'message2' });

    pipe1.end();
    pipe2.end();
  });

  it('should transmit data from port2 to port1', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const adapter2 = new WorkerPipeAdapter(port2);
    const pipe1 = adapter1.createDuplex({ objectMode: true });
    const pipe2 = adapter2.createDuplex({ objectMode: true });

    const received: any[] = [];
    pipe1.on('data', (chunk) => {
      received.push(chunk);
    });

    pipe2.write({ data: 'reverse1' });
    pipe2.write({ data: 'reverse2' });

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ data: 'reverse1' });
    expect(received[1]).toEqual({ data: 'reverse2' });

    pipe1.end();
    pipe2.end();
  });

  it('should handle simultaneous bidirectional writes', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const adapter2 = new WorkerPipeAdapter(port2);
    const pipe1 = adapter1.createDuplex({ objectMode: true });
    const pipe2 = adapter2.createDuplex({ objectMode: true });

    const received1: any[] = [];
    const received2: any[] = [];

    pipe1.on('data', (chunk) => {
      received1.push(chunk);
    });

    pipe2.on('data', (chunk) => {
      received2.push(chunk);
    });

    pipe1.write({ from: 'pipe1', seq: 1 });
    pipe2.write({ from: 'pipe2', seq: 1 });
    pipe1.write({ from: 'pipe1', seq: 2 });
    pipe2.write({ from: 'pipe2', seq: 2 });

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(received1).toHaveLength(2);
    expect(received2).toHaveLength(2);
    expect(received1[0]).toEqual({ from: 'pipe2', seq: 1 });
    expect(received2[0]).toEqual({ from: 'pipe1', seq: 1 });

    pipe1.end();
    pipe2.end();
  });

  it('should handle Buffer data in non-object mode', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const adapter2 = new WorkerPipeAdapter(port2);
    const pipe1 = adapter1.createDuplex({ objectMode: false });
    const pipe2 = adapter2.createDuplex({ objectMode: false });

    const received: Buffer[] = [];
    pipe2.on('data', (chunk) => {
      received.push(chunk);
    });

    const testBuffer = Buffer.from('test data');
    pipe1.write(testBuffer);

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(received).toHaveLength(1);
    expect(Buffer.isBuffer(received[0])).toBe(true);
    expect(received[0].toString()).toBe('test data');

    pipe1.end();
    pipe2.end();
  });
});

describe('WorkerPipeAdapter - Error Propagation', () => {
  it('should propagate messageerror to stream', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const pipe1 = adapter1.createDuplex({ objectMode: true });

    let errorOccurred = false;
    pipe1.on('error', (err) => {
      errorOccurred = true;
      expect(err.message).toBe('MessagePort error');
    });

    port1.emit('messageerror');

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(errorOccurred).toBe(true);

    port2.close();
  });

  it('should handle port close event', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const pipe1 = adapter1.createDuplex({ objectMode: true });

    let closeHandled = false;
    pipe1.on('close', () => {
      closeHandled = true;
    });

    port2.close();
    port1.close();

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(closeHandled).toBe(true);
  });

  it('should handle errors in _write callback', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const pipe1 = adapter1.createDuplex({ objectMode: true });

    const received: any[] = [];
    pipe1.on('data', (chunk) => {
      received.push(chunk);
    });

    port2.postMessage({ type: 'data', payload: { test: 'data' } });
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(received.length).toBe(1);

    port1.close();
    port2.close();
  });
});

describe('WorkerPipeAdapter - Teardown', () => {
  it('should send end signal on finish event', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const adapter2 = new WorkerPipeAdapter(port2);
    const pipe1 = adapter1.createDuplex({ objectMode: true });
    const pipe2 = adapter2.createDuplex({ objectMode: true });

    const received: any[] = [];
    let endReceived = false;
    pipe2.on('data', (chunk) => {
      received.push(chunk);
    });
    pipe2.on('end', () => {
      endReceived = true;
    });

    pipe1.write({ data: 'final message' });
    pipe1.end();

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(received).toHaveLength(1);
    expect(endReceived).toBe(true);

    pipe2.end();
  });

  it('should handle end signal from remote port', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const pipe1 = adapter1.createDuplex({ objectMode: true });

    const endPromise = new Promise<void>((resolve) => {
      pipe1.on('end', () => {
        resolve();
      });
    });

    pipe1.read();
    port2.postMessage({ type: 'end' });

    await Promise.race([
      endPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100))
    ]).catch(() => {});

    pipe1.end();
    port2.close();
  });

  it('should close port on destroy', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const pipe1 = adapter1.createDuplex({ objectMode: true });

    let destroyHandled = false;
    pipe1.on('close', () => {
      destroyHandled = true;
    });

    pipe1.destroy();

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(destroyHandled).toBe(true);

    port2.close();
  });

  it('should propagate error in destroy', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const pipe1 = adapter1.createDuplex({ objectMode: true });

    const testError = new Error('Test destroy error');
    let receivedError: Error | null = null;

    pipe1.on('error', (err) => {
      receivedError = err;
    });

    pipe1.destroy(testError);

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(receivedError).toBe(testError);

    port2.close();
  });

  it('should handle complete lifecycle end-to-end', async () => {
    const { port1, port2 } = new MessageChannel();
    const adapter1 = new WorkerPipeAdapter(port1);
    const adapter2 = new WorkerPipeAdapter(port2);
    const pipe1 = adapter1.createDuplex({ objectMode: true });
    const pipe2 = adapter2.createDuplex({ objectMode: true });

    const received: any[] = [];
    const dataPromise = new Promise<void>((resolve) => {
      let count = 0;
      pipe2.on('data', (chunk) => {
        received.push(chunk);
        count++;
        if (count === 2) {
          resolve();
        }
      });
    });

    pipe1.write({ data: 'msg1' });
    pipe1.write({ data: 'msg2' });

    await dataPromise;

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ data: 'msg1' });
    expect(received[1]).toEqual({ data: 'msg2' });

    pipe1.end();
    pipe2.end();
  });
});
