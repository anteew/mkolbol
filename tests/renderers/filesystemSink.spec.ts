import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { FilesystemSink } from '../../src/modules/filesystem-sink.js';
import { readFile, rm, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import * as fc from 'fast-check';

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

  it('should write data in jsonl format', async () => {
    const filePath = join(testDir, 'jsonl.log');
    const sink = new FilesystemSink(kernel, { path: filePath, format: 'jsonl' });

    await sink.start();
    sink.inputPipe.write('line 1');
    sink.inputPipe.write('line 2');
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    expect(lines.length).toBe(2);
    
    const parsed1 = JSON.parse(lines[0]);
    expect(parsed1).toHaveProperty('ts');
    expect(parsed1).toHaveProperty('data');
    expect(parsed1.data).toBe('line 1');
    expect(new Date(parsed1.ts).toISOString()).toBe(parsed1.ts);
    
    const parsed2 = JSON.parse(lines[1]);
    expect(parsed2.data).toBe('line 2');
  });

  it('should include timestamp in raw mode', async () => {
    const filePath = join(testDir, 'timestamp.log');
    const sink = new FilesystemSink(kernel, { 
      path: filePath, 
      format: 'raw',
      includeTimestamp: true 
    });

    await sink.start();
    sink.inputPipe.write('first line\n');
    sink.inputPipe.write('second line\n');
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    expect(lines.length).toBe(2);
    
    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z first line$/);
    expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z second line$/);
  });

  it('should handle multiple lines in single chunk with timestamp', async () => {
    const filePath = join(testDir, 'multiline-timestamp.log');
    const sink = new FilesystemSink(kernel, { 
      path: filePath,
      includeTimestamp: true 
    });

    await sink.start();
    sink.inputPipe.write('line 1\nline 2\nline 3\n');
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    expect(lines.length).toBe(3);
    lines.forEach(line => {
      expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z line \d$/);
    });
  });

  it('should write jsonl format with multiple chunks', async () => {
    const filePath = join(testDir, 'jsonl-multi.log');
    const sink = new FilesystemSink(kernel, { path: filePath, format: 'jsonl' });

    await sink.start();
    for (let i = 0; i < 5; i++) {
      sink.inputPipe.write(`chunk ${i}`);
    }
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    expect(lines.length).toBe(5);
    
    lines.forEach((line, i) => {
      const parsed = JSON.parse(line);
      expect(parsed.data).toBe(`chunk ${i}`);
      expect(new Date(parsed.ts).toISOString()).toBe(parsed.ts);
    });
  });

  it('should handle partial lines with timestamp', async () => {
    const filePath = join(testDir, 'partial-timestamp.log');
    const sink = new FilesystemSink(kernel, { 
      path: filePath,
      includeTimestamp: true 
    });

    await sink.start();
    sink.inputPipe.write('start');
    sink.inputPipe.write(' middle');
    sink.inputPipe.write(' end\n');
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z start middle end$/);
  });

  it('should work without format or timestamp options (default behavior)', async () => {
    const filePath = join(testDir, 'default.log');
    const sink = new FilesystemSink(kernel, { path: filePath });

    await sink.start();
    sink.inputPipe.write('raw line 1\n');
    sink.inputPipe.write('raw line 2\n');
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    expect(content).toBe('raw line 1\nraw line 2\n');
  });

  it('should ignore includeTimestamp when format is jsonl', async () => {
    const filePath = join(testDir, 'jsonl-overrides.log');
    const sink = new FilesystemSink(kernel, { 
      path: filePath, 
      format: 'jsonl',
      includeTimestamp: true
    });

    await sink.start();
    sink.inputPipe.write('test data');
    await sink.stop();

    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content.trim());
    
    expect(parsed).toHaveProperty('ts');
    expect(parsed).toHaveProperty('data');
    expect(parsed.data).toBe('test data');
  });

  describe('Stress Tests', () => {
    it('should handle 10K+ high-throughput writes', async () => {
      const filePath = join(testDir, 'high-throughput.log');
      const sink = new FilesystemSink(kernel, { path: filePath });
      const messageCount = 10000;

      await sink.start();
      
      const startTime = Date.now();
      for (let i = 0; i < messageCount; i++) {
        sink.inputPipe.write(`message ${i}\n`);
      }
      await sink.stop();
      const duration = Date.now() - startTime;

      const content = await readFile(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      expect(lines.length).toBe(messageCount);
      expect(lines[0]).toBe('message 0');
      expect(lines[messageCount - 1]).toBe(`message ${messageCount - 1}`);
      
      const stats = sink.getStats();
      expect(stats.writeCount).toBe(messageCount);
      
      console.log(`High-throughput test: ${messageCount} messages in ${duration}ms (${(messageCount / duration * 1000).toFixed(2)} msg/sec)`);
    }, 30000);

    it('should handle concurrent writes from multiple sinks', async () => {
      const sinkCount = 5;
      const messagesPerSink = 2000;
      const sinks: FilesystemSink[] = [];
      const startTime = Date.now();

      for (let i = 0; i < sinkCount; i++) {
        const filePath = join(testDir, `concurrent-${i}.log`);
        const sink = new FilesystemSink(kernel, { path: filePath });
        sinks.push(sink);
        await sink.start();
      }

      await Promise.all(
        sinks.map(async (sink, sinkIndex) => {
          for (let i = 0; i < messagesPerSink; i++) {
            sink.inputPipe.write(`sink${sinkIndex}-msg${i}\n`);
          }
          await sink.stop();
        })
      );

      const duration = Date.now() - startTime;

      for (let i = 0; i < sinkCount; i++) {
        const filePath = join(testDir, `concurrent-${i}.log`);
        const content = await readFile(filePath, 'utf8');
        const lines = content.trim().split('\n');
        
        expect(lines.length).toBe(messagesPerSink);
        expect(lines[0]).toBe(`sink${i}-msg0`);
        expect(lines[messagesPerSink - 1]).toBe(`sink${i}-msg${messagesPerSink - 1}`);
      }

      console.log(`Concurrent test: ${sinkCount} sinks × ${messagesPerSink} messages in ${duration}ms`);
    }, 30000);

    it('should handle large file writes (10MB+)', async () => {
      const filePath = join(testDir, 'large-file.log');
      const sink = new FilesystemSink(kernel, { path: filePath });
      const chunkSize = 64 * 1024;
      const targetSize = 10 * 1024 * 1024;
      const chunkCount = Math.ceil(targetSize / chunkSize);

      await sink.start();
      
      const startTime = Date.now();
      for (let i = 0; i < chunkCount; i++) {
        const chunk = Buffer.alloc(chunkSize, i % 256);
        sink.inputPipe.write(chunk);
      }
      await sink.stop();
      const duration = Date.now() - startTime;

      const fileStats = await stat(filePath);
      const expectedSize = chunkCount * chunkSize;
      
      expect(fileStats.size).toBe(expectedSize);
      expect(fileStats.size).toBeGreaterThanOrEqual(targetSize);
      
      const stats = sink.getStats();
      expect(stats.writeCount).toBe(chunkCount);
      expect(stats.byteCount).toBe(expectedSize);

      console.log(`Large file test: ${(expectedSize / (1024 * 1024)).toFixed(2)}MB in ${duration}ms (${(expectedSize / duration / 1024).toFixed(2)} MB/sec)`);
    }, 60000);

    it('should maintain data integrity under stress with fsync=always', async () => {
      const filePath = join(testDir, 'stress-fsync.log');
      const sink = new FilesystemSink(kernel, { 
        path: filePath, 
        fsync: 'always',
        highWaterMark: 1024
      });
      const messageCount = 1000;

      await sink.start();
      
      for (let i = 0; i < messageCount; i++) {
        const canContinue = sink.inputPipe.write(`${i}\n`);
        if (!canContinue) {
          await new Promise(resolve => sink.inputPipe.once('drain', resolve));
        }
      }
      await sink.stop();

      const content = await readFile(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      expect(lines.length).toBe(messageCount);
      
      for (let i = 0; i < messageCount; i++) {
        expect(lines[i]).toBe(`${i}`);
      }
    }, 60000);

    it('should handle mixed size writes efficiently', async () => {
      const filePath = join(testDir, 'mixed-sizes.log');
      const sink = new FilesystemSink(kernel, { path: filePath });
      const writeCount = 5000;

      await sink.start();
      
      for (let i = 0; i < writeCount; i++) {
        const size = (i % 10) === 0 ? 1024 : 16;
        const data = Buffer.alloc(size, i % 256);
        sink.inputPipe.write(data);
      }
      await sink.stop();

      const stats = sink.getStats();
      expect(stats.writeCount).toBe(writeCount);
      
      const fileStats = await stat(filePath);
      expect(fileStats.size).toBe(stats.byteCount);
    }, 30000);

    it('should handle rapid start/stop cycles', async () => {
      const cycles = 50;
      
      for (let i = 0; i < cycles; i++) {
        const filePath = join(testDir, `cycle-${i}.log`);
        const sink = new FilesystemSink(kernel, { path: filePath });
        
        await sink.start();
        sink.inputPipe.write(`cycle ${i}\n`);
        await sink.stop();
        
        const content = await readFile(filePath, 'utf8');
        expect(content).toBe(`cycle ${i}\n`);
      }
    }, 30000);
  });

  describe('Property-Based Tests', () => {
    it('should preserve write order for any sequence of strings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 100 }),
          async (messages) => {
            const filePath = join(testDir, `property-order-${Date.now()}-${Math.random()}.log`);
            const sink = new FilesystemSink(kernel, { path: filePath });

            await sink.start();
            for (const msg of messages) {
              sink.inputPipe.write(msg + '\n');
            }
            await sink.stop();

            const content = await readFile(filePath, 'utf8');
            const lines = content.split('\n');
            lines.pop();
            
            expect(lines.length).toBe(messages.length);
            for (let i = 0; i < messages.length; i++) {
              expect(lines[i]).toBe(messages[i]);
            }

            await rm(filePath, { force: true });
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);

    it('should correctly count bytes for any buffer sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uint8Array({ minLength: 1, maxLength: 1000 }), { minLength: 1, maxLength: 50 }),
          async (buffers) => {
            const filePath = join(testDir, `property-bytes-${Date.now()}-${Math.random()}.log`);
            const sink = new FilesystemSink(kernel, { path: filePath });

            const expectedBytes = buffers.reduce((sum, buf) => sum + buf.length, 0);

            await sink.start();
            for (const buf of buffers) {
              sink.inputPipe.write(Buffer.from(buf));
            }
            await sink.stop();

            const stats = sink.getStats();
            expect(stats.writeCount).toBe(buffers.length);
            expect(stats.byteCount).toBe(expectedBytes);

            const fileStats = await stat(filePath);
            expect(fileStats.size).toBe(expectedBytes);

            await rm(filePath, { force: true });
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);

    it('should handle any valid file path structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.stringMatching(/^[a-zA-Z0-9_-]+$/), { minLength: 1, maxLength: 5 }),
          async (pathComponents) => {
            const filePath = join(testDir, ...pathComponents, 'file.log');
            const sink = new FilesystemSink(kernel, { path: filePath });

            await sink.start();
            sink.inputPipe.write('test data\n');
            await sink.stop();

            const content = await readFile(filePath, 'utf8');
            expect(content).toBe('test data\n');

            const dirToClean = join(testDir, pathComponents[0]);
            await rm(dirToClean, { recursive: true, force: true });
          }
        ),
        { numRuns: 20 }
      );
    }, 60000);

    it('should produce valid JSONL for any input strings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 50 }),
          async (messages) => {
            const filePath = join(testDir, `property-jsonl-${Date.now()}-${Math.random()}.log`);
            const sink = new FilesystemSink(kernel, { path: filePath, format: 'jsonl' });

            await sink.start();
            for (const msg of messages) {
              sink.inputPipe.write(msg);
            }
            await sink.stop();

            const content = await readFile(filePath, 'utf8');
            const lines = content.trim().split('\n');
            
            expect(lines.length).toBe(messages.length);
            
            for (let i = 0; i < lines.length; i++) {
              const parsed = JSON.parse(lines[i]);
              expect(parsed).toHaveProperty('ts');
              expect(parsed).toHaveProperty('data');
              expect(parsed.data).toBe(messages[i]);
              expect(new Date(parsed.ts).toISOString()).toBe(parsed.ts);
            }

            await rm(filePath, { force: true });
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);

    it('should maintain statistics invariants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 1, maxLength: 100 }),
          async (messages) => {
            const filePath = join(testDir, `property-stats-${Date.now()}-${Math.random()}.log`);
            const sink = new FilesystemSink(kernel, { path: filePath });

            await sink.start();
            
            let expectedBytes = 0;
            for (const msg of messages) {
              const buf = Buffer.from(msg);
              expectedBytes += buf.length;
              sink.inputPipe.write(buf);
            }
            
            await sink.stop();

            const stats = sink.getStats();
            expect(stats.writeCount).toBe(messages.length);
            expect(stats.byteCount).toBe(expectedBytes);
            expect(stats.writeCount).toBeGreaterThanOrEqual(0);
            expect(stats.byteCount).toBeGreaterThanOrEqual(0);

            const fileStats = await stat(filePath);
            expect(fileStats.size).toBe(expectedBytes);

            await rm(filePath, { force: true });
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);
  });
});
