import { describe, it, expect } from 'vitest';
import { AnsiParser } from '../../src/transforms/AnsiParser.js';
import type { AnsiParserEvent } from '../../src/transforms/AnsiParser.js';

const MODE_EVENT = 'mode';

const isPrintEvent = (event: AnsiParserEvent): event is Extract<AnsiParserEvent, { type: 'print' }> =>
  event.type === 'print';

describe('AnsiParser DEC private modes', () => {
  it('toggles auto-wrap mode via DECSET/DECRST (mode 7)', () => {
    const parser = new AnsiParser();

    let events = parser.parse('\u001b[?7l');
    expect(events.find(event => event.type === MODE_EVENT)).toBeDefined();
    expect(parser.getState().autoWrap).toBe(false);

    events = parser.parse('\u001b[?7h');
    expect(events.find(event => event.type === MODE_EVENT)).toBeDefined();
    expect(parser.getState().autoWrap).toBe(true);
  });

  it('wraps to the next line when auto-wrap is enabled', () => {
    const parser = new AnsiParser({ cols: 2, rows: 10 });
    const events = parser.parse('ABCD');

    const printEvents = events.filter(isPrintEvent);
    expect(printEvents).toHaveLength(2);
    expect(printEvents[0]?.data.x).toBe(0);
    expect(printEvents[0]?.data.y).toBe(0);
    expect(printEvents[1]?.data.x).toBe(0);
    expect(printEvents[1]?.data.y).toBe(1);

    const state = parser.getState();
    expect(state.autoWrap).toBe(true);
    expect(state.cursorX).toBe(0);
    expect(state.cursorY).toBe(2);
  });

  it('does not wrap when auto-wrap is disabled', () => {
    const parser = new AnsiParser({ cols: 2, rows: 10 });
    parser.parse('\u001b[?7l');

    const events = parser.parse('ABCD');
    const printEvents = events.filter(isPrintEvent);
    expect(printEvents).toHaveLength(1);
    expect(printEvents[0]?.data.x).toBe(0);
    expect(printEvents[0]?.data.y).toBe(0);
    expect(printEvents[0]?.data.char).toBe('ABCD');

    const state = parser.getState();
    expect(state.autoWrap).toBe(false);
    expect(state.cursorY).toBe(0);
    expect(state.cursorX).toBe(parser.getDimensions().cols - 1);
  });

  it('tracks screen inverse mode via DECSCNM (mode 5)', () => {
    const parser = new AnsiParser();

    parser.parse('\u001b[?5h');
    expect(parser.getState().screenInverse).toBe(true);

    parser.parse('\u001b[?5l');
    expect(parser.getState().screenInverse).toBe(false);
  });
});
