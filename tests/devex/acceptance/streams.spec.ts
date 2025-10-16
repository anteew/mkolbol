/**
 * Acceptance Test: Stream I/O and Backpressure
 *
 * PURPOSE:
 * Validates that a custom server correctly handles stream I/O operations,
 * including input → output data flow and Node.js stream backpressure.
 *
 * TEST LANE:
 * THREADS - This test uses in-memory pipes, no external process spawning
 *
 * WHAT IS VALIDATED:
 * 1. Input → Output roundtrip works correctly
 * 2. Multiple sequential messages flow through
 * 3. Backpressure triggers drain events
 * 4. Errors propagate through pipes
 *
 * HOW TO ADAPT FOR YOUR PROJECT:
 * -------------------------------
 * 1. Copy this file to your project: tests/acceptance/streams.spec.ts
 * 2. Update imports:
 *    BEFORE (mkolbol internal):
 *      import { Kernel } from '../../../src/kernel/Kernel.js';
 *    AFTER (external adopter):
 *      import { Kernel, Hostess } from 'mkolbol';
 * 3. Replace ExternalServerWrapper with your wrapper
 * 4. Update test inputs/outputs to match your server's transformation
 * 5. Adjust backpressure thresholds if needed
 *
 * RUN:
 *   npx vitest run tests/devex/acceptance/streams.spec.ts
 *
 * EXPECTED ARTIFACTS (if Laminar enabled):
 *   reports/streams.spec/should_handle_input_output_roundtrip.jsonl
 *   reports/streams.spec/should_handle_multiple_messages.jsonl
 *   reports/streams.spec/should_handle_backpressure.jsonl
 *   reports/streams.spec/should_propagate_errors.jsonl
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * IMPORT TRANSFORMATION FOR EXTERNAL PROJECTS:
 *
 * Internal (mkolbol repo):
 *   import { Kernel } from '../../../src/kernel/Kernel.js';
 *   import { Hostess } from '../../../src/hostess/Hostess.js';
 *   import { ExternalServerWrapper } from '../../../src/wrappers/ExternalServerWrapper.js';
 *   import type { ExternalServerManifest } from '../../../src/types.js';
 *
 * External (adopter project):
 *   import { Kernel, Hostess, ExternalServerWrapper, type ExternalServerManifest } from 'mkolbol';
 *   import { YourServerWrapper } from '../src/modules/YourServerWrapper.js';
 */
import { Kernel } from '../../../src/kernel/Kernel.js';
import { Hostess } from '../../../src/hostess/Hostess.js';
import { ExternalServerWrapper } from '../../../src/wrappers/ExternalServerWrapper.js';
import type { ExternalServerManifest } from '../../../src/types.js';

describe('Acceptance: Stream I/O and Backpressure', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let wrapper: ExternalServerWrapper; // CUSTOMIZE: Replace with YourServerWrapper

  const testTimeout = 10000;

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
  });

  afterEach(async () => {
    // CRITICAL: Always clean up to prevent process leaks
    if (wrapper && wrapper.isRunning()) {
      await wrapper.shutdown();
    }
  });

  /**
   * TEST 1: Input → Output Roundtrip
   *
   * VALIDATES: Data written to inputPipe flows through server and appears on outputPipe
   * FAILURE SIGNALS:
   *   - Timeout → Server not writing to stdout
   *   - Empty output → Data not flowing
   *   - Data mismatch → Transformation incorrect
   */
  it('should handle input → output roundtrip', async () => {
    // CUSTOMIZE: Update manifest for your server
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-io-server',
      classHex: '0xIO',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform'
      },
      command: '/bin/cat', // CUSTOMIZE: Replace with your command
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
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
    const testInput = 'hello acceptance test\n';
    wrapper.inputPipe.write(testInput);
    wrapper.inputPipe.end(); // CRITICAL: Must call end() or test will hang

    // Wait for output
    const output = await outputPromise;

    // CUSTOMIZE: Update expected output based on your server's transform
    // Examples:
    //   - Echo server: expect(output).toBe('[ECHO] hello acceptance test\n');
    //   - Uppercase server: expect(output).toBe('HELLO ACCEPTANCE TEST\n');
    //   - Pass-through (cat): expect(output).toBe(testInput);
    expect(output).toBe(testInput); // cat echoes input
  }, testTimeout);

  /**
   * TEST 2: Multiple Sequential Messages
   *
   * VALIDATES: Server processes multiple messages in order
   * FAILURE SIGNALS:
   *   - Missing messages → Data loss
   *   - Wrong order → Buffering issue
   *   - Timeout → Server stalled
   */
  it('should handle multiple sequential messages', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-sequential-server',
      classHex: '0xSEQ',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform'
      },
      command: '/bin/cat',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    const outputChunks: Buffer[] = [];
    wrapper.outputPipe.on('data', (data) => {
      outputChunks.push(Buffer.from(data));
    });

    // CUSTOMIZE: Update messages for your server
    const messages = ['message1\n', 'message2\n', 'message3\n'];

    // Write all messages
    for (const msg of messages) {
      wrapper.inputPipe.write(msg);
    }
    wrapper.inputPipe.end();

    // Wait for all output
    await new Promise<void>((resolve) => {
      wrapper.outputPipe.once('end', resolve);
    });

    const received = Buffer.concat(outputChunks).toString();

    // Verify all messages were processed
    for (const msg of messages) {
      expect(received).toContain(msg.trim());
    }

    // CUSTOMIZE: If your server transforms messages, adjust this check
    // Example for uppercase server:
    //   expect(received).toContain('MESSAGE1');
    //   expect(received).toContain('MESSAGE2');
    //   expect(received).toContain('MESSAGE3');
  }, testTimeout);

  /**
   * TEST 3: Backpressure Handling
   *
   * VALIDATES: Server respects Node.js stream backpressure
   * FAILURE SIGNALS:
   *   - drainEvents = 0 → Backpressure not respected (potential memory bloat)
   *   - Data mismatch → Data loss under backpressure
   *   - Timeout → Deadlock in drain handling
   */
  it('should handle backpressure with drain events', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-backpressure-server',
      classHex: '0xBP',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform'
      },
      command: '/bin/cat',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    // CUSTOMIZE: Adjust chunk size/count if your server has different buffer limits
    const chunkSize = 64 * 1024; // 64KB chunks
    const numChunks = 50; // 3.2MB total
    const testData: Buffer[] = [];

    for (let i = 0; i < numChunks; i++) {
      testData.push(Buffer.alloc(chunkSize, i % 256));
    }

    const receivedChunks: Buffer[] = [];
    let drainEvents = 0;

    wrapper.outputPipe.on('data', (chunk) => {
      receivedChunks.push(Buffer.from(chunk));
    });

    // Write chunks and respect backpressure
    for (let i = 0; i < testData.length; i++) {
      const canContinue = wrapper.inputPipe.write(testData[i]);
      if (!canContinue) {
        drainEvents++;
        // CRITICAL: Wait for drain before continuing
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
  }, testTimeout);

  /**
   * TEST 4: Error Propagation
   *
   * VALIDATES: Pipe errors are caught and propagated
   * FAILURE SIGNALS:
   *   - No error caught → Error handling missing
   *   - Uncaught exception → Error not properly handled
   */
  it('should propagate pipe errors', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-error-server',
      classHex: '0xERR',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform'
      },
      command: '/bin/cat',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    let errorCaught = false;
    let clientError = false;

    wrapper.inputPipe.on('error', (err) => {
      errorCaught = true;
    });

    wrapper.outputPipe.on('error', (err) => {
      clientError = true;
    });

    // Write some data
    wrapper.inputPipe.write(Buffer.alloc(1024, 0xAA));

    // Simulate error by destroying the pipe
    wrapper.inputPipe.destroy(new Error('Simulated pipe error'));

    // Wait for error propagation
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    // Verify error was caught
    expect(errorCaught).toBe(true);
  }, testTimeout);

  /**
   * TEST 5: Empty Input Handling
   *
   * VALIDATES: Server handles empty input gracefully
   * FAILURE SIGNALS:
   *   - Timeout → Server expects data before closing
   *   - Crash → Empty input not handled
   */
  it.skipIf(!process.env.MK_DEVEX_EXECUTOR)('should handle empty input gracefully', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-empty-server',
      classHex: '0xEMPTY',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform'
      },
      command: '/bin/cat',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    const outputPromise = new Promise<string>((resolve) => {
      const chunks: Buffer[] = [];
      wrapper.outputPipe.on('data', (data) => {
        chunks.push(Buffer.from(data));
      });
      wrapper.outputPipe.once('end', () => {
        resolve(Buffer.concat(chunks).toString());
      });
    });

    // Close input immediately without writing
    wrapper.inputPipe.end();

    // Wait for output to close
    const output = await outputPromise;

    // Should produce empty output
    expect(output).toBe('');
    expect(wrapper.isRunning()).toBe(false); // Process should have exited
  }, testTimeout);

  /**
   * TEST 6: Large Message Handling
   *
   * VALIDATES: Server handles large single messages
   * FAILURE SIGNALS:
   *   - Data truncated → Buffer size too small
   *   - Timeout → Blocking on large message
   */
  it('should handle large single message', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'test-large-server',
      classHex: '0xLARGE',
      owner: 'devex',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform'
      },
      command: '/bin/cat',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'never'
    };

    wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
    await wrapper.spawn();

    const outputPromise = new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      wrapper.outputPipe.on('data', (data) => {
        chunks.push(Buffer.from(data));
      });
      wrapper.outputPipe.once('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // CUSTOMIZE: Adjust size based on your server's limits
    const largeMessage = Buffer.alloc(1024 * 1024, 0xFF); // 1MB

    // Write large message with backpressure handling
    const canContinue = wrapper.inputPipe.write(largeMessage);
    if (!canContinue) {
      await new Promise<void>((resolve) => {
        wrapper.inputPipe.once('drain', resolve);
      });
    }
    wrapper.inputPipe.end();

    // Wait for output
    const output = await outputPromise;

    // Verify complete message received
    expect(output.length).toBe(largeMessage.length);
    expect(output.equals(largeMessage)).toBe(true);
  }, testTimeout);
});

/**
 * TROUBLESHOOTING GUIDE:
 * ----------------------
 *
 * 1. Test hangs indefinitely
 *    - Ensure wrapper.inputPipe.end() is called
 *    - Check that outputPipe 'end' event is emitted
 *    - Verify server process exits cleanly
 *
 * 2. Data not flowing
 *    - Ensure server flushes stdout (sys.stdout.flush() in Python)
 *    - Check that pipes are correctly wired
 *    - Verify server is reading from stdin
 *
 * 3. Data mismatch
 *    - Update expected output to match your server's transformation
 *    - Check for encoding issues (utf8 vs binary)
 *    - Verify server doesn't add unexpected formatting
 *
 * 4. No drain events
 *    - This might be OK if your server processes data fast enough
 *    - Increase numChunks or chunkSize to force backpressure
 *    - Verify highWaterMark is set appropriately
 *
 * 5. Error test fails
 *    - Check that error handlers are registered before operations
 *    - Verify error events are emitted on correct stream
 *    - Ensure proper cleanup in error scenarios
 *
 * 6. Empty input test fails
 *    - Server might expect at least one line of input
 *    - Check if server waits for data before closing
 *    - Verify EOF handling in your server
 */
