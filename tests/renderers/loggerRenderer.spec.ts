import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { LoggerRenderer } from '../../src/renderers/LoggerRenderer.js';
import * as fs from 'fs';

describe('LoggerRenderer', () => {
  let kernel: Kernel;
  let renderer: LoggerRenderer;
  const testLogPath = '/tmp/mkolbol-test-log.txt';

  beforeEach(() => {
    kernel = new Kernel();
    
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
    
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  it('should write all data to log file', async () => {
    renderer = new LoggerRenderer(kernel, testLogPath);
    const testData = 'Test log data\n';
    renderer.inputPipe.write(Buffer.from(testData));
    await new Promise((r) => setTimeout(r, 50));
    const content = fs.readFileSync(testLogPath, 'utf8');
    expect(content).toBe(testData);
  });

  it('should append to existing log file', async () => {
    fs.writeFileSync(testLogPath, 'Existing content\n');
    renderer = new LoggerRenderer(kernel, testLogPath);
    renderer.inputPipe.write(Buffer.from('New content\n'));
    await new Promise((r) => setTimeout(r, 50));
    const content = fs.readFileSync(testLogPath, 'utf8');
    expect(content).toBe('Existing content\nNew content\n');
  });
});
