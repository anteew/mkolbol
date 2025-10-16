import { describe, it, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { AnsiParser } from '../../src/transforms/AnsiParser.js';
import type { AnsiParserEvent } from '../../src/transforms/AnsiParser.js';

const countStyleEvents = (events: AnsiParserEvent[]) =>
  events.filter(event => event.type === 'style').length;

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
});
