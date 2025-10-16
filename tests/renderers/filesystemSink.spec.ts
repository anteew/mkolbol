import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { FilesystemSink } from '../../src/modules/filesystem-sink.js';
import { readFile, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FilesystemSink', () => {
  let kernel: Kernel;
  let testDir: string;

  beforeEach(async () => {
    kernel = new Kernel();
    testDir = join(tmpdir(), `filesystem-sink-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should create file and write data', async () => {
    const filePath = join(testDir, 'test.log');
    const sink = new FilesystemSink(kernel, { path: filePath });

    await sink.start();
    sink.inputPipe.write('line 1\n');
    sink.inputPipe.write('line 2\n');
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    expect(content).toBe('line 1\nline 2\n');
  });

  it('should append to existing file in append mode', async () => {
    const filePath = join(testDir, 'append.log');
    
    const sink1 = new FilesystemSink(kernel, { path: filePath, mode: 'append' });
    await sink1.start();
    sink1.inputPipe.write('first\n');
    await sink1.stop();

    const sink2 = new FilesystemSink(kernel, { path: filePath, mode: 'append' });
    await sink2.start();
    sink2.inputPipe.write('second\n');
    await sink2.stop();

    const content = await readFile(filePath, 'utf8');
    expect(content).toBe('first\nsecond\n');
  });

  it('should truncate existing file in truncate mode', async () => {
    const filePath = join(testDir, 'truncate.log');
    
    const sink1 = new FilesystemSink(kernel, { path: filePath, mode: 'truncate' });
    await sink1.start();
    sink1.inputPipe.write('first\n');
    await sink1.stop();

    const sink2 = new FilesystemSink(kernel, { path: filePath, mode: 'truncate' });
    await sink2.start();
    sink2.inputPipe.write('second\n');
    await sink2.stop();

    const content = await readFile(filePath, 'utf8');
    expect(content).toBe('second\n');
  });

  it('should create nested directories automatically', async () => {
    const filePath = join(testDir, 'nested', 'deep', 'file.log');
    const sink = new FilesystemSink(kernel, { path: filePath });

    await sink.start();
    sink.inputPipe.write('nested content\n');
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    expect(content).toBe('nested content\n');
  });

  it('should track write statistics', async () => {
    const filePath = join(testDir, 'stats.log');
    const sink = new FilesystemSink(kernel, { path: filePath });

    await sink.start();
    sink.inputPipe.write('data1\n');
    sink.inputPipe.write('data2\n');
    sink.inputPipe.write('data3\n');
    
    const statsBefore = sink.getStats();
    expect(statsBefore.writeCount).toBe(3);
    
    await sink.stop();

    const stats = sink.getStats();
    expect(stats.writeCount).toBe(3);
    expect(stats.byteCount).toBeGreaterThan(0);
  });

  it('should handle binary data', async () => {
    const filePath = join(testDir, 'binary.dat');
    const sink = new FilesystemSink(kernel, { path: filePath });

    await sink.start();
    const binaryData = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
    sink.inputPipe.write(binaryData);
    await sink.stop();

    const content = await readFile(filePath);
    expect(content).toEqual(binaryData);
  });

  it('should handle large writes', async () => {
    const filePath = join(testDir, 'large.log');
    const sink = new FilesystemSink(kernel, { path: filePath });

    await sink.start();
    const largeData = Buffer.alloc(64 * 1024, 'x');
    sink.inputPipe.write(largeData);
    await sink.stop();

    const content = await readFile(filePath);
    expect(content.length).toBe(largeData.length);
  });

  it('should handle multiple sequential writes', async () => {
    const filePath = join(testDir, 'sequential.log');
    const sink = new FilesystemSink(kernel, { path: filePath });

    await sink.start();
    for (let i = 0; i < 50; i++) {
      sink.inputPipe.write(`line ${i}\n`);
    }
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines.length).toBe(50);
    expect(lines[0]).toBe('line 0');
    expect(lines[49]).toBe('line 49');
  });

  it('should write data with fsync=always', async () => {
    const filePath = join(testDir, 'fsync-always.log');
    const sink = new FilesystemSink(kernel, { path: filePath, fsync: 'always' });

    await sink.start();
    sink.inputPipe.write('data1\n');
    sink.inputPipe.write('data2\n');
    sink.inputPipe.write('data3\n');
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    expect(content).toBe('data1\ndata2\ndata3\n');
  });

  it('should handle fsync=always with large writes', async () => {
    const filePath = join(testDir, 'fsync-large.log');
    const sink = new FilesystemSink(kernel, { path: filePath, fsync: 'always' });

    await sink.start();
    const largeData = Buffer.alloc(32 * 1024, 'x');
    sink.inputPipe.write(largeData);
    sink.inputPipe.write(Buffer.from('\n'));
    await sink.stop();

    const content = await readFile(filePath);
    expect(content.length).toBe(largeData.length + 1);
  });

  it('should maintain backpressure with fsync=always', async () => {
    const filePath = join(testDir, 'backpressure.log');
    const sink = new FilesystemSink(kernel, { 
      path: filePath, 
      fsync: 'always',
      highWaterMark: 1024
    });

    await sink.start();
    
    for (let i = 0; i < 100; i++) {
      const canContinue = sink.inputPipe.write(Buffer.alloc(256, i));
      if (!canContinue) {
        await new Promise(resolve => sink.inputPipe.once('drain', resolve));
      }
    }
    
    await sink.stop();

    const content = await readFile(filePath);
    expect(content.length).toBe(100 * 256);
  });
});
