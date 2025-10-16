import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { PTYServerWrapper } from '../../src/wrappers/PTYServerWrapper.js';
import { PassthroughRenderer } from '../../src/renderers/PassthroughRenderer.js';
import { LoggerRenderer } from '../../src/renderers/LoggerRenderer.js';
import type { ExternalServerManifest } from '../../src/types.js';
import * as fs from 'fs';

/**
 * PTY Test Group: Integration Tests
 * 
 * These tests use PTY (pseudoterminal) and require single-fork execution.
 * Run via: npm run test:pty
 * 
 * Rationale: Tests PTY output splitting across multiple renderers, which
 * requires an actual PTY session with real process interaction.
 */
describe('Multi-Modal Output Integration', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let wrapper: PTYServerWrapper;
  let passthrough: PassthroughRenderer;
  let logger: LoggerRenderer;
  const testLogPath = '/tmp/mkolbol-integration-test.log';

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
    
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  afterEach(async () => {
    if (wrapper && wrapper.isRunning()) {
      await wrapper.shutdown();
    }
    if (passthrough) {
      passthrough.destroy();
    }
    if (logger) {
      logger.destroy();
    }
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  it('should split PTY output to 2+ renderers', async () => {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'bash-multi',
      classHex: '0xFFFF',
      owner: 'test',
      auth: 'no',
      authMechanism: 'none',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform'
      },
      command: '/bin/bash',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'pty'
    };

    wrapper = new PTYServerWrapper(kernel, hostess, manifest);
    passthrough = new PassthroughRenderer(kernel);
    logger = new LoggerRenderer(kernel, testLogPath);

    kernel.split(wrapper.outputPipe, [
      passthrough.inputPipe,
      logger.inputPipe
    ]);

    await wrapper.spawn();

    wrapper.inputPipe.write('echo "multi-modal test"\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const logContent = fs.readFileSync(testLogPath, 'utf8');
    expect(logContent).toContain('multi-modal test');
  });

  it('should format Buffer objects as human-readable output', async () => {
    const { ConsoleSink } = await import('../../src/modules/consoleSink.js');
    const sink = new ConsoleSink('[buffer-test]');
    const outputs: string[] = [];
    
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      outputs.push(args.join(' '));
    };

    sink.inputPipe.write(Buffer.from('hello'));
    sink.inputPipe.write(Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]));
    sink.inputPipe.write(Buffer.from([0xFF, 0x00, 0xAB, 0xCD]));
    sink.inputPipe.write(Buffer.alloc(0));
    sink.inputPipe.write(Buffer.alloc(200).fill(0x41));

    await new Promise(resolve => setTimeout(resolve, 100));

    console.log = originalLog;

    expect(outputs[0]).toContain('Buffer(5) "hello"');
    expect(outputs[1]).toContain('Buffer(5) "Hello"');
    expect(outputs[2]).toContain('Buffer(4) [ff 00 ab cd]');
    expect(outputs[3]).toContain('Buffer(0) []');
    expect(outputs[4]).toMatch(/Buffer\(200\) \[.*\.\.\. \+\d+ bytes\]/);
  });
});
