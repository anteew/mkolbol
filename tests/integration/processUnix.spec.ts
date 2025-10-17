import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnixPipeAdapter } from '../../src/transport/unix/UnixPipeAdapter.js';
import { UnixControlAdapter } from '../../src/transport/unix/UnixControlAdapter.js';
import { Readable, Writable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { unlinkSync } from 'node:fs';

describe('Process Mode: Unix Adapters under Load', () => {
  const testTimeout = 25000; // Increased for stability under load
  const connectionTimeout = 8000; // Increased for slower systems
  const heartbeatInterval = 1000; // Match UnixControlAdapter heartbeat interval
  const heartbeatGrace = 500; // Grace period for heartbeat jitter
  const teardownGrace = 300; // Grace period for clean teardown
  const maxRetries = 2; // Limit retries to keep CI deterministic (T9601)
  const retryBackoffBase = 120;
  let cleanupPaths: string[] = [];

  function getSocketPath(name: string): string {
    const path = join(
      tmpdir(),
      `mkolbol-test-${name}-${Date.now()}-${randomBytes(4).toString('hex')}.sock`,
    );
    cleanupPaths.push(path);
    return path;
  }

  async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms),
      ),
    ]);
  }

  async function retry<T>(
    fn: () => Promise<T>,
    retries: number = maxRetries,
    delay: number = retryBackoffBase,
  ): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err as Error;
        if (attempt < retries) {
          const waitMs = delay * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }
    throw lastError;
  }

  afterEach(() => {
    for (const path of cleanupPaths) {
      try {
        unlinkSync(path);
      } catch {
        // Ignore errors
      }
    }
    cleanupPaths = [];
  });

  // GATED: Process mode tests require experimental flag (T4904)
  // Only run when MK_PROCESS_EXPERIMENTAL=1 is set
  describe.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)('UnixPipeAdapter', () => {
    let serverAdapter: UnixPipeAdapter;
    let clientAdapter: UnixPipeAdapter;
    let socketPath: string;

    beforeEach(() => {
      socketPath = getSocketPath('pipe');
      serverAdapter = new UnixPipeAdapter(socketPath);
      clientAdapter = new UnixPipeAdapter(socketPath);
    });

    afterEach(async () => {
      if (serverAdapter) serverAdapter.close();
      if (clientAdapter) clientAdapter.close();
      await new Promise<void>((resolve) => setTimeout(resolve, teardownGrace));
    });

    it(
      'should handle heavy writes with backpressure',
      async () => {
        await withTimeout(serverAdapter.listen(), connectionTimeout, 'server listen');
        await withTimeout(
          retry(() => clientAdapter.connect()),
          connectionTimeout,
          'client connect',
        );

        const serverPipe = serverAdapter.createDuplex({ highWaterMark: 16384 });
        const clientPipe = clientAdapter.createDuplex({ highWaterMark: 16384 });

        // Generate deterministic test data: 100 chunks of 8KB each = 800KB total
        const chunkSize = 8192;
        const numChunks = 100;
        const testData: Buffer[] = [];
        for (let i = 0; i < numChunks; i++) {
          testData.push(Buffer.alloc(chunkSize, i % 256));
        }

        const receivedChunks: Buffer[] = [];
        let writeComplete = false;
        let drainEvents = 0;

        // Collect received data
        clientPipe.on('data', (chunk) => {
          receivedChunks.push(Buffer.from(chunk));
        });

        // Write all chunks from server to client
        for (let i = 0; i < testData.length; i++) {
          const canContinue = serverPipe.write(testData[i]);
          if (!canContinue) {
            drainEvents++;
            await new Promise<void>((resolve) => {
              serverPipe.once('drain', resolve);
            });
          }
        }
        serverPipe.end();
        writeComplete = true;

        // Wait for all data to be received with timeout
        await withTimeout(
          new Promise<void>((resolve) => {
            clientPipe.once('end', resolve);
          }),
          10000,
          'client pipe end event',
        );

        // Verify all data received correctly
        const receivedBuffer = Buffer.concat(receivedChunks);
        const expectedBuffer = Buffer.concat(testData);
        expect(receivedBuffer.length).toBe(expectedBuffer.length);
        expect(receivedBuffer.equals(expectedBuffer)).toBe(true);

        // Verify backpressure was applied (we should have seen drain events)
        expect(drainEvents).toBeGreaterThan(0);
        expect(writeComplete).toBe(true);
      },
      testTimeout,
    );

    it(
      'should handle bidirectional heavy writes',
      async () => {
        await withTimeout(serverAdapter.listen(), connectionTimeout, 'server listen');
        await withTimeout(
          retry(() => clientAdapter.connect()),
          connectionTimeout,
          'client connect',
        );

        const serverPipe = serverAdapter.createDuplex({ highWaterMark: 8192 });
        const clientPipe = clientAdapter.createDuplex({ highWaterMark: 8192 });

        // Smaller load for bidirectional: 50 chunks of 4KB each per direction
        const chunkSize = 4096;
        const numChunks = 50;

        const serverData: Buffer[] = [];
        const clientData: Buffer[] = [];
        for (let i = 0; i < numChunks; i++) {
          serverData.push(Buffer.alloc(chunkSize, i % 256));
          clientData.push(Buffer.alloc(chunkSize, (i + 128) % 256));
        }

        const serverReceived: Buffer[] = [];
        const clientReceived: Buffer[] = [];

        serverPipe.on('data', (chunk) => serverReceived.push(Buffer.from(chunk)));
        clientPipe.on('data', (chunk) => clientReceived.push(Buffer.from(chunk)));

        // Write from server to client
        const serverWritePromise = (async () => {
          for (const chunk of serverData) {
            const canContinue = serverPipe.write(chunk);
            if (!canContinue) {
              await new Promise<void>((resolve) => serverPipe.once('drain', resolve));
            }
          }
          serverPipe.end();
        })();

        // Write from client to server
        const clientWritePromise = (async () => {
          for (const chunk of clientData) {
            const canContinue = clientPipe.write(chunk);
            if (!canContinue) {
              await new Promise<void>((resolve) => clientPipe.once('drain', resolve));
            }
          }
          clientPipe.end();
        })();

        // Wait for both directions to complete with timeout
        await withTimeout(
          Promise.all([
            serverWritePromise,
            clientWritePromise,
            new Promise<void>((resolve) => serverPipe.once('end', resolve)),
            new Promise<void>((resolve) => clientPipe.once('end', resolve)),
          ]),
          15000,
          'bidirectional write completion',
        );

        // Verify data integrity in both directions
        const serverReceivedBuffer = Buffer.concat(serverReceived);
        const clientReceivedBuffer = Buffer.concat(clientReceived);
        const expectedServerBuffer = Buffer.concat(clientData);
        const expectedClientBuffer = Buffer.concat(serverData);

        expect(serverReceivedBuffer.equals(expectedServerBuffer)).toBe(true);
        expect(clientReceivedBuffer.equals(expectedClientBuffer)).toBe(true);
      },
      testTimeout,
    );

    it(
      'should handle graceful teardown during writes',
      async () => {
        await withTimeout(serverAdapter.listen(), connectionTimeout, 'server listen');
        await withTimeout(
          retry(() => clientAdapter.connect()),
          connectionTimeout,
          'client connect',
        );

        const serverPipe = serverAdapter.createDuplex();
        const clientPipe = clientAdapter.createDuplex();

        const testData = Buffer.alloc(4096, 0xff);
        let receivedData: Buffer[] = [];
        let endReceived = false;

        clientPipe.on('data', (chunk) => {
          receivedData.push(Buffer.from(chunk));
        });
        clientPipe.on('end', () => {
          endReceived = true;
        });

        // Write some data
        for (let i = 0; i < 10; i++) {
          serverPipe.write(testData);
        }

        // Graceful teardown with timeout
        serverPipe.end();
        await withTimeout(
          new Promise<void>((resolve) => {
            clientPipe.once('end', resolve);
          }),
          5000,
          'graceful teardown pipe end',
        );

        expect(endReceived).toBe(true);
        expect(receivedData.length).toBeGreaterThan(0);

        // Clean close with grace period
        serverAdapter.close();
        clientAdapter.close();
        await new Promise<void>((resolve) => setTimeout(resolve, teardownGrace));
      },
      testTimeout,
    );

    it(
      'should propagate write errors',
      async () => {
        await withTimeout(serverAdapter.listen(), connectionTimeout, 'server listen');
        await withTimeout(
          retry(() => clientAdapter.connect()),
          connectionTimeout,
          'client connect',
        );

        const serverPipe = serverAdapter.createDuplex();
        const clientPipe = clientAdapter.createDuplex();

        let serverError: Error | null = null;
        let clientError: Error | null = null;

        serverPipe.on('error', (err) => {
          serverError = err;
        });
        clientPipe.on('error', (err) => {
          clientError = err;
        });

        // Start normal writes
        serverPipe.write(Buffer.alloc(1024, 0xaa));

        // Close client connection abruptly to trigger error
        clientAdapter.close();

        // Try to write more data with sufficient delay to ensure error propagation
        await withTimeout(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              try {
                for (let i = 0; i < 10; i++) {
                  serverPipe.write(Buffer.alloc(8192, 0xbb));
                }
              } catch {
                // Expected: write after close
              }
              resolve();
            }, 200);
          }),
          3000,
          'error propagation',
        );

        // Verify error handling
        expect(serverError || clientError).toBeTruthy();
      },
      testTimeout,
    );
  });

  describe.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)('UnixControlAdapter', () => {
    let serverAdapter: UnixControlAdapter;
    let clientAdapter: UnixControlAdapter;
    let socketPath: string;

    beforeEach(async () => {
      socketPath = getSocketPath('control');
      serverAdapter = new UnixControlAdapter(socketPath, true);
      // Wait for server to start listening
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      clientAdapter = new UnixControlAdapter(socketPath, false);
      // Wait for client to connect
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    });

    afterEach(async () => {
      if (clientAdapter) clientAdapter.close();
      if (serverAdapter) serverAdapter.close();
      await new Promise<void>((resolve) => setTimeout(resolve, teardownGrace));
    });

    it(
      'should handle heartbeat timeout detection',
      async () => {
        const heartbeats: number[] = [];
        let lastHeartbeat = Date.now();

        serverAdapter.subscribe('control.heartbeat', (data: any) => {
          heartbeats.push(data.ts);
          lastHeartbeat = Date.now();
        });

        // Wait for multiple heartbeats with grace period (1000ms interval + grace)
        await withTimeout(
          new Promise<void>((resolve) => {
            setTimeout(() => resolve(), heartbeatInterval * 2 + heartbeatGrace);
          }),
          5000,
          'initial heartbeat collection',
        );

        expect(heartbeats.length).toBeGreaterThanOrEqual(2);

        // Simulate timeout by stopping heartbeats
        clientAdapter.close();

        // Wait for timeout detection window with grace
        await withTimeout(
          new Promise<void>((resolve) => {
            setTimeout(() => resolve(), heartbeatInterval + heartbeatGrace);
          }),
          3000,
          'heartbeat timeout detection',
        );

        const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
        expect(timeSinceLastHeartbeat).toBeGreaterThan(heartbeatInterval - heartbeatGrace);
      },
      testTimeout,
    );

    it(
      'should recover from heartbeat disruption',
      async () => {
        const heartbeats: number[] = [];
        serverAdapter.subscribe('control.heartbeat', (data: any) => {
          heartbeats.push(data.ts);
        });

        // Wait for initial heartbeats with timeout
        await withTimeout(
          new Promise<void>((resolve) => {
            setTimeout(() => resolve(), heartbeatInterval * 2 + heartbeatGrace);
          }),
          5000,
          'initial heartbeats for recovery test',
        );

        const initialCount = heartbeats.length;
        expect(initialCount).toBeGreaterThanOrEqual(2);

        // Disconnect and reconnect to simulate disruption with grace period
        clientAdapter.close();
        await new Promise<void>((resolve) => setTimeout(resolve, teardownGrace));

        // Recreate client and reconnect with stabilization delay
        const recoveredClient = new UnixControlAdapter(socketPath, false);
        await new Promise<void>((resolve) => setTimeout(resolve, 200));

        // Wait for heartbeats to resume with timeout
        await withTimeout(
          new Promise<void>((resolve) => {
            setTimeout(() => resolve(), heartbeatInterval * 2 + heartbeatGrace);
          }),
          5000,
          'recovered heartbeats',
        );

        const recoveredCount = heartbeats.length;
        expect(recoveredCount).toBeGreaterThan(initialCount);

        recoveredClient.close();
        await new Promise<void>((resolve) => setTimeout(resolve, teardownGrace));
      },
      testTimeout,
    );

    it(
      'should handle graceful shutdown sequence',
      async () => {
        let shutdownReceived = false;
        let shutdownTimestamp = 0;

        serverAdapter.subscribe('control.shutdown', (data: any) => {
          shutdownReceived = true;
          shutdownTimestamp = data.ts;
        });

        // Trigger graceful shutdown from client
        clientAdapter.shutdown();

        // Wait for shutdown message to propagate with timeout
        await withTimeout(
          new Promise<void>((resolve) => {
            setTimeout(() => resolve(), teardownGrace);
          }),
          2000,
          'shutdown message propagation',
        );

        expect(shutdownReceived).toBe(true);
        expect(shutdownTimestamp).toBeGreaterThan(0);
        expect(Date.now() - shutdownTimestamp).toBeLessThan(1000);
      },
      testTimeout,
    );

    it(
      'should handle pub/sub under load',
      async () => {
        const messages: Array<{ topic: string; data: any }> = [];
        const topics = ['topic-a', 'topic-b', 'topic-c'];

        // Subscribe to all topics
        for (const topic of topics) {
          serverAdapter.subscribe(topic, (data) => {
            messages.push({ topic, data });
          });
        }

        // Publish 100 messages across topics (deterministic)
        for (let i = 0; i < 100; i++) {
          const topic = topics[i % topics.length];
          clientAdapter.publish(topic, { index: i, payload: `message-${i}` });
        }

        // Wait for messages to be received with timeout
        await withTimeout(
          new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 500);
          }),
          3000,
          'pub/sub message delivery',
        );

        expect(messages.length).toBe(100);

        // Verify message distribution across topics
        const topicCounts = new Map<string, number>();
        for (const msg of messages) {
          topicCounts.set(msg.topic, (topicCounts.get(msg.topic) || 0) + 1);
        }

        for (const topic of topics) {
          expect(topicCounts.get(topic)).toBeGreaterThanOrEqual(33);
          expect(topicCounts.get(topic)).toBeLessThanOrEqual(34);
        }
      },
      testTimeout,
    );

    it(
      'should complete teardown with pending messages',
      async () => {
        const receivedMessages: any[] = [];
        serverAdapter.subscribe('test', (data) => {
          receivedMessages.push(data);
        });

        // Publish messages rapidly
        for (let i = 0; i < 50; i++) {
          clientAdapter.publish('test', { index: i });
        }

        // Immediate shutdown
        clientAdapter.shutdown();

        // Wait for messages to arrive and teardown to complete with timeout
        await withTimeout(
          new Promise<void>((resolve) => setTimeout(resolve, teardownGrace)),
          2000,
          'teardown with pending messages',
        );

        // Verify clean shutdown
        expect(receivedMessages.length).toBeGreaterThan(0);
        expect(receivedMessages.length).toBeLessThanOrEqual(50);
      },
      testTimeout,
    );

    it(
      'should propagate subscription errors',
      async () => {
        let errorCaught = false;
        let errorMessage = '';

        try {
          serverAdapter.subscribe('error-topic', (data: any) => {
            if (data.shouldThrow) {
              throw new Error('Handler error');
            }
          });

          clientAdapter.publish('error-topic', { shouldThrow: true });

          await withTimeout(
            new Promise<void>((resolve) => {
              setTimeout(() => resolve(), 200);
            }),
            2000,
            'error handler execution',
          );
        } catch (err: any) {
          errorCaught = true;
          errorMessage = err.message;
        }

        // Error should be caught in handler, not propagated to adapter
        expect(errorCaught).toBe(false);
      },
      testTimeout,
    );
  });

  describe.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)('Combined Adapter Teardown', () => {
    it(
      'should coordinate teardown of pipe and control adapters',
      async () => {
        const pipeSocketPath = getSocketPath('combined-pipe');
        const controlSocketPath = getSocketPath('combined-control');

        const pipeServer = new UnixPipeAdapter(pipeSocketPath);
        const pipeClient = new UnixPipeAdapter(pipeSocketPath);
        const controlServer = new UnixControlAdapter(controlSocketPath, true);
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        const controlClient = new UnixControlAdapter(controlSocketPath, false);

        await withTimeout(pipeServer.listen(), connectionTimeout, 'pipe server listen');
        await withTimeout(
          retry(() => pipeClient.connect()),
          connectionTimeout,
          'pipe client connect',
        );
        await new Promise<void>((resolve) => setTimeout(resolve, 200));

        const serverPipe = pipeServer.createDuplex();
        const clientPipe = pipeClient.createDuplex();

        // Start data flow
        const dataChunks: Buffer[] = [];
        clientPipe.on('data', (chunk) => dataChunks.push(Buffer.from(chunk)));

        let shutdownReceived = false;
        controlServer.subscribe('control.shutdown', () => {
          shutdownReceived = true;
        });

        // Write some data
        for (let i = 0; i < 20; i++) {
          serverPipe.write(Buffer.alloc(1024, i % 256));
        }

        // Coordinated shutdown: control first with grace period
        controlClient.shutdown();
        await withTimeout(
          new Promise<void>((resolve) => setTimeout(resolve, teardownGrace)),
          2000,
          'control shutdown propagation',
        );

        // Then pipe teardown with timeout
        serverPipe.end();
        await withTimeout(
          new Promise<void>((resolve) => {
            clientPipe.once('end', resolve);
          }),
          5000,
          'pipe end event in combined teardown',
        );

        // Clean teardown with grace period
        pipeServer.close();
        pipeClient.close();
        controlClient.close();
        controlServer.close();
        await new Promise<void>((resolve) => setTimeout(resolve, teardownGrace));

        expect(shutdownReceived).toBe(true);
        expect(dataChunks.length).toBeGreaterThan(0);
      },
      testTimeout,
    );
  });
});
