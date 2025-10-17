import { describe, it, expect } from 'vitest';
import { AnsiParser } from '../../src/transforms/AnsiParser.js';

const STYLE_EVENT_TYPE = 'style';

describe('AnsiParser color handling', () => {
  it('maps 256-color foreground indices to hex values', () => {
    const parser = new AnsiParser();
    const events = parser.parse('\u001b[38;5;196m');
    const styleEvent = events.find((event) => event.type === STYLE_EVENT_TYPE);

    expect(styleEvent).toBeDefined();
    expect(styleEvent?.type).toBe(STYLE_EVENT_TYPE);
    expect(styleEvent?.data.foregroundColor).toBe('#ff0000');
  });

  it('maps 256-color background indices to hex values', () => {
    const parser = new AnsiParser();
    const events = parser.parse('\u001b[48;5;21m');
    const styleEvent = events.find((event) => event.type === STYLE_EVENT_TYPE);

    expect(styleEvent).toBeDefined();
    expect(styleEvent?.data.backgroundColor).toBe('#0000ff');
  });

  it('converts truecolor RGB foreground values into hex', () => {
    const parser = new AnsiParser();
    const events = parser.parse('\u001b[38;2;255;128;64m');
    const styleEvent = events.find((event) => event.type === STYLE_EVENT_TYPE);

    expect(styleEvent).toBeDefined();
    expect(styleEvent?.data.foregroundColor).toBe('#ff8040');
  });

  it('clamps out-of-range high values for truecolor and palette indices', () => {
    const parser = new AnsiParser();

    const fgEvents = parser.parse('\u001b[38;2;400;0;0m');
    const fgStyleEvent = fgEvents.find((event) => event.type === STYLE_EVENT_TYPE);
    expect(fgStyleEvent?.data.foregroundColor).toBe('#ff0000');

    const bgEvents = parser.parse('\u001b[48;5;512m');
    const bgStyleEvent = bgEvents.find((event) => event.type === STYLE_EVENT_TYPE);
    expect(bgStyleEvent?.data.backgroundColor).toBe('#eeeeee');
  });
});
