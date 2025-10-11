import { describe, it, expect, beforeEach } from 'vitest';
import { ANSIParser } from '../../src/parsers/ANSIParser.js';

describe('ANSIParser', () => {
  let parser: ANSIParser;

  beforeEach(() => {
    parser = new ANSIParser(24, 80);
  });

  it('should parse regular characters', () => {
    const state = parser.parse(Buffer.from('Hello'));
    
    expect(state.cells[0][0].char).toBe('H');
    expect(state.cells[0][1].char).toBe('e');
    expect(state.cells[0][2].char).toBe('l');
    expect(state.cells[0][3].char).toBe('l');
    expect(state.cells[0][4].char).toBe('o');
    expect(state.cursorX).toBe(5);
    expect(state.cursorY).toBe(0);
  });

  it('should handle newlines', () => {
    parser.parse(Buffer.from('Line1\nLine2'));
    const state = parser.getState();
    
    expect(state.cells[0][0].char).toBe('L');
    expect(state.cells[1][0].char).toBe('L');
    expect(state.cursorY).toBe(1);
  });

  it('should handle carriage return', () => {
    parser.parse(Buffer.from('ABC\rDEF'));
    const state = parser.getState();
    
    expect(state.cells[0][0].char).toBe('D');
    expect(state.cells[0][1].char).toBe('E');
    expect(state.cells[0][2].char).toBe('F');
  });

  it('should parse ANSI cursor movement (CUP)', () => {
    parser.parse(Buffer.from('\x1b[5;10HX'));
    const state = parser.getState();
    
    expect(state.cursorY).toBe(4);
    expect(state.cursorX).toBe(10);
    expect(state.cells[4][9].char).toBe('X');
  });

  it('should handle color codes (SGR)', () => {
    parser.parse(Buffer.from('\x1b[31mRed'));
    const state = parser.getState();
    
    expect(state.currentFg).toBe('#800000');
    expect(state.cells[0][0].fg).toBe('#800000');
  });

  it('should handle color reset', () => {
    parser.parse(Buffer.from('\x1b[31mRed\x1b[0mNormal'));
    const state = parser.getState();
    
    expect(state.cells[0][0].fg).toBe('#800000');
    expect(state.cells[0][3].fg).toBe(null);
  });

  it('should handle screen clearing (ED)', () => {
    parser.parse(Buffer.from('ABCDEFGH'));
    parser.parse(Buffer.from('\x1b[2J'));
    const state = parser.getState();
    
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        expect(state.cells[y][x].char).toBe(' ');
      }
    }
  });

  it('should handle line clearing (EL)', () => {
    parser.parse(Buffer.from('ABCDEFGH'));
    parser.parse(Buffer.from('\x1b[1G\x1b[K'));
    const state = parser.getState();
    
    for (let x = 0; x < state.cols; x++) {
      expect(state.cells[0][x].char).toBe(' ');
    }
  });

  it('should handle cursor up (CUU)', () => {
    parser.parse(Buffer.from('Line1\nLine2'));
    parser.parse(Buffer.from('\x1b[A'));
    const state = parser.getState();
    
    expect(state.cursorY).toBe(0);
  });

  it('should handle cursor down (CUD)', () => {
    parser.parse(Buffer.from('\x1b[B'));
    const state = parser.getState();
    
    expect(state.cursorY).toBe(1);
  });

  it('should handle cursor forward (CUF)', () => {
    parser.parse(Buffer.from('\x1b[5C'));
    const state = parser.getState();
    
    expect(state.cursorX).toBe(5);
  });

  it('should handle cursor back (CUB)', () => {
    parser.parse(Buffer.from('ABCDE\x1b[3D'));
    const state = parser.getState();
    
    expect(state.cursorX).toBe(2);
  });

  it('should handle line wrapping', () => {
    const longLine = 'A'.repeat(85);
    parser.parse(Buffer.from(longLine));
    const state = parser.getState();
    
    expect(state.cursorY).toBe(1);
    expect(state.cursorX).toBe(5);
  });

  it('should handle scrolling', () => {
    for (let i = 0; i < 25; i++) {
      parser.parse(Buffer.from(`Line${i}\n`));
    }
    const state = parser.getState();
    
    expect(state.scrollback.length).toBeGreaterThan(0);
    expect(state.cursorY).toBe(23);
  });

  it('should handle tabs', () => {
    parser.parse(Buffer.from('A\tB'));
    const state = parser.getState();
    
    expect(state.cells[0][0].char).toBe('A');
    expect(state.cells[0][8].char).toBe('B');
  });

  it('should handle backspace', () => {
    parser.parse(Buffer.from('ABC\bD'));
    const state = parser.getState();
    
    expect(state.cells[0][0].char).toBe('A');
    expect(state.cells[0][1].char).toBe('B');
    expect(state.cells[0][2].char).toBe('D');
  });
});
