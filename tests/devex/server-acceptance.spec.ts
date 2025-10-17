/**
 * DevEx Acceptance Tests: Custom Server Integration
 *
 * This file provides skeleton acceptance tests for early adopters building
 * custom servers on mkolbol. These tests verify that your server:
 *
 * 1. Registers correctly with Hostess
 * 2. Handles stream I/O (stdin/stdout) properly
 * 3. Responds to backpressure correctly
 * 4. Integrates cleanly into Executor topologies
 *
 * HOW TO USE:
 * -----------
 * 1. Copy this file into your project's tests/ directory
 * 2. Replace 'YourServerWrapper' with your actual wrapper class name
 * 3. Update imports to match your project structure:
 *    - For mkolbol kernel: import { Kernel, Hostess, ... } from 'mkolbol';
 *    - For your wrapper: import { YourServerWrapper } from '../src/modules/YourServerWrapper.js';
 * 4. Customize test inputs/outputs for your server's specific behavior
 * 5. Run with: npx vitest run tests/server-acceptance.spec.ts
 *
 * ADAPTING IMPORTS:
 * -----------------
 * If you're using this in an external project (not inside mkolbol repo):
 *
 * Replace:
 *   import { Kernel } from '../../src/kernel/Kernel.js';
 *   import { Hostess } from '../../src/hostess/Hostess.js';
 *
 * With:
 *   import { Kernel, Hostess, StateManager, Executor } from 'mkolbol';
 *
 * CUSTOMIZING FOR YOUR SERVER:
 * ---------------------------
 * - Update test inputs to match your server's expected format
 * - Update expected outputs to match your server's transformation
 * - Update endpoint coordinates to match your server's command/name
 * - Adjust timeouts if your server needs more time to process
 *
 * TEST LANE:
 * ----------
 * If your server spawns external processes, run in FORKS lane:
 *   npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/server-acceptance.spec.ts
 *
 * If your server is in-process only, you can use THREADS lane:
 *   npx vitest run tests/server-acceptance.spec.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { StateManager } from '../../src/state/StateManager.js';
import { Executor } from '../../src/executor/Executor.js';

/**
 * REPLACE THIS IMPORT with your actual server wrapper:
 *
 * Example for external adopters:
 *   import { YourServerWrapper } from '../src/modules/YourServerWrapper.js';
 *
 * Example if using ExternalServerWrapper directly:
 *   import { ExternalServerWrapper } from 'mkolbol';
 *   import type { ExternalServerManifest } from 'mkolbol';
 */
// import { YourServerWrapper } from '../src/modules/YourServerWrapper.js';

/**
 * EXAMPLE: If you don't have a custom wrapper yet, you can test with
 * ExternalServerWrapper directly. Uncomment the following:
 */
import { ExternalServerWrapper } from '../../src/wrappers/ExternalServerWrapper.js';
import type { ExternalServerManifest } from '../../src/types.js';

describe('Custom Server Acceptance Tests', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let wrapper: ExternalServerWrapper; // Replace with: YourServerWrapper

  // Increase timeout for external process operations
  const testTimeout = 10000;

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
  });

  afterEach(async () => {
    // IMPORTANT: Always clean up to prevent process leaks
    if (wrapper && wrapper.isRunning()) {
      await wrapper.shutdown();
    }
  });

  /**
   * TEST 1: Hostess Registration
   *
   * Verifies that your server registers an endpoint with Hostess after spawning.
   * This is critical for service discovery in topologies.
   *
   * CUSTOMIZE:
   * - Update endpoint matching logic to find your specific server
   * - Adjust metadata expectations based on your manifest
   */
  describe('Hostess Registration', () => {
    it(
      'should register endpoint with Hostess after spawn',
      async () => {
        /**
         * REPLACE THIS with your server instantiation:
         *
         * Example:
         *   wrapper = new YourServerWrapper(kernel, hostess);
         *
         * Or if using ExternalServerWrapper directly:
         */
        const manifest: ExternalServerManifest = {
          fqdn: 'localhost',
          servername: 'test-server',
          classHex: '0xTEST',
          owner: 'devex',
          auth: 'no',
          authMechanism: 'none',
          terminals: [
            { name: 'input', type: 'local', direction: 'input' },
            { name: 'output', type: 'local', direction: 'output' },
          ],
          capabilities: {
            type: 'transform',
            accepts: ['text'],
            produces: ['text'],
          },
          command: '/bin/cat', // REPLACE with your command
          args: [], // REPLACE with your args
          env: {},
          cwd: process.cwd(),
          ioMode: 'stdio',
          restart: 'never',
        };

        wrapper = new ExternalServerWrapper(kernel, hostess, manifest);

        // Spawn the server process
        await wrapper.spawn();

        // Query Hostess for registered endpoints
        const endpoints = hostess.listEndpoints();

        // CUSTOMIZE: Update this search to match your server's coordinates
        const serverEndpoint = Array.from(endpoints.entries()).find(
          ([_, ep]) => ep.type === 'external' && ep.coordinates.includes('/bin/cat'),
        );

        // Assertions
        expect(serverEndpoint).toBeDefined();
        expect(serverEndpoint![1].type).toBe('external');
        expect(serverEndpoint![1].metadata?.ioMode).toBe('stdio');
      },
      testTimeout,
    );
  });

  /**
   * TEST 2: Stream I/O Roundtrip
   *
   * Verifies that data written to inputPipe flows through your server
   * and appears correctly on outputPipe.
   *
   * CUSTOMIZE:
   * - Update testInput to match your server's expected input format
   * - Update assertion to match your server's expected output
   */
  describe('Stream I/O', () => {
    it(
      'should perform stdin → stdout roundtrip',
      async () => {
        /**
         * REPLACE with your server instantiation (same as Test 1)
         */
        const manifest: ExternalServerManifest = {
          fqdn: 'localhost',
          servername: 'test-io',
          classHex: '0xTEST',
          owner: 'devex',
          auth: 'no',
          authMechanism: 'none',
          terminals: [
            { name: 'input', type: 'local', direction: 'input' },
            { name: 'output', type: 'local', direction: 'output' },
          ],
          capabilities: { type: 'transform' },
          command: '/bin/cat', // REPLACE
          args: [],
          env: {},
          cwd: process.cwd(),
          ioMode: 'stdio',
          restart: 'never',
        };

        wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
        await wrapper.spawn();

        // Set up output collection
        const outputPromise = new Promise<string>((resolve) => {
          const chunks: Buffer[] = [];
          wrapper.outputPipe.on('data', (data) => {
            chunks.push(Buffer.from(data));
          });
          wrapper.outputPipe.once('end', () => {
            resolve(Buffer.concat(chunks).toString());
          });
        });

        // CUSTOMIZE: Update test input for your server
        const testInput = 'Hello from acceptance test\n';
        wrapper.inputPipe.write(testInput);
        wrapper.inputPipe.end();

        // Wait for output
        const output = await outputPromise;

        // CUSTOMIZE: Update expected output based on your server's transform
        // Example for echo server: expect(output).toBe('[ECHO] Hello from acceptance test\n');
        // Example for uppercase server: expect(output).toBe('HELLO FROM ACCEPTANCE TEST\n');
        expect(output).toBe(testInput); // cat just echoes
      },
      testTimeout,
    );

    it(
      'should handle multiple sequential messages',
      async () => {
        const manifest: ExternalServerManifest = {
          fqdn: 'localhost',
          servername: 'test-sequential',
          classHex: '0xTEST',
          owner: 'devex',
          auth: 'no',
          authMechanism: 'none',
          terminals: [
            { name: 'input', type: 'local', direction: 'input' },
            { name: 'output', type: 'local', direction: 'output' },
          ],
          capabilities: { type: 'transform' },
          command: '/bin/cat', // REPLACE
          args: [],
          env: {},
          cwd: process.cwd(),
          ioMode: 'stdio',
          restart: 'never',
        };

        wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
        await wrapper.spawn();

        const output: Buffer[] = [];
        wrapper.outputPipe.on('data', (data) => output.push(Buffer.from(data)));

        // CUSTOMIZE: Update test messages
        const messages = ['message1\n', 'message2\n', 'message3\n'];

        for (const msg of messages) {
          wrapper.inputPipe.write(msg);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        await new Promise((resolve) => setTimeout(resolve, 300));

        const received = Buffer.concat(output).toString();

        // Verify all messages were processed
        messages.forEach((msg) => {
          expect(received).toContain(msg.trim());
        });
      },
      testTimeout,
    );
  });

  /**
   * TEST 3: Backpressure Handling
   *
   * Verifies that your server respects Node.js stream backpressure
   * by emitting 'drain' events when the buffer is full.
   *
   * CUSTOMIZE:
   * - Adjust chunk size or count if your server has different buffer limits
   */
  describe('Backpressure', () => {
    it(
      'should handle backpressure with drain events',
      async () => {
        const manifest: ExternalServerManifest = {
          fqdn: 'localhost',
          servername: 'test-backpressure',
          classHex: '0xTEST',
          owner: 'devex',
          auth: 'no',
          authMechanism: 'none',
          terminals: [
            { name: 'input', type: 'local', direction: 'input' },
            { name: 'output', type: 'local', direction: 'output' },
          ],
          capabilities: { type: 'transform' },
          command: '/bin/cat', // REPLACE
          args: [],
          env: {},
          cwd: process.cwd(),
          ioMode: 'stdio',
          restart: 'never',
        };

        wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
        await wrapper.spawn();

        const chunkSize = 64 * 1024; // 64KB
        const numChunks = 50;
        const testData: Buffer[] = [];

        for (let i = 0; i < numChunks; i++) {
          testData.push(Buffer.alloc(chunkSize, i % 256));
        }

        const receivedChunks: Buffer[] = [];
        let drainEvents = 0;

        wrapper.outputPipe.on('data', (chunk) => {
          receivedChunks.push(Buffer.from(chunk));
        });

        // Write chunks and wait for drain when buffer is full
        for (let i = 0; i < testData.length; i++) {
          const canContinue = wrapper.inputPipe.write(testData[i]);
          if (!canContinue) {
            drainEvents++;
            await new Promise<void>((resolve) => {
              wrapper.inputPipe.once('drain', resolve);
            });
          }
        }
        wrapper.inputPipe.end();

        // Wait for all output
        await new Promise<void>((resolve) => {
          wrapper.outputPipe.once('end', resolve);
        });

        // Verify data integrity
        const receivedBuffer = Buffer.concat(receivedChunks);
        const expectedBuffer = Buffer.concat(testData);
        expect(receivedBuffer.length).toBe(expectedBuffer.length);
        expect(receivedBuffer.equals(expectedBuffer)).toBe(true);

        // Verify backpressure occurred
        expect(drainEvents).toBeGreaterThan(0);
      },
      testTimeout,
    );
  });

  /**
   * TEST 4: Lifecycle Management
   *
   * Verifies clean startup and shutdown of your server.
   *
   * CUSTOMIZE:
   * - Add server-specific lifecycle checks if needed
   */
  describe('Lifecycle', () => {
    it(
      'should manage lifecycle (start/stop)',
      async () => {
        const manifest: ExternalServerManifest = {
          fqdn: 'localhost',
          servername: 'test-lifecycle',
          classHex: '0xTEST',
          owner: 'devex',
          auth: 'no',
          authMechanism: 'none',
          terminals: [{ name: 'input', type: 'local', direction: 'input' }],
          capabilities: { type: 'output' },
          command: '/bin/cat', // REPLACE
          args: [],
          env: {},
          cwd: process.cwd(),
          ioMode: 'stdio',
          restart: 'never',
        };

        wrapper = new ExternalServerWrapper(kernel, hostess, manifest);

        // Before spawn: not running
        expect(wrapper.isRunning()).toBe(false);

        // After spawn: running with valid PID
        await wrapper.spawn();
        expect(wrapper.isRunning()).toBe(true);
        expect(wrapper.getProcessInfo().pid).toBeGreaterThan(0);

        // After shutdown: not running
        await wrapper.shutdown();
        expect(wrapper.isRunning()).toBe(false);
      },
      testTimeout,
    );
  });

  /**
   * TEST 5: Executor Integration
   *
   * Verifies that your server works correctly in a full Executor topology.
   * This is the real-world usage scenario.
   *
   * CUSTOMIZE:
   * - Update module name in config to match your wrapper class
   * - Add additional topology tests for your specific use cases
   */
  describe.skipIf(!process.env.MK_DEVEX_EXECUTOR)('Executor Integration', () => {
    it('should work in Executor topology', async () => {
      const config = {
        nodes: [
          {
            id: 'timer1',
            module: 'TimerSource',
            params: { periodMs: 100 },
          },
          /**
           * CUSTOMIZE: Replace 'ExternalProcess' with your wrapper module name
           *
           * Example:
           *   { id: 'your-server', module: 'YourServerWrapper' }
           */
          {
            id: 'test-server',
            module: 'ExternalProcess', // REPLACE with your module
            params: {
              command: '/bin/cat', // REPLACE
              args: [],
            },
          },
          {
            id: 'console1',
            module: 'ConsoleSink',
          },
        ],
        connections: [
          { from: 'timer1.output', to: 'test-server.input' },
          { from: 'test-server.output', to: 'console1.input' },
        ],
      };

      const stateManager = new StateManager(kernel);
      const executor = new Executor(kernel, hostess, stateManager);

      executor.load(config);
      await executor.up();

      // Verify nodes are registered in state
      const state = stateManager.getState();
      const serverNode = state.nodes.find((n: any) => n.id === 'test-server');
      expect(serverNode).toBeDefined();

      // Verify endpoints exist
      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBeGreaterThanOrEqual(3); // timer + server + console

      // CUSTOMIZE: Add assertions specific to your server's behavior

      await executor.down();
    }, 15000); // Longer timeout for full topology
  });
});

/**
 * TROUBLESHOOTING:
 * ----------------
 *
 * Test hangs:
 *   - Ensure wrapper.inputPipe.end() is called
 *   - Check that afterEach cleanup runs
 *
 * Endpoint not found:
 *   - Verify await wrapper.spawn() is called before querying
 *   - Check endpoint search logic matches your server's coordinates
 *
 * Data not flowing:
 *   - Ensure external script flushes output (sys.stdout.flush() in Python)
 *   - Verify connections in topology config
 *
 * Fails in CI but passes locally:
 *   - Use event-driven waiting instead of setTimeout
 *   - Increase test timeout if CI is slow
 *
 * For more help, see:
 *   - tests/devex/README.md
 *   - docs/devex/wiring-and-tests.md
 */
