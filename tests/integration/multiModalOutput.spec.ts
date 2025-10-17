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
        { name: 'output', type: 'local', direction: 'output' },
      ],
      capabilities: {
        type: 'transform',
      },
      command: '/bin/bash',
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'pty',
    };

    wrapper = new PTYServerWrapper(kernel, hostess, manifest);
    passthrough = new PassthroughRenderer(kernel);
    logger = new LoggerRenderer(kernel, testLogPath);

    kernel.split(wrapper.outputPipe, [passthrough.inputPipe, logger.inputPipe]);

    await wrapper.spawn();

    wrapper.inputPipe.write('echo "multi-modal test"\n');

    await new Promise((resolve) => setTimeout(resolve, 500));

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
    sink.inputPipe.write(Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    sink.inputPipe.write(Buffer.from([0xff, 0x00, 0xab, 0xcd]));
    sink.inputPipe.write(Buffer.alloc(0));
    sink.inputPipe.write(Buffer.alloc(200).fill(0x41));

    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log = originalLog;

    expect(outputs[0]).toContain('Buffer(5) "hello"');
    expect(outputs[1]).toContain('Buffer(5) "Hello"');
    expect(outputs[2]).toContain('Buffer(4) [ff 00 ab cd]');
    expect(outputs[3]).toContain('Buffer(0) []');
    expect(outputs[4]).toMatch(/Buffer\(200\) \[.*\.\.\. \+\d+ bytes\]/);
  });

  it('should output JSONL format when format=jsonl', async () => {
    const { ConsoleSink } = await import('../../src/modules/consoleSink.js');
    const sink = new ConsoleSink({ format: 'jsonl' });
    const outputs: string[] = [];

    const originalLog = console.log;
    console.log = (...args: any[]) => {
      outputs.push(args.join(' '));
    };

    sink.inputPipe.write('test string');
    sink.inputPipe.write({ foo: 'bar' });
    sink.inputPipe.write(42);

    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log = originalLog;

    expect(outputs).toHaveLength(3);

    const json1 = JSON.parse(outputs[0]);
    expect(json1).toHaveProperty('ts');
    expect(json1.data).toBe('test string');
    expect(new Date(json1.ts).toISOString()).toBe(json1.ts);

    const json2 = JSON.parse(outputs[1]);
    expect(json2).toHaveProperty('ts');
    expect(json2.data).toEqual({ foo: 'bar' });

    const json3 = JSON.parse(outputs[2]);
    expect(json3).toHaveProperty('ts');
    expect(json3.data).toBe(42);
  });

  it('should encode Buffers as base64 in JSONL format', async () => {
    const { ConsoleSink } = await import('../../src/modules/consoleSink.js');
    const sink = new ConsoleSink({ format: 'jsonl' });
    const outputs: string[] = [];

    const originalLog = console.log;
    console.log = (...args: any[]) => {
      outputs.push(args.join(' '));
    };

    sink.inputPipe.write(Buffer.from('hello'));
    sink.inputPipe.write(Buffer.from([0xff, 0x00, 0xab, 0xcd]));

    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log = originalLog;

    expect(outputs).toHaveLength(2);

    const json1 = JSON.parse(outputs[0]);
    expect(json1).toHaveProperty('ts');
    expect(json1.data).toEqual({
      type: 'Buffer',
      encoding: 'base64',
      data: Buffer.from('hello').toString('base64'),
    });

    const json2 = JSON.parse(outputs[1]);
    expect(json2).toHaveProperty('ts');
    expect(json2.data).toEqual({
      type: 'Buffer',
      encoding: 'base64',
      data: Buffer.from([0xff, 0x00, 0xab, 0xcd]).toString('base64'),
    });
  });

  it('should support legacy string constructor', async () => {
    const { ConsoleSink } = await import('../../src/modules/consoleSink.js');
    const sink = new ConsoleSink('[legacy]');
    const outputs: string[] = [];

    const originalLog = console.log;
    console.log = (...args: any[]) => {
      outputs.push(args.join(' '));
    };

    sink.inputPipe.write('test');

    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log = originalLog;

    expect(outputs[0]).toBe('[legacy] test');
  });
});
