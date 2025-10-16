import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { TTYRenderer } from '../../src/modules/ttyRenderer.js';
import { readFile, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TTYRenderer', () => {
  let kernel: Kernel;
  let testDir: string;
  let originalStdoutWrite: any;
  let capturedOutput: Buffer[] = [];

  beforeEach(async () => {
    kernel = new Kernel();
    testDir = join(tmpdir(), `tty-renderer-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    capturedOutput = [];
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = ((chunk: any) => {
      capturedOutput.push(Buffer.from(chunk));
      return true;
    }) as any;
  });

  afterEach(async () => {
    process.stdout.write = originalStdoutWrite;
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('stdout rendering', () => {
    it('should render raw ANSI to stdout by default', async () => {
      const renderer = new TTYRenderer(kernel);
      await renderer.start();

      const testData = Buffer.from('Hello, World!');
      renderer.inputPipe.write(testData);

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toBe('Hello, World!');

      await renderer.stop();
      renderer.destroy();
    });

    it('should handle ANSI escape sequences', async () => {
      const renderer = new TTYRenderer(kernel);
      await renderer.start();

      const testData = Buffer.from('\x1b[31mRed Text\x1b[0m');
      renderer.inputPipe.write(testData);

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toContain('\x1b[31m');
      expect(output).toContain('Red Text');
      expect(output).toContain('\x1b[0m');

      await renderer.stop();
      renderer.destroy();
    });

    it('should strip ANSI codes when stripAnsi is enabled', async () => {
      const renderer = new TTYRenderer(kernel, { stripAnsi: true });
      await renderer.start();

      const testData = Buffer.from('\x1b[31mRed Text\x1b[0m Normal');
      renderer.inputPipe.write(testData);

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).not.toContain('\x1b[31m');
      expect(output).not.toContain('\x1b[0m');
      expect(output).toBe('Red Text Normal');

      await renderer.stop();
      renderer.destroy();
    });

    it('should handle multiple writes', async () => {
      const renderer = new TTYRenderer(kernel);
      await renderer.start();

      renderer.inputPipe.write('Line 1\n');
      renderer.inputPipe.write('Line 2\n');
      renderer.inputPipe.write('Line 3\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toBe('Line 1\nLine 2\nLine 3\n');

      await renderer.stop();
      renderer.destroy();
    });

    it('should handle string inputs', async () => {
      const renderer = new TTYRenderer(kernel);
      await renderer.start();

      renderer.inputPipe.write('String data');

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toBe('String data');

      await renderer.stop();
      renderer.destroy();
    });

    it('should handle object inputs by stringifying', async () => {
      const renderer = new TTYRenderer(kernel);
      await renderer.start();

      renderer.inputPipe.write({ key: 'value', num: 42 });

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toBe('{"key":"value","num":42}');

      await renderer.stop();
      renderer.destroy();
    });
  });

  describe('file rendering', () => {
    it('should write to file when target is a file path', async () => {
      const filePath = join(testDir, 'output.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();
      renderer.inputPipe.write('Line 1\n');
      renderer.inputPipe.write('Line 2\n');
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toBe('Line 1\nLine 2\n');
    });

    it('should write ANSI codes to file in raw mode', async () => {
      const filePath = join(testDir, 'ansi.log');
      const renderer = new TTYRenderer(kernel, { target: filePath, rawMode: true });

      await renderer.start();
      renderer.inputPipe.write('\x1b[32mGreen\x1b[0m\n');
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toBe('\x1b[32mGreen\x1b[0m\n');
    });

    it('should strip ANSI codes from file when stripAnsi is enabled', async () => {
      const filePath = join(testDir, 'stripped.log');
      const renderer = new TTYRenderer(kernel, { target: filePath, stripAnsi: true });

      await renderer.start();
      renderer.inputPipe.write('\x1b[32mGreen\x1b[0m Text\n');
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toBe('Green Text\n');
    });

    it('should create nested directories automatically', async () => {
      const filePath = join(testDir, 'nested', 'deep', 'output.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();
      renderer.inputPipe.write('nested content\n');
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toBe('nested content\n');
    });

    it('should append to existing file', async () => {
      const filePath = join(testDir, 'append.log');

      const renderer1 = new TTYRenderer(kernel, { target: filePath });
      await renderer1.start();
      renderer1.inputPipe.write('first\n');
      await renderer1.stop();
      renderer1.destroy();

      const renderer2 = new TTYRenderer(kernel, { target: filePath });
      await renderer2.start();
      renderer2.inputPipe.write('second\n');
      await renderer2.stop();
      renderer2.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toBe('first\nsecond\n');
    });

    it('should handle binary data', async () => {
      const filePath = join(testDir, 'binary.dat');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();
      const binaryData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
      renderer.inputPipe.write(binaryData);
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath);
      expect(content).toEqual(binaryData);
    });
  });

  describe('TTY detection', () => {
    it('should work in non-TTY environment', async () => {
      const renderer = new TTYRenderer(kernel);
      await renderer.start();

      renderer.inputPipe.write('test data');

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toBe('test data');

      await renderer.stop();
      renderer.destroy();
    });

    it('should handle rawMode gracefully when not a TTY', async () => {
      const renderer = new TTYRenderer(kernel, { rawMode: true });
      
      await expect(renderer.start()).resolves.toBeUndefined();
      await expect(renderer.stop()).resolves.toBeUndefined();
      
      renderer.destroy();
    });
  });

  describe('edge cases', () => {
    it('should handle empty writes', async () => {
      const renderer = new TTYRenderer(kernel);
      await renderer.start();

      renderer.inputPipe.write('');
      renderer.inputPipe.write(Buffer.alloc(0));

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toBe('');

      await renderer.stop();
      renderer.destroy();
    });

    it('should handle rapid sequential writes', async () => {
      const filePath = join(testDir, 'rapid.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();
      for (let i = 0; i < 100; i++) {
        renderer.inputPipe.write(`line ${i}\n`);
      }
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(100);
      expect(lines[0]).toBe('line 0');
      expect(lines[99]).toBe('line 99');
    });

    it('should handle large buffers', async () => {
      const filePath = join(testDir, 'large.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();
      const largeData = Buffer.alloc(64 * 1024, 'x');
      renderer.inputPipe.write(largeData);
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath);
      expect(content.length).toBe(largeData.length);
    });

    it('should handle complex ANSI sequences', async () => {
      const filePath = join(testDir, 'complex-ansi.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();
      const complexAnsi = '\x1b[1;31;42mBold Red on Green\x1b[0m\x1b[2J\x1b[H';
      renderer.inputPipe.write(complexAnsi);
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toBe(complexAnsi);
    });

    it('should strip complex ANSI sequences correctly', async () => {
      const renderer = new TTYRenderer(kernel, { stripAnsi: true });
      await renderer.start();

      const complexAnsi = '\x1b[1;31;42mBold Red on Green\x1b[0m\x1b[2J\x1b[HCursor';
      renderer.inputPipe.write(complexAnsi);

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toBe('Bold Red on GreenCursor');

      await renderer.stop();
      renderer.destroy();
    });
  });

  describe('file target assertions', () => {
    it('should write ANSI content to file target and verify exact content', async () => {
      const filePath = join(testDir, 'file-ansi.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();
      const data = 'Hello\x1b[31m Red \x1b[0m World\n';
      renderer.inputPipe.write(data);
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toBe(data);
    });

    it('should preserve exact ANSI byte sequences when writing to file', async () => {
      const filePath = join(testDir, 'file-ansi-sequences.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();
      const ansiSequences = [
        '\x1b[0m',      // Reset
        '\x1b[1m',      // Bold
        '\x1b[31m',     // Red foreground
        '\x1b[42m',     // Green background
        '\x1b[2J',      // Clear screen
        '\x1b[H',       // Home cursor
        '\x1b[?25h',    // Show cursor
        '\x1b[?25l',    // Hide cursor
      ];

      for (const seq of ansiSequences) {
        renderer.inputPipe.write(seq);
      }
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      for (const seq of ansiSequences) {
        expect(content).toContain(seq);
      }
    });
  });

  describe('non-TTY safeguards', () => {
    it('should work when stdout is redirected (non-TTY)', async () => {
      const renderer = new TTYRenderer(kernel);
      await renderer.start();

      const data = 'Test output\n';
      renderer.inputPipe.write(data);

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toBe(data);

      await renderer.stop();
      renderer.destroy();
    });

    it('should handle write operations when no file stream exists', async () => {
      const renderer = new TTYRenderer(kernel);
      await renderer.start();

      renderer.inputPipe.write('Default stdout\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(capturedOutput.length).toBeGreaterThan(0);
      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toContain('Default stdout');

      await renderer.stop();
      renderer.destroy();
    });
  });

  describe('large ANSI sequences', () => {
    it('should handle large ANSI escape sequences', async () => {
      const filePath = join(testDir, 'large-ansi.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();

      let largeSequence = '';
      for (let i = 0; i < 256; i++) {
        largeSequence += `\x1b[38;5;${i}m█`;
      }
      largeSequence += '\x1b[0m\n';

      renderer.inputPipe.write(largeSequence);
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toContain('\x1b[38;5;0m');
      expect(content).toContain('\x1b[38;5;255m');
      expect(content).toContain('█');
      expect(content.length).toBeGreaterThan(1000);
    });

    it('should handle multiple large chunks without data loss', async () => {
      const filePath = join(testDir, 'large-chunks.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();

      for (let i = 0; i < 100; i++) {
        const chunk = `\x1b[${i}mChunk ${i}\x1b[0m\n`;
        renderer.inputPipe.write(chunk);
      }

      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toContain('Chunk 0');
      expect(content).toContain('Chunk 50');
      expect(content).toContain('Chunk 99');
    });

    it('should preserve integrity of complex SGR sequences', async () => {
      const filePath = join(testDir, 'complex-sgr.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();

      const complexSGR = '\x1b[1;3;4;38;2;255;128;0;48;2;0;128;255m';
      const text = 'Complex Style';
      const reset = '\x1b[0m';
      const fullSequence = complexSGR + text + reset + '\n';

      renderer.inputPipe.write(fullSequence);
      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toBe(fullSequence);
      expect(Buffer.from(content).toString('hex')).toBe(Buffer.from(fullSequence).toString('hex'));
    });
  });

  describe('error handling', () => {
    it('should handle file write errors gracefully', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist/file.log';
      const renderer = new TTYRenderer(kernel, { target: invalidPath });

      await expect(renderer.start()).rejects.toThrow();
      renderer.destroy();
    });

    it('should handle double start/stop calls', async () => {
      const renderer = new TTYRenderer(kernel);

      await renderer.start();
      await renderer.start();

      await renderer.stop();
      await renderer.stop();

      renderer.destroy();
    });
  });

  describe('ANSI passthrough integrity', () => {
    it('should preserve exact byte-for-byte ANSI sequences', async () => {
      const filePath = join(testDir, 'ansi-integrity.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();

      const testVectors = [
        '\x1b[0m',                      // Reset
        '\x1b[1;31m',                   // Bold red
        '\x1b[38;2;255;128;64m',        // RGB color
        '\x1b[48;5;123m',               // 256 color background
        '\x1b]0;Title\x07',             // Set window title
        '\x1b[2J\x1b[H',                // Clear screen and home
      ];

      for (const input of testVectors) {
        renderer.inputPipe.write(input);
      }

      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      for (const expected of testVectors) {
        expect(content).toContain(expected);
      }
    });

    it('should handle mixed text and ANSI without corruption', async () => {
      const filePath = join(testDir, 'mixed-ansi.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();

      const mixed = 'Plain\x1b[31mRed\x1b[0m\x1b[1mBold\x1b[0mEnd';
      renderer.inputPipe.write(mixed);

      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toBe(mixed);
      expect(Buffer.from(content).length).toBe(Buffer.from(mixed).length);
    });

    it('should handle ANSI C1 control codes', async () => {
      const filePath = join(testDir, 'c1-codes.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();

      const c1Codes = '\x9b0m\x9d\x9eSome text';
      renderer.inputPipe.write(c1Codes);

      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      expect(content).toBe(c1Codes);
    });
  });

  describe('stdout and file target verification', () => {
    it('should write to stdout target correctly', async () => {
      const renderer = new TTYRenderer(kernel);
      await renderer.start();

      const data = 'Stdout content\n';
      renderer.inputPipe.write(data);

      await new Promise(resolve => setTimeout(resolve, 50));

      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toBe(data);

      await renderer.stop();
      renderer.destroy();
    });

    it('should handle concurrent writes to file target', async () => {
      const filePath = join(testDir, 'concurrent.log');
      const renderer = new TTYRenderer(kernel, { target: filePath });

      await renderer.start();

      for (let i = 0; i < 10; i++) {
        renderer.inputPipe.write(`Line ${i}\n`);
      }

      await renderer.stop();
      renderer.destroy();

      const content = await readFile(filePath, 'utf8');
      for (let i = 0; i < 10; i++) {
        expect(content).toContain(`Line ${i}`);
      }
    });

    it('should handle file target vs stdout target independently', async () => {
      const filePath = join(testDir, 'independent.log');
      
      const stdoutRenderer = new TTYRenderer(kernel);
      await stdoutRenderer.start();
      stdoutRenderer.inputPipe.write('To stdout\n');
      await stdoutRenderer.stop();
      stdoutRenderer.destroy();

      const stdoutOutput = Buffer.concat(capturedOutput).toString();
      expect(stdoutOutput).toContain('To stdout');

      capturedOutput = [];

      const fileRenderer = new TTYRenderer(kernel, { target: filePath });
      await fileRenderer.start();
      fileRenderer.inputPipe.write('To file\n');
      await fileRenderer.stop();
      fileRenderer.destroy();

      const fileContent = await readFile(filePath, 'utf8');
      expect(fileContent).toBe('To file\n');
      
      const stdoutOutput2 = Buffer.concat(capturedOutput).toString();
      expect(stdoutOutput2).not.toContain('To file');
    });
  });
});
