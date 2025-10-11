import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { PassthroughRenderer } from '../../src/renderers/PassthroughRenderer.js';

describe('PassthroughRenderer', () => {
  let kernel: Kernel;
  let renderer: PassthroughRenderer;
  let originalStdoutWrite: any;
  let capturedOutput: Buffer[] = [];

  beforeEach(() => {
    kernel = new Kernel();
    renderer = new PassthroughRenderer(kernel);
    
    capturedOutput = [];
    originalStdoutWrite = process.stdout.write;
    process.stdout.write = ((chunk: any) => {
      capturedOutput.push(Buffer.from(chunk));
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    renderer.destroy();
  });

  it('should render raw ANSI to stdout', (done) => {
    const testData = Buffer.from('Hello, World!');
    
    renderer.inputPipe.write(testData);
    
    setTimeout(() => {
      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toBe('Hello, World!');
      done();
    }, 100);
  });

  it('should handle ANSI escape sequences', (done) => {
    const testData = Buffer.from('\x1b[31mRed Text\x1b[0m');
    
    renderer.inputPipe.write(testData);
    
    setTimeout(() => {
      const output = Buffer.concat(capturedOutput).toString();
      expect(output).toContain('\x1b[31m');
      expect(output).toContain('Red Text');
      done();
    }, 100);
  });
});
