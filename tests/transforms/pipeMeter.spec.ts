import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PipeMeterTransform } from '../../src/transforms/pipeMeter.js';
import { Kernel } from '../../src/kernel/Kernel.js';

describe('PipeMeterTransform', () => {
  let kernel: Kernel;
  let pipeMeter: PipeMeterTransform;

  beforeEach(() => {
    kernel = new Kernel();
  });

  afterEach(() => {
    if (pipeMeter) {
      pipeMeter.stop();
    }
  });

  it('creates input and output pipes', () => {
    pipeMeter = new PipeMeterTransform(kernel);

    expect(pipeMeter.inputPipe).toBeDefined();
    expect(pipeMeter.outputPipe).toBeDefined();
  });

  it('passes through data without modification', async () => {
    pipeMeter = new PipeMeterTransform(kernel);
    const received: string[] = [];

    pipeMeter.outputPipe.on('data', (chunk) => {
      received.push(chunk);
    });

    pipeMeter.inputPipe.write('hello');
    pipeMeter.inputPipe.write('world');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).toEqual(['hello', 'world']);
  });

  it('tracks total messages', async () => {
    pipeMeter = new PipeMeterTransform(kernel);

    pipeMeter.inputPipe.write('message1');
    pipeMeter.inputPipe.write('message2');
    pipeMeter.inputPipe.write('message3');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const metrics = pipeMeter.getMetrics();
    expect(metrics.totalMessages).toBe(3);
  });

  it('tracks total bytes for string chunks', async () => {
    pipeMeter = new PipeMeterTransform(kernel);

    pipeMeter.inputPipe.write('hello');
    pipeMeter.inputPipe.write('world');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const metrics = pipeMeter.getMetrics();
    expect(metrics.totalBytes).toBe(10);
  });

  it('tracks total bytes for buffer chunks', async () => {
    pipeMeter = new PipeMeterTransform(kernel);

    pipeMeter.inputPipe.write(Buffer.from('hello'));
    pipeMeter.inputPipe.write(Buffer.from('world'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const metrics = pipeMeter.getMetrics();
    expect(metrics.totalBytes).toBe(10);
  });

  it('tracks total bytes for object chunks', async () => {
    pipeMeter = new PipeMeterTransform(kernel);

    const obj1 = { value: 'test' };
    const obj2 = { value: 'data' };

    pipeMeter.inputPipe.write(obj1);
    pipeMeter.inputPipe.write(obj2);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const metrics = pipeMeter.getMetrics();
    const expectedSize =
      Buffer.byteLength(JSON.stringify(obj1), 'utf8') +
      Buffer.byteLength(JSON.stringify(obj2), 'utf8');

    expect(metrics.totalBytes).toBe(expectedSize);
  });

  it('calculates bytes per second', async () => {
    pipeMeter = new PipeMeterTransform(kernel, { emitInterval: 200 });

    pipeMeter.inputPipe.write('hello');

    await new Promise((resolve) => setTimeout(resolve, 250));

    pipeMeter.inputPipe.write('world');

    await new Promise((resolve) => setTimeout(resolve, 250));

    const metrics = pipeMeter.getMetrics();
    expect(metrics.bytesPerSecond).toBeGreaterThanOrEqual(0);
  });

  it('calculates messages per second', async () => {
    pipeMeter = new PipeMeterTransform(kernel, { emitInterval: 200 });

    pipeMeter.inputPipe.write('msg1');

    await new Promise((resolve) => setTimeout(resolve, 250));

    pipeMeter.inputPipe.write('msg2');
    pipeMeter.inputPipe.write('msg3');

    await new Promise((resolve) => setTimeout(resolve, 250));

    const metrics = pipeMeter.getMetrics();
    expect(metrics.messagesPerSecond).toBeGreaterThanOrEqual(0);
  });

  it('returns metrics with correct structure', async () => {
    pipeMeter = new PipeMeterTransform(kernel);

    pipeMeter.inputPipe.write('test');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const metrics = pipeMeter.getMetrics();

    expect(metrics).toHaveProperty('totalBytes');
    expect(metrics).toHaveProperty('totalMessages');
    expect(metrics).toHaveProperty('bytesPerSecond');
    expect(metrics).toHaveProperty('messagesPerSecond');
    expect(metrics).toHaveProperty('startTime');
    expect(metrics).toHaveProperty('lastUpdateTime');

    expect(typeof metrics.totalBytes).toBe('number');
    expect(typeof metrics.totalMessages).toBe('number');
    expect(typeof metrics.bytesPerSecond).toBe('number');
    expect(typeof metrics.messagesPerSecond).toBe('number');
    expect(typeof metrics.startTime).toBe('number');
    expect(typeof metrics.lastUpdateTime).toBe('number');
  });

  it('respects custom emit interval', async () => {
    const customInterval = 200;
    pipeMeter = new PipeMeterTransform(kernel, { emitInterval: customInterval });

    pipeMeter.inputPipe.write('test');

    await new Promise((resolve) => setTimeout(resolve, customInterval + 50));

    const metrics = pipeMeter.getMetrics();
    expect(metrics.totalMessages).toBe(1);
  });

  it('updates lastUpdateTime on getMetrics call', async () => {
    pipeMeter = new PipeMeterTransform(kernel);

    const metrics1 = pipeMeter.getMetrics();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const metrics2 = pipeMeter.getMetrics();

    expect(metrics2.lastUpdateTime).toBeGreaterThanOrEqual(metrics1.lastUpdateTime);
  });

  it('stops metrics emitter when stop is called', async () => {
    pipeMeter = new PipeMeterTransform(kernel, { emitInterval: 100 });

    pipeMeter.inputPipe.write('test');

    await new Promise((resolve) => setTimeout(resolve, 50));

    pipeMeter.stop();

    const metrics1 = pipeMeter.getMetrics();

    await new Promise((resolve) => setTimeout(resolve, 200));

    const metrics2 = pipeMeter.getMetrics();

    expect(metrics1.totalMessages).toBe(1);
    expect(metrics2.totalMessages).toBe(1);
  });

  it('handles high throughput', async () => {
    pipeMeter = new PipeMeterTransform(kernel, { emitInterval: 500 });

    const messageCount = 50;
    let received = 0;

    const done = new Promise<void>((resolve) => {
      pipeMeter.outputPipe.on('data', () => {
        received++;
        if (received === messageCount) {
          resolve();
        }
      });
    });

    for (let i = 0; i < messageCount; i++) {
      pipeMeter.inputPipe.write('x');
    }

    await done;
    await new Promise((resolve) => setTimeout(resolve, 100));

    const metrics = pipeMeter.getMetrics();
    expect(metrics.totalMessages).toBe(messageCount);
    expect(metrics.totalBytes).toBe(messageCount);
  });

  it('handles mixed chunk types', async () => {
    pipeMeter = new PipeMeterTransform(kernel);

    pipeMeter.inputPipe.write('string');
    pipeMeter.inputPipe.write(Buffer.from('buffer'));
    pipeMeter.inputPipe.write({ type: 'object' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const metrics = pipeMeter.getMetrics();
    expect(metrics.totalMessages).toBe(3);
    expect(metrics.totalBytes).toBeGreaterThan(0);
  });

  it('initializes with zero metrics', () => {
    pipeMeter = new PipeMeterTransform(kernel);

    const metrics = pipeMeter.getMetrics();

    expect(metrics.totalBytes).toBe(0);
    expect(metrics.totalMessages).toBe(0);
    expect(metrics.bytesPerSecond).toBe(0);
    expect(metrics.messagesPerSecond).toBe(0);
  });
});
