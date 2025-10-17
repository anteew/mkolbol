import { describe, it, expect, beforeEach } from 'vitest';
import { TeeTransform } from '../../src/transforms/tee.js';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Writable } from 'stream';

describe('TeeTransform', () => {
  let kernel: Kernel;

  beforeEach(() => {
    kernel = new Kernel();
  });

  it('creates input pipe and output pipes', () => {
    const tee = new TeeTransform(kernel, { outputCount: 2 });

    expect(tee.inputPipe).toBeDefined();
    expect(tee.outputPipes).toBeDefined();
    expect(tee.outputPipes.length).toBe(2);
  });

  it('defaults to 2 output pipes', () => {
    const tee = new TeeTransform(kernel);

    expect(tee.outputPipes.length).toBe(2);
  });

  it('creates configurable number of output pipes', () => {
    const tee = new TeeTransform(kernel, { outputCount: 5 });

    expect(tee.outputPipes.length).toBe(5);
  });

  it('throws error if outputCount is less than 1', () => {
    expect(() => new TeeTransform(kernel, { outputCount: 0 })).toThrow(
      'outputCount must be at least 1',
    );
  });

  it('duplicates data to all output pipes', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 3 });
    const outputs: string[][] = [[], [], []];

    tee.outputPipes.forEach((pipe, index) => {
      pipe.on('data', (chunk) => {
        outputs[index].push(chunk);
      });
    });

    tee.inputPipe.write('chunk1');
    tee.inputPipe.write('chunk2');
    tee.inputPipe.write('chunk3');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(outputs[0]).toEqual(['chunk1', 'chunk2', 'chunk3']);
    expect(outputs[1]).toEqual(['chunk1', 'chunk2', 'chunk3']);
    expect(outputs[2]).toEqual(['chunk1', 'chunk2', 'chunk3']);
  });

  it('handles single output pipe', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 1 });
    const received: string[] = [];

    tee.outputPipes[0].on('data', (chunk) => {
      received.push(chunk);
    });

    tee.inputPipe.write('test1');
    tee.inputPipe.write('test2');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).toEqual(['test1', 'test2']);
  });

  it('handles object mode data', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 2, objectMode: true });
    const outputs: any[][] = [[], []];

    tee.outputPipes.forEach((pipe, index) => {
      pipe.on('data', (chunk) => {
        outputs[index].push(chunk);
      });
    });

    const obj1 = { type: 'data', value: 1 };
    const obj2 = { type: 'info', value: 2 };

    tee.inputPipe.write(obj1);
    tee.inputPipe.write(obj2);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(outputs[0]).toEqual([obj1, obj2]);
    expect(outputs[1]).toEqual([obj1, obj2]);
  });

  it('handles buffer mode data', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 2, objectMode: false });
    const outputs: Buffer[][] = [[], []];

    tee.outputPipes.forEach((pipe, index) => {
      pipe.on('data', (chunk) => {
        outputs[index].push(chunk);
      });
    });

    const buf1 = Buffer.from('hello');
    const buf2 = Buffer.from('world');

    tee.inputPipe.write(buf1);
    tee.inputPipe.write(buf2);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(outputs[0][0].equals(buf1)).toBe(true);
    expect(outputs[0][1].equals(buf2)).toBe(true);
    expect(outputs[1][0].equals(buf1)).toBe(true);
    expect(outputs[1][1].equals(buf2)).toBe(true);
  });

  it('handles backpressure from slow output', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 2 });
    const fastOutput: string[] = [];
    const slowOutput: string[] = [];
    let slowReady = true;

    tee.outputPipes[0].on('data', (chunk) => {
      fastOutput.push(chunk);
    });

    const slowWritable = new Writable({
      objectMode: true,
      highWaterMark: 2,
      write(chunk, _enc, callback) {
        slowOutput.push(chunk);
        setTimeout(() => {
          callback();
        }, 100);
      },
    });

    tee.outputPipes[1].pipe(slowWritable);

    for (let i = 0; i < 10; i++) {
      tee.inputPipe.write(`chunk${i}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(fastOutput.length).toBe(10);
    expect(slowOutput.length).toBe(10);
    expect(fastOutput).toEqual(slowOutput);
  });

  it('handles multiple slow outputs', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 3 });
    const outputs: string[][] = [[], [], []];
    const delays = [0, 50, 100];

    tee.outputPipes.forEach((pipe, index) => {
      const writable = new Writable({
        objectMode: true,
        write(chunk, _enc, callback) {
          outputs[index].push(chunk);
          setTimeout(() => {
            callback();
          }, delays[index]);
        },
      });
      pipe.pipe(writable);
    });

    for (let i = 0; i < 5; i++) {
      tee.inputPipe.write(`msg${i}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(outputs[0].length).toBe(5);
    expect(outputs[1].length).toBe(5);
    expect(outputs[2].length).toBe(5);
    expect(outputs[0]).toEqual(outputs[1]);
    expect(outputs[1]).toEqual(outputs[2]);
  });

  it('maintains data order across all outputs', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 3 });
    const outputs: number[][] = [[], [], []];

    tee.outputPipes.forEach((pipe, index) => {
      pipe.on('data', (chunk) => {
        outputs[index].push(chunk);
      });
    });

    for (let i = 0; i < 100; i++) {
      tee.inputPipe.write(i);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const expected = Array.from({ length: 100 }, (_, i) => i);
    expect(outputs[0]).toEqual(expected);
    expect(outputs[1]).toEqual(expected);
    expect(outputs[2]).toEqual(expected);
  });

  it('handles empty stream', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 2 });
    const outputs: string[][] = [[], []];

    tee.outputPipes.forEach((pipe, index) => {
      pipe.on('data', (chunk) => {
        outputs[index].push(chunk);
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(outputs[0]).toEqual([]);
    expect(outputs[1]).toEqual([]);
  });

  it('handles large chunks', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 2 });
    const outputs: string[][] = [[], []];

    tee.outputPipes.forEach((pipe, index) => {
      pipe.on('data', (chunk) => {
        outputs[index].push(chunk);
      });
    });

    const largeChunk = 'x'.repeat(10000);
    tee.inputPipe.write(largeChunk);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(outputs[0][0]).toBe(largeChunk);
    expect(outputs[1][0]).toBe(largeChunk);
  });

  it('handles rapid writes', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 2 });
    const outputs: number[][] = [[], []];

    tee.outputPipes.forEach((pipe, index) => {
      pipe.on('data', (chunk) => {
        outputs[index].push(chunk);
      });
    });

    for (let i = 0; i < 1000; i++) {
      tee.inputPipe.write(i);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(outputs[0].length).toBe(1000);
    expect(outputs[1].length).toBe(1000);
    expect(outputs[0]).toEqual(outputs[1]);
  });

  it('resumes after backpressure is relieved', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 2 });
    const output: string[] = [];
    let pauseCount = 0;

    const slowWritable = new Writable({
      objectMode: true,
      highWaterMark: 3,
      write(chunk, _enc, callback) {
        output.push(chunk);
        if (output.length <= 3) {
          pauseCount++;
          setTimeout(() => callback(), 100);
        } else {
          callback();
        }
      },
    });

    tee.outputPipes[0].pipe(slowWritable);
    tee.outputPipes[1].on('data', () => {});

    for (let i = 0; i < 10; i++) {
      tee.inputPipe.write(`item${i}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(output.length).toBe(10);
  });

  it('works with many outputs', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 10 });
    const outputs: string[][] = Array.from({ length: 10 }, () => []);

    tee.outputPipes.forEach((pipe, index) => {
      pipe.on('data', (chunk) => {
        outputs[index].push(chunk);
      });
    });

    tee.inputPipe.write('test');

    await new Promise((resolve) => setTimeout(resolve, 50));

    outputs.forEach((output) => {
      expect(output).toEqual(['test']);
    });
  });

  it('handles end event', async () => {
    const tee = new TeeTransform(kernel, { outputCount: 2 });
    const received: string[][] = [[], []];

    tee.outputPipes.forEach((pipe, index) => {
      pipe.on('data', (chunk) => {
        received[index].push(chunk);
      });
    });

    const endPromise = new Promise<void>((resolve) => {
      let endedCount = 0;
      tee.outputPipes.forEach((pipe) => {
        pipe.on('finish', () => {
          endedCount++;
          if (endedCount === 2) {
            resolve();
          }
        });
      });
    });

    tee.inputPipe.write('data1');
    tee.inputPipe.write('data2');
    tee.inputPipe.end();

    await Promise.race([
      endPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100)),
    ]);

    expect(received[0]).toEqual(['data1', 'data2']);
    expect(received[1]).toEqual(['data1', 'data2']);
  });
});
