import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RateLimiterTransform } from '../../src/transforms/rateLimiter.js';
import { Kernel } from '../../src/kernel/Kernel.js';

describe('RateLimiterTransform', () => {
  let kernel: Kernel;
  let rateLimiter: RateLimiterTransform;

  beforeEach(() => {
    kernel = new Kernel();
  });

  afterEach(() => {
    if (rateLimiter) {
      rateLimiter.stop();
    }
  });

  it('creates input and output pipes', () => {
    rateLimiter = new RateLimiterTransform(kernel);

    expect(rateLimiter.inputPipe).toBeDefined();
    expect(rateLimiter.outputPipe).toBeDefined();
  });

  it('initializes with full token capacity', () => {
    rateLimiter = new RateLimiterTransform(kernel, { capacity: 5 });

    expect(rateLimiter.getTokens()).toBe(5);
  });

  describe('basic rate limiting', () => {
    it('allows messages when tokens are available', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 3,
        refillRate: 1,
        refillInterval: 100
      });

      const received: string[] = [];
      rateLimiter.outputPipe.on('data', (chunk) => {
        received.push(chunk);
      });

      rateLimiter.inputPipe.write('msg1');
      rateLimiter.inputPipe.write('msg2');
      rateLimiter.inputPipe.write('msg3');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(received).toEqual(['msg1', 'msg2', 'msg3']);
      expect(rateLimiter.getTokens()).toBe(0);
    });

    it('holds messages when bucket is empty', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 2,
        refillRate: 0,
        refillInterval: 10000
      });

      const received: string[] = [];
      const done = new Promise<void>((resolve) => {
        let count = 0;
        rateLimiter.outputPipe.on('data', (chunk) => {
          received.push(chunk);
          count++;
          if (count === 2) {
            setTimeout(resolve, 50);
          }
        });
      });
      
      rateLimiter.inputPipe.write('msg1');
      rateLimiter.inputPipe.write('msg2');
      rateLimiter.inputPipe.write('msg3');
      rateLimiter.inputPipe.write('msg4');

      await done;

      expect(received).toEqual(['msg1', 'msg2']);
      expect(rateLimiter.getPendingCount()).toBeGreaterThanOrEqual(1);
    });

    it('releases messages when tokens become available', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 2,
        refillRate: 2,
        refillInterval: 100
      });

      const received: string[] = [];
      rateLimiter.outputPipe.on('data', (chunk) => {
        received.push(chunk);
      });

      rateLimiter.inputPipe.write('msg1');
      rateLimiter.inputPipe.write('msg2');
      rateLimiter.inputPipe.write('msg3');
      rateLimiter.inputPipe.write('msg4');

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(received).toEqual(['msg1', 'msg2']);

      await new Promise(resolve => setTimeout(resolve, 120));
      expect(received).toEqual(['msg1', 'msg2', 'msg3', 'msg4']);
    });

    it('refills tokens at specified rate', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 10,
        refillRate: 3,
        refillInterval: 100
      });

      rateLimiter.inputPipe.write('msg1');
      rateLimiter.inputPipe.write('msg2');
      rateLimiter.inputPipe.write('msg3');

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(rateLimiter.getTokens()).toBe(7);

      await new Promise(resolve => setTimeout(resolve, 120));
      expect(rateLimiter.getTokens()).toBe(10);
    });

    it('does not exceed capacity when refilling', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 5,
        refillRate: 10,
        refillInterval: 100
      });

      await new Promise(resolve => setTimeout(resolve, 250));

      expect(rateLimiter.getTokens()).toBe(5);
    });
  });

  describe('burst handling', () => {
    it('handles burst traffic up to capacity', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 5,
        refillRate: 1,
        refillInterval: 100
      });

      const received: string[] = [];
      rateLimiter.outputPipe.on('data', (chunk) => {
        received.push(chunk);
      });

      for (let i = 0; i < 5; i++) {
        rateLimiter.inputPipe.write(`msg${i}`);
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(received.length).toBe(5);
      expect(rateLimiter.getTokens()).toBe(0);
    });

    it('queues messages exceeding burst capacity', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 3,
        refillRate: 0,
        refillInterval: 10000
      });

      const received: string[] = [];
      const done = new Promise<void>((resolve) => {
        let count = 0;
        rateLimiter.outputPipe.on('data', (chunk) => {
          received.push(chunk);
          count++;
          if (count === 3) {
            setTimeout(resolve, 50);
          }
        });
      });
      
      for (let i = 0; i < 10; i++) {
        rateLimiter.inputPipe.write(`msg${i}`);
      }

      await done;

      expect(received.length).toBe(3);
      expect(rateLimiter.getPendingCount()).toBeGreaterThanOrEqual(1);
    });

    it('processes burst after refill period', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 2,
        refillRate: 2,
        refillInterval: 100
      });

      const received: string[] = [];
      rateLimiter.outputPipe.on('data', (chunk) => {
        received.push(chunk);
      });

      for (let i = 0; i < 6; i++) {
        rateLimiter.inputPipe.write(`msg${i}`);
      }

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(received.length).toBe(2);

      await new Promise(resolve => setTimeout(resolve, 120));
      expect(received.length).toBe(4);

      await new Promise(resolve => setTimeout(resolve, 120));
      expect(received.length).toBe(6);
    });
  });

  describe('backpressure', () => {
    it('maintains pending queue under backpressure', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 1,
        refillRate: 0,
        refillInterval: 10000
      });

      const done = new Promise<void>((resolve) => {
        rateLimiter.outputPipe.on('data', () => {
          setTimeout(resolve, 50);
        });
      });
      
      rateLimiter.inputPipe.write('msg1');
      rateLimiter.inputPipe.write('msg2');
      rateLimiter.inputPipe.write('msg3');

      await done;

      expect(rateLimiter.getPendingCount()).toBeGreaterThanOrEqual(1);
    });

    it('processes pending messages in FIFO order', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 1,
        refillRate: 1,
        refillInterval: 100
      });

      const received: string[] = [];
      rateLimiter.outputPipe.on('data', (chunk) => {
        received.push(chunk);
      });

      rateLimiter.inputPipe.write('msg1');
      rateLimiter.inputPipe.write('msg2');
      rateLimiter.inputPipe.write('msg3');

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(received).toEqual(['msg1']);

      await new Promise(resolve => setTimeout(resolve, 120));
      expect(received).toEqual(['msg1', 'msg2']);

      await new Promise(resolve => setTimeout(resolve, 120));
      expect(received).toEqual(['msg1', 'msg2', 'msg3']);
    });

    it('handles continuous message flow under rate limit', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 5,
        refillRate: 2,
        refillInterval: 50
      });

      const received: string[] = [];
      rateLimiter.outputPipe.on('data', (chunk) => {
        received.push(chunk);
      });

      for (let i = 0; i < 20; i++) {
        rateLimiter.inputPipe.write(`msg${i}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(received.length).toBeGreaterThanOrEqual(5);
      expect(received.length).toBeLessThanOrEqual(10);

      await new Promise(resolve => setTimeout(resolve, 400));
      expect(received.length).toBe(20);
    });

    it('clears pending queue gradually as tokens refill', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 2,
        refillRate: 1,
        refillInterval: 150
      });

      const received: string[] = [];
      const done = new Promise<void>((resolve) => {
        let count = 0;
        rateLimiter.outputPipe.on('data', (chunk) => {
          received.push(chunk);
          count++;
          if (count === 2) {
            setTimeout(resolve, 50);
          }
        });
      });
      
      for (let i = 0; i < 5; i++) {
        rateLimiter.inputPipe.write(`msg${i}`);
      }

      await done;
      const initialPending = rateLimiter.getPendingCount();
      expect(initialPending).toBeGreaterThanOrEqual(1);

      await new Promise(resolve => setTimeout(resolve, 150));
      const afterFirst = rateLimiter.getPendingCount();
      expect(afterFirst).toBeLessThanOrEqual(initialPending);

      await new Promise(resolve => setTimeout(resolve, 300));
      expect(rateLimiter.getPendingCount()).toBe(0);
    });
  });

  describe('configuration', () => {
    it('uses default options', () => {
      rateLimiter = new RateLimiterTransform(kernel);

      expect(rateLimiter.getTokens()).toBe(10);
    });

    it('respects custom capacity', () => {
      rateLimiter = new RateLimiterTransform(kernel, { capacity: 20 });

      expect(rateLimiter.getTokens()).toBe(20);
    });

    it('respects custom refill rate', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 10,
        refillRate: 5,
        refillInterval: 100
      });

      rateLimiter.inputPipe.write('msg1');
      rateLimiter.inputPipe.write('msg2');

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(rateLimiter.getTokens()).toBe(8);

      await new Promise(resolve => setTimeout(resolve, 120));
      expect(rateLimiter.getTokens()).toBeGreaterThanOrEqual(10);
    });

    it('respects custom refill interval', async () => {
      rateLimiter = new RateLimiterTransform(kernel, {
        capacity: 10,
        refillRate: 2,
        refillInterval: 200
      });

      rateLimiter.inputPipe.write('msg1');
      rateLimiter.inputPipe.write('msg2');

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(rateLimiter.getTokens()).toBe(8);

      await new Promise(resolve => setTimeout(resolve, 180));
      expect(rateLimiter.getTokens()).toBe(10);
    });
  });

  it('stops refill timer when stop is called', async () => {
    rateLimiter = new RateLimiterTransform(kernel, {
      capacity: 10,
      refillRate: 5,
      refillInterval: 100
    });

    rateLimiter.inputPipe.write('msg1');
    rateLimiter.inputPipe.write('msg2');

    await new Promise(resolve => setTimeout(resolve, 50));
    const tokensBeforeStop = rateLimiter.getTokens();

    rateLimiter.stop();

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(rateLimiter.getTokens()).toBe(tokensBeforeStop);
  });

  it('passes through data without modification', async () => {
    rateLimiter = new RateLimiterTransform(kernel, {
      capacity: 5,
      refillRate: 1,
      refillInterval: 100
    });

    const received: any[] = [];
    rateLimiter.outputPipe.on('data', (chunk) => {
      received.push(chunk);
    });

    rateLimiter.inputPipe.write('string');
    rateLimiter.inputPipe.write({ type: 'object', value: 42 });
    rateLimiter.inputPipe.write(Buffer.from('buffer'));

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(received).toEqual([
      'string',
      { type: 'object', value: 42 },
      Buffer.from('buffer')
    ]);
  });
});
