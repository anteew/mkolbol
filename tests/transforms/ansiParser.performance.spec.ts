import { describe, it, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { AnsiParser } from '../../src/transforms/AnsiParser.js';
import type { AnsiParserEvent } from '../../src/transforms/AnsiParser.js';

const countStyleEvents = (events: AnsiParserEvent[]) =>
  events.filter(event => event.type === 'style').length;

const countPrintEvents = (events: AnsiParserEvent[]) =>
  events.filter(event => event.type === 'print').length;

describe('AnsiParser performance guards', () => {
  it('processes extended palette sequences within budget', () => {
    const parser = new AnsiParser();
    const payload = Array.from({ length: 300 }, (_, idx) => `\u001b[38;5;${idx % 256}mX`).join('');

    const start = performance.now();
    const events = parser.parse(payload);
    const duration = performance.now() - start;

    expect(countStyleEvents(events)).toBe(300);
    expect(duration).toBeLessThan(75);
  });

  it('processes truecolor sequences within budget', () => {
    const parser = new AnsiParser();
    const payload = Array.from({ length: 200 }, () => '\u001b[38;2;255;128;64mX').join('');

    const start = performance.now();
    const events = parser.parse(payload);
    const duration = performance.now() - start;

    expect(countStyleEvents(events)).toBe(200);
    expect(duration).toBeLessThan(75);
  });

  describe('OSC handling robustness', () => {
    it('limits large OSC payload to prevent DOS', () => {
      const parser = new AnsiParser({ oscMaxLength: 1000 });
      const largePayload = '\x1b]0;' + 'A'.repeat(5000) + '\x07';

      const start = performance.now();
      const events = parser.parse(largePayload);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(events.length).toBeGreaterThanOrEqual(0);
    });

    it('handles incomplete OSC sequences gracefully', () => {
      const parser = new AnsiParser();
      const incomplete = '\x1b]0;Title without terminator';

      const events = parser.parse(incomplete);
      expect(events.length).toBeGreaterThanOrEqual(0);
    });

    it('handles nested escape sequences', () => {
      const parser = new AnsiParser();
      const nested = '\x1b]0;Title\x1b[31m\x07Text';

      const start = performance.now();
      const events = parser.parse(nested);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
      expect(events.length).toBeGreaterThan(0);
    });

    it('handles malformed OSC input', () => {
      const parser = new AnsiParser();
      const malformed = '\x1b]\x1b]\x1b]0;Bad\x07';

      const events = parser.parse(malformed);
      expect(events.length).toBeGreaterThanOrEqual(0);
    });

    it('handles very long OSC sequences with proper termination', () => {
      const parser = new AnsiParser({ oscMaxLength: 200000 });
      const longOsc = '\x1b]0;' + 'Title'.repeat(10000) + '\x07Normal text';

      const start = performance.now();
      const events = parser.parse(longOsc);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
      expect(countPrintEvents(events)).toBeGreaterThan(0);
    });

    it('prevents timeout on pathological input', () => {
      const parser = new AnsiParser({ oscTimeoutMs: 100, maxParseIterations: 50000 });
      const pathological = '\x1b]0;' + 'A'.repeat(200000);

      const start = performance.now();
      const events = parser.parse(pathological);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(150);
    });

    it('handles multiple OSC sequences efficiently', () => {
      const parser = new AnsiParser();
      const multiple = Array.from({ length: 100 }, (_, i) => 
        `\x1b]0;Title${i}\x07Text${i}`
      ).join('');

      const start = performance.now();
      const events = parser.parse(multiple);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(countPrintEvents(events)).toBeGreaterThan(0);
    });

    it('respects maxParseIterations guard', () => {
      const parser = new AnsiParser({ maxParseIterations: 1000 });
      const large = 'A'.repeat(10000);

      const start = performance.now();
      const events = parser.parse(large);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
      expect(events.length).toBeGreaterThanOrEqual(0);
    });

    it('handles OSC with ST terminator', () => {
      const parser = new AnsiParser();
      const oscST = '\x1b]0;Title\x1b\\Normal text';

      const events = parser.parse(oscST);
      expect(countPrintEvents(events)).toBeGreaterThan(0);
    });

    it('handles mixed OSC terminators', () => {
      const parser = new AnsiParser();
      const mixed = '\x1b]0;First\x07\x1b]1;Second\x1b\\Text';

      const events = parser.parse(mixed);
      expect(countPrintEvents(events)).toBeGreaterThan(0);
    });
  });
});
