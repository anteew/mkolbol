import { describe, it, expect } from 'vitest';
import { AnsiParser } from '../../src/transforms/AnsiParser.js';

describe('AnsiParser resize handling', () => {
  it('accepts initial dimensions via constructor options', () => {
    const parser = new AnsiParser({ cols: 120, rows: 40 });

    expect(parser.getDimensions()).toEqual({ cols: 120, rows: 40 });
  });

  it('clamps cursor state when resized to smaller dimensions', () => {
    const parser = new AnsiParser();
    const internalState = (parser as unknown as { state: { cursorX: number; cursorY: number } }).state;
    internalState.cursorX = 200;
    internalState.cursorY = 80;

    const event = parser.resize(10, 5);

    expect(event).toEqual({ type: 'resize', data: { cols: 10, rows: 5 } });
    expect(parser.getDimensions()).toEqual({ cols: 10, rows: 5 });

    const { cursorX, cursorY } = parser.getState();
    expect(cursorX).toBe(9);
    expect(cursorY).toBe(4);
  });

  it('emits resize events from CSI 8;n;m t sequences', () => {
    const parser = new AnsiParser();
    const events = parser.parse('\u001b[8;40;120t');

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'resize', data: { cols: 120, rows: 40 } });
    expect(parser.getDimensions()).toEqual({ cols: 120, rows: 40 });
  });
});
