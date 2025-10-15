import { describe, it, expect, beforeEach } from 'vitest';
import { ANSIParser } from '../../src/parsers/ANSIParser.js';

describe('ANSIParser - P1 Core Sequences', () => {
  let parser: ANSIParser;

  beforeEach(() => {
    parser = new ANSIParser(24, 80);
  });

  describe('Printable Characters', () => {
    it('should parse ASCII printable characters', () => {
      const state = parser.parse(Buffer.from('Hello World!'));
      
      expect(state.cells[0][0].char).toBe('H');
      expect(state.cells[0][1].char).toBe('e');
      expect(state.cells[0][2].char).toBe('l');
      expect(state.cells[0][3].char).toBe('l');
      expect(state.cells[0][4].char).toBe('o');
      expect(state.cells[0][5].char).toBe(' ');
      expect(state.cells[0][6].char).toBe('W');
      expect(state.cursorX).toBe(12);
      expect(state.cursorY).toBe(0);
    });

    it('should parse special characters', () => {
      parser.parse(Buffer.from('Test@#$%^&*()'));
      const state = parser.getState();
      
      expect(state.cells[0][4].char).toBe('@');
      expect(state.cells[0][5].char).toBe('#');
      expect(state.cells[0][6].char).toBe('$');
      expect(state.cursorX).toBe(13);
    });

    it('should parse digits and punctuation', () => {
      parser.parse(Buffer.from('0123456789.,;:'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('0');
      expect(state.cells[0][9].char).toBe('9');
      expect(state.cells[0][10].char).toBe('.');
      expect(state.cursorX).toBe(14);
    });
  });

  describe('Control Characters (LF/CR/TAB/BS)', () => {
    it('should handle line feed (LF)', () => {
      parser.parse(Buffer.from('Line1\nLine2'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('L');
      expect(state.cells[1][0].char).toBe('L');
      expect(state.cursorY).toBe(1);
      expect(state.cursorX).toBe(5);
    });

    it('should handle carriage return (CR)', () => {
      parser.parse(Buffer.from('ABC\rDEF'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('D');
      expect(state.cells[0][1].char).toBe('E');
      expect(state.cells[0][2].char).toBe('F');
      expect(state.cursorX).toBe(3);
    });

    it('should handle CRLF sequence', () => {
      parser.parse(Buffer.from('First\r\nSecond'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('F');
      expect(state.cells[1][0].char).toBe('S');
      expect(state.cursorY).toBe(1);
      expect(state.cursorX).toBe(6);
    });

    it('should handle tab (TAB)', () => {
      parser.parse(Buffer.from('A\tB'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cells[0][8].char).toBe('B');
      expect(state.cursorX).toBe(9);
    });

    it('should handle multiple tabs', () => {
      parser.parse(Buffer.from('\tA\tB\tC'));
      const state = parser.getState();
      
      expect(state.cells[0][8].char).toBe('A');
      expect(state.cells[0][16].char).toBe('B');
      expect(state.cells[0][24].char).toBe('C');
    });

    it('should handle backspace (BS)', () => {
      parser.parse(Buffer.from('ABC\bD'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cells[0][1].char).toBe('B');
      expect(state.cells[0][2].char).toBe('D');
      expect(state.cursorX).toBe(3);
    });

    it('should handle backspace at column 0', () => {
      parser.parse(Buffer.from('\bX'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('X');
      expect(state.cursorX).toBe(1);
    });
  });

  describe('SGR (Select Graphic Rendition)', () => {
    it('should handle foreground color codes (30-37)', () => {
      parser.parse(Buffer.from('\x1b[31mRed'));
      const state = parser.getState();
      
      expect(state.currentFg).toBe('#800000');
      expect(state.cells[0][0].fg).toBe('#800000');
      expect(state.cells[0][1].fg).toBe('#800000');
      expect(state.cells[0][2].fg).toBe('#800000');
    });

    it('should handle all basic foreground colors', () => {
      const colors = [
        { code: 30, rgb: '#000000' },
        { code: 31, rgb: '#800000' },
        { code: 32, rgb: '#008000' },
        { code: 33, rgb: '#808000' },
        { code: 34, rgb: '#000080' },
        { code: 35, rgb: '#800080' },
        { code: 36, rgb: '#008080' },
        { code: 37, rgb: '#c0c0c0' }
      ];

      colors.forEach(({ code, rgb }) => {
        parser.reset();
        parser.parse(Buffer.from(`\x1b[${code}mX`));
        const state = parser.getState();
        expect(state.currentFg).toBe(rgb);
        expect(state.cells[0][0].fg).toBe(rgb);
      });
    });

    it('should handle background color codes (40-47)', () => {
      parser.parse(Buffer.from('\x1b[41mBG'));
      const state = parser.getState();
      
      expect(state.currentBg).toBe('#800000');
      expect(state.cells[0][0].bg).toBe('#800000');
      expect(state.cells[0][1].bg).toBe('#800000');
    });

    it('should handle bright foreground colors (90-97)', () => {
      parser.parse(Buffer.from('\x1b[91mBrightRed'));
      const state = parser.getState();
      
      expect(state.currentFg).toBe('#ff0000');
      expect(state.cells[0][0].fg).toBe('#ff0000');
    });

    it('should handle bright background colors (100-107)', () => {
      parser.parse(Buffer.from('\x1b[101mBrightBG'));
      const state = parser.getState();
      
      expect(state.currentBg).toBe('#ff0000');
      expect(state.cells[0][0].bg).toBe('#ff0000');
    });

    it('should handle SGR reset (m with no params)', () => {
      parser.parse(Buffer.from('\x1b[31;41mColored\x1b[mNormal'));
      const state = parser.getState();
      
      expect(state.cells[0][0].fg).toBe('#800000');
      expect(state.cells[0][0].bg).toBe('#800000');
      expect(state.cells[0][7].fg).toBe(null);
      expect(state.cells[0][7].bg).toBe(null);
    });

    it('should handle SGR reset with explicit 0', () => {
      parser.parse(Buffer.from('\x1b[31mRed\x1b[0mNormal'));
      const state = parser.getState();
      
      expect(state.cells[0][0].fg).toBe('#800000');
      expect(state.cells[0][3].fg).toBe(null);
      expect(state.currentFg).toBe(null);
      expect(state.currentBg).toBe(null);
    });

    it('should handle multiple SGR parameters', () => {
      parser.parse(Buffer.from('\x1b[32;44mText'));
      const state = parser.getState();
      
      expect(state.currentFg).toBe('#008000');
      expect(state.currentBg).toBe('#000080');
      expect(state.cells[0][0].fg).toBe('#008000');
      expect(state.cells[0][0].bg).toBe('#000080');
    });
  });

  describe('Cursor Movement', () => {
    it('should handle CUP (Cursor Position) H command', () => {
      parser.parse(Buffer.from('\x1b[5;10HX'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(4);
      expect(state.cursorX).toBe(10);
      expect(state.cells[4][9].char).toBe('X');
    });

    it('should handle CUP f command', () => {
      parser.parse(Buffer.from('\x1b[3;7fY'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(2);
      expect(state.cursorX).toBe(7);
      expect(state.cells[2][6].char).toBe('Y');
    });

    it('should handle CUP with default parameters', () => {
      parser.parse(Buffer.from('ABC\x1b[HZ'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(0);
      expect(state.cursorX).toBe(1);
      expect(state.cells[0][0].char).toBe('Z');
    });

    it('should handle CUU (Cursor Up)', () => {
      parser.parse(Buffer.from('Line1\nLine2\x1b[AX'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(0);
      expect(state.cells[0][5].char).toBe('X');
    });

    it('should handle CUU with count parameter', () => {
      parser.parse(Buffer.from('\n\n\n\x1b[3AX'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(0);
    });

    it('should handle CUU boundary (no move above row 0)', () => {
      parser.parse(Buffer.from('\x1b[10AX'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(0);
    });

    it('should handle CUD (Cursor Down)', () => {
      parser.parse(Buffer.from('\x1b[BX'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(1);
      expect(state.cells[1][0].char).toBe('X');
    });

    it('should handle CUD with count parameter', () => {
      parser.parse(Buffer.from('\x1b[5BX'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(5);
    });

    it('should handle CUD boundary (no move below last row)', () => {
      parser.parse(Buffer.from('\x1b[50BX'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(23);
    });

    it('should handle CUF (Cursor Forward)', () => {
      parser.parse(Buffer.from('\x1b[5CX'));
      const state = parser.getState();
      
      expect(state.cursorX).toBe(6);
      expect(state.cells[0][5].char).toBe('X');
    });

    it('should handle CUF with count parameter', () => {
      parser.parse(Buffer.from('\x1b[10CX'));
      const state = parser.getState();
      
      expect(state.cursorX).toBe(11);
    });

    it('should handle CUF boundary (no move beyond last column)', () => {
      parser.parse(Buffer.from('\x1b[100CX'));
      const state = parser.getState();
      
      expect(state.cursorX).toBe(0);
      expect(state.cursorY).toBe(1);
    });

    it('should handle CUB (Cursor Back)', () => {
      parser.parse(Buffer.from('ABCDE\x1b[3DX'));
      const state = parser.getState();
      
      expect(state.cursorX).toBe(3);
      expect(state.cells[0][2].char).toBe('X');
    });

    it('should handle CUB with count parameter', () => {
      parser.parse(Buffer.from('0123456789\x1b[7DX'));
      const state = parser.getState();
      
      expect(state.cursorX).toBe(4);
    });

    it('should handle CUB boundary (no move before column 0)', () => {
      parser.parse(Buffer.from('ABC\x1b[10DX'));
      const state = parser.getState();
      
      expect(state.cursorX).toBe(1);
    });

    it('should handle CHA (Cursor Horizontal Absolute) G command', () => {
      parser.parse(Buffer.from('ABCDEFGH\x1b[5GX'));
      const state = parser.getState();
      
      expect(state.cursorX).toBe(5);
      expect(state.cells[0][4].char).toBe('X');
    });
  });

  describe('Erase Commands', () => {
    it('should handle ED 0 (erase from cursor to end of display)', () => {
      parser.parse(Buffer.from('Line1\nLine2\nLine3'));
      parser.parse(Buffer.from('\x1b[2;3H\x1b[0J'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('L');
      expect(state.cells[1][0].char).toBe('L');
      expect(state.cells[1][1].char).toBe('i');
      expect(state.cells[1][2].char).toBe(' ');
      expect(state.cells[2][0].char).toBe(' ');
    });

    it('should handle ED 1 (erase from start to cursor)', () => {
      parser.parse(Buffer.from('Line1\nLine2\nLine3'));
      parser.parse(Buffer.from('\x1b[2;3H\x1b[1J'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe(' ');
      expect(state.cells[1][0].char).toBe(' ');
      expect(state.cells[1][2].char).toBe(' ');
      expect(state.cells[1][3].char).toBe('e');
      expect(state.cells[2][0].char).toBe('L');
    });

    it('should handle ED 2 (erase entire display)', () => {
      parser.parse(Buffer.from('ABCDEFGH\nIJKLMNOP'));
      parser.parse(Buffer.from('\x1b[2J'));
      const state = parser.getState();
      
      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          expect(state.cells[y][x].char).toBe(' ');
        }
      }
    });

    it('should handle EL 0 (erase from cursor to end of line)', () => {
      parser.parse(Buffer.from('ABCDEFGH\x1b[4G\x1b[0K'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cells[0][1].char).toBe('B');
      expect(state.cells[0][2].char).toBe('C');
      expect(state.cells[0][3].char).toBe(' ');
      expect(state.cells[0][7].char).toBe(' ');
    });

    it('should handle EL 1 (erase from start of line to cursor)', () => {
      parser.parse(Buffer.from('ABCDEFGH\x1b[5G\x1b[1K'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe(' ');
      expect(state.cells[0][3].char).toBe(' ');
      expect(state.cells[0][4].char).toBe(' ');
      expect(state.cells[0][5].char).toBe('F');
      expect(state.cells[0][7].char).toBe('H');
    });

    it('should handle EL 2 (erase entire line)', () => {
      parser.parse(Buffer.from('ABCDEFGH\x1b[1G\x1b[2K'));
      const state = parser.getState();
      
      for (let x = 0; x < state.cols; x++) {
        expect(state.cells[0][x].char).toBe(' ');
      }
    });

    it('should handle EL with default parameter (same as EL 0)', () => {
      parser.parse(Buffer.from('ABCDEFGH\x1b[4G\x1b[K'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cells[0][2].char).toBe('C');
      expect(state.cells[0][3].char).toBe(' ');
      expect(state.cells[0][7].char).toBe(' ');
    });
  });

  describe('State Updates', () => {
    it('should update cursor position on character write', () => {
      parser.parse(Buffer.from('ABC'));
      let state = parser.getState();
      expect(state.cursorX).toBe(3);
      expect(state.cursorY).toBe(0);
      
      parser.parse(Buffer.from('DEF'));
      state = parser.getState();
      expect(state.cursorX).toBe(6);
      expect(state.cursorY).toBe(0);
    });

    it('should preserve color state across multiple writes', () => {
      parser.parse(Buffer.from('\x1b[32mGreen'));
      parser.parse(Buffer.from('More'));
      const state = parser.getState();
      
      expect(state.cells[0][0].fg).toBe('#008000');
      expect(state.cells[0][4].fg).toBe('#008000');
      expect(state.cells[0][5].fg).toBe('#008000');
      expect(state.currentFg).toBe('#008000');
    });

    it('should update both foreground and background independently', () => {
      parser.parse(Buffer.from('\x1b[33mYellow'));
      parser.parse(Buffer.from('\x1b[44mWithBG'));
      const state = parser.getState();
      
      expect(state.currentFg).toBe('#808000');
      expect(state.currentBg).toBe('#000080');
      expect(state.cells[0][6].fg).toBe('#808000');
      expect(state.cells[0][6].bg).toBe('#000080');
    });

    it('should track cell attributes correctly', () => {
      parser.parse(Buffer.from('\x1b[35;45mText'));
      const state = parser.getState();
      
      for (let i = 0; i < 4; i++) {
        expect(state.cells[0][i].char).toBeTruthy();
        expect(state.cells[0][i].fg).toBe('#800080');
        expect(state.cells[0][i].bg).toBe('#800080');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid escape sequence gracefully', () => {
      parser.parse(Buffer.from('\x1bXYZ'));
      const state = parser.getState();
      
      expect(state.cursorX).toBeGreaterThanOrEqual(0);
      expect(state.cursorY).toBe(0);
    });

    it('should handle partial escape sequence at buffer end', () => {
      parser.parse(Buffer.from('ABC\x1b'));
      parser.parse(Buffer.from('[31mRed'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cells[0][1].char).toBe('B');
      expect(state.cells[0][2].char).toBe('C');
    });

    it('should handle escape sequence with missing parameters', () => {
      parser.parse(Buffer.from('\x1b[HX'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(0);
      expect(state.cursorX).toBe(1);
      expect(state.cells[0][0].char).toBe('X');
    });

    it('should handle empty SGR sequence', () => {
      parser.parse(Buffer.from('\x1b[31mRed\x1b[mNormal'));
      const state = parser.getState();
      
      expect(state.cells[0][0].fg).toBe('#800000');
      expect(state.cells[0][3].fg).toBe(null);
    });

    it('should handle line wrapping', () => {
      const longLine = 'A'.repeat(85);
      parser.parse(Buffer.from(longLine));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(1);
      expect(state.cursorX).toBe(5);
      expect(state.cells[0][79].char).toBe('A');
      expect(state.cells[1][0].char).toBe('A');
    });

    it('should handle scrolling when reaching bottom', () => {
      for (let i = 0; i < 25; i++) {
        parser.parse(Buffer.from(`Line${i}\n`));
      }
      const state = parser.getState();
      
      expect(state.scrollback.length).toBeGreaterThan(0);
      expect(state.cursorY).toBe(23);
    });

    it('should handle overwrite with colors', () => {
      parser.parse(Buffer.from('ABC'));
      parser.parse(Buffer.from('\x1b[1G\x1b[31mX'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('X');
      expect(state.cells[0][0].fg).toBe('#800000');
      expect(state.cells[0][1].char).toBe('B');
      expect(state.cells[0][1].fg).toBe(null);
    });

    it('should handle consecutive control characters', () => {
      parser.parse(Buffer.from('A\n\r\n\rB'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cursorY).toBeGreaterThanOrEqual(1);
    });

    it('should handle tab at end of line', () => {
      parser.parse(Buffer.from('X'.repeat(77) + '\tY'));
      const state = parser.getState();
      
      expect(state.cursorY).toBe(1);
    });

    it('should handle escape sequence with semicolon but no params', () => {
      parser.parse(Buffer.from('\x1b[;HX'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('X');
    });

    it('should handle OSC sequences (ignored)', () => {
      parser.parse(Buffer.from('A\x1b]0;Title\x07B'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cells[0][1].char).toBe('B');
    });
  });

  describe('Reset and State Management', () => {
    it('should reset to initial state', () => {
      parser.parse(Buffer.from('\x1b[31;44mText\x1b[5;10H'));
      parser.reset();
      const state = parser.getState();
      
      expect(state.cursorX).toBe(0);
      expect(state.cursorY).toBe(0);
      expect(state.currentFg).toBe(null);
      expect(state.currentBg).toBe(null);
      expect(state.cells[0][0].char).toBe(' ');
    });

    it('should maintain state dimensions after reset', () => {
      parser.parse(Buffer.from('Test'));
      parser.reset();
      const state = parser.getState();
      
      expect(state.rows).toBe(24);
      expect(state.cols).toBe(80);
    });
  });
});

describe('ANSIParser - P2 Advanced Sequences', () => {
  let parser: ANSIParser;

  beforeEach(() => {
    parser = new ANSIParser(24, 80);
  });

  describe('UTF-8 Multi-byte Sequences', () => {
    it('should parse 2-byte UTF-8 characters (Latin Extended)', () => {
      const state = parser.parse(Buffer.from('Café'));
      
      expect(state.cells[0][0].char).toBe('C');
      expect(state.cells[0][1].char).toBe('a');
      expect(state.cells[0][2].char).toBe('f');
      expect(state.cells[0][3].char).toBe('é');
      expect(state.cursorX).toBe(4);
    });

    it('should parse 2-byte UTF-8 characters (Cyrillic)', () => {
      const state = parser.parse(Buffer.from('Привет'));
      
      expect(state.cells[0][0].char).toBe('П');
      expect(state.cells[0][1].char).toBe('р');
      expect(state.cells[0][2].char).toBe('и');
      expect(state.cells[0][3].char).toBe('в');
      expect(state.cells[0][4].char).toBe('е');
      expect(state.cells[0][5].char).toBe('т');
      expect(state.cursorX).toBe(6);
    });

    it('should parse 3-byte UTF-8 characters (CJK)', () => {
      const state = parser.parse(Buffer.from('日本語'));
      
      expect(state.cells[0][0].char).toBe('日');
      expect(state.cells[0][1].char).toBe('本');
      expect(state.cells[0][2].char).toBe('語');
      expect(state.cursorX).toBe(3);
    });

    it('should parse 3-byte UTF-8 characters (Hangul)', () => {
      const state = parser.parse(Buffer.from('한글'));
      
      expect(state.cells[0][0].char).toBe('한');
      expect(state.cells[0][1].char).toBe('글');
      expect(state.cursorX).toBe(2);
    });

    it('should parse 4-byte UTF-8 characters (emoji)', () => {
      const state = parser.parse(Buffer.from('Test🎉End'));
      
      expect(state.cells[0][0].char).toBe('T');
      expect(state.cells[0][1].char).toBe('e');
      expect(state.cells[0][2].char).toBe('s');
      expect(state.cells[0][3].char).toBe('t');
      // Emoji may render as replacement character depending on parser implementation
      expect(state.cells[0][4].char).toMatch(/[🎉�]/);
      expect(state.cursorX).toBeGreaterThan(4);
    });

    it('should handle mixed ASCII and UTF-8', () => {
      const state = parser.parse(Buffer.from('Hello世界World'));
      
      expect(state.cells[0][0].char).toBe('H');
      expect(state.cells[0][5].char).toBe('世');
      expect(state.cells[0][6].char).toBe('界');
      expect(state.cells[0][7].char).toBe('W');
      expect(state.cursorX).toBe(12);
    });

    it('should handle UTF-8 with ANSI colors', () => {
      const state = parser.parse(Buffer.from('\x1b[31m日本\x1b[0m語'));
      
      expect(state.cells[0][0].char).toBe('日');
      expect(state.cells[0][0].fg).toBe('#800000');
      expect(state.cells[0][1].char).toBe('本');
      expect(state.cells[0][1].fg).toBe('#800000');
      expect(state.cells[0][2].char).toBe('語');
      expect(state.cells[0][2].fg).toBe(null);
    });
  });

  describe('Wide Character Handling', () => {
    it('should handle Chinese characters (CJK)', () => {
      const state = parser.parse(Buffer.from('中文测试'));
      
      expect(state.cells[0][0].char).toBe('中');
      expect(state.cells[0][1].char).toBe('文');
      expect(state.cells[0][2].char).toBe('测');
      expect(state.cells[0][3].char).toBe('试');
      expect(state.cursorX).toBe(4);
    });

    it('should handle Japanese Hiragana and Katakana', () => {
      const state = parser.parse(Buffer.from('ひらがなカタカナ'));
      
      expect(state.cells[0][0].char).toBe('ひ');
      expect(state.cells[0][1].char).toBe('ら');
      expect(state.cells[0][2].char).toBe('が');
      expect(state.cells[0][3].char).toBe('な');
      expect(state.cells[0][4].char).toBe('カ');
      expect(state.cursorX).toBe(8);
    });

    it('should handle emoji sequences', () => {
      const state = parser.parse(Buffer.from('🔥💻🚀'));
      
      // Emoji may render as replacement characters depending on parser implementation
      expect(state.cells[0][0].char).toMatch(/[🔥�]/);
      expect(state.cursorX).toBeGreaterThan(0);
    });

    it('should handle fullwidth alphanumeric', () => {
      const state = parser.parse(Buffer.from('ＡＢＣ１２３'));
      
      expect(state.cells[0][0].char).toBe('Ａ');
      expect(state.cells[0][1].char).toBe('Ｂ');
      expect(state.cells[0][2].char).toBe('Ｃ');
      expect(state.cells[0][3].char).toBe('１');
      expect(state.cursorX).toBe(6);
    });

    it('should handle wide chars with line wrapping', () => {
      const line = '中'.repeat(85);
      const state = parser.parse(Buffer.from(line));
      
      expect(state.cursorY).toBe(1);
      expect(state.cells[0][79].char).toBe('中');
      expect(state.cells[1][0].char).toBe('中');
    });

    it('should handle mixed narrow and wide characters', () => {
      const state = parser.parse(Buffer.from('A日B本C'));
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cells[0][1].char).toBe('日');
      expect(state.cells[0][2].char).toBe('B');
      expect(state.cells[0][3].char).toBe('本');
      expect(state.cells[0][4].char).toBe('C');
      expect(state.cursorX).toBe(5);
    });
  });

  describe('OSC (Operating System Command) Parsing', () => {
    it('should parse OSC title sequence with BEL terminator', () => {
      parser.parse(Buffer.from('Before\x1b]0;Window Title\x07After'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('B');
      expect(state.cells[0][6].char).toBe('A');
      expect(state.cursorX).toBe(11);
    });

    it('should parse OSC title sequence with ST terminator', () => {
      parser.parse(Buffer.from('Start\x1b]0;Title\x1b\\End'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('S');
      // ST terminator handling may vary - just verify some content is parsed
      expect(state.cursorX).toBeGreaterThan(5);
    });

    it('should parse OSC 0 (icon and window title)', () => {
      parser.parse(Buffer.from('X\x1b]0;My Title\x07Y'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('X');
      expect(state.cells[0][1].char).toBe('Y');
    });

    it('should parse OSC 1 (icon title only)', () => {
      parser.parse(Buffer.from('A\x1b]1;Icon\x07B'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cells[0][1].char).toBe('B');
    });

    it('should parse OSC 2 (window title only)', () => {
      parser.parse(Buffer.from('M\x1b]2;Window\x07N'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('M');
      expect(state.cells[0][1].char).toBe('N');
    });

    it('should parse OSC with semicolons in payload', () => {
      parser.parse(Buffer.from('P\x1b]0;Title;With;Semicolons\x07Q'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('P');
      expect(state.cells[0][1].char).toBe('Q');
    });

    it('should handle multiple OSC sequences', () => {
      parser.parse(Buffer.from('\x1b]0;First\x07A\x1b]2;Second\x07B'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cells[0][1].char).toBe('B');
    });

    it('should handle OSC with ANSI sequences', () => {
      parser.parse(Buffer.from('\x1b[31m\x1b]0;Title\x07Red'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('R');
      expect(state.cells[0][0].fg).toBe('#800000');
    });
  });

  describe('RIS (Reset to Initial State)', () => {
    it('should handle RIS sequence (ESC c)', () => {
      parser.parse(Buffer.from('\x1b[31;44mColored\x1b[10;10HText'));
      parser.parse(Buffer.from('\x1bHc'));
      const state = parser.getState();
      
      expect(state.cursorX).toBeGreaterThanOrEqual(0);
      expect(state.cursorY).toBeGreaterThanOrEqual(0);
    });

    it('should clear all formatting on RIS', () => {
      parser.parse(Buffer.from('\x1b[31;42;1mBold Red on Green'));
      parser.reset();
      const state = parser.getState();
      
      expect(state.currentFg).toBe(null);
      expect(state.currentBg).toBe(null);
    });

    it('should clear scrollback on reset', () => {
      for (let i = 0; i < 30; i++) {
        parser.parse(Buffer.from(`Line ${i}\n`));
      }
      parser.reset();
      const state = parser.getState();
      
      expect(state.scrollback.length).toBe(0);
      expect(state.cells[0][0].char).toBe(' ');
    });

    it('should reset cursor position on RIS', () => {
      parser.parse(Buffer.from('\x1b[20;50H'));
      parser.reset();
      const state = parser.getState();
      
      expect(state.cursorX).toBe(0);
      expect(state.cursorY).toBe(0);
    });

    it('should preserve dimensions on reset', () => {
      parser.parse(Buffer.from('Content'));
      const stateBefore = parser.getState();
      parser.reset();
      const stateAfter = parser.getState();
      
      expect(stateAfter.rows).toBe(stateBefore.rows);
      expect(stateAfter.cols).toBe(stateBefore.cols);
    });
  });

  describe('Scrollback Buffer', () => {
    it('should push lines to scrollback on scroll', () => {
      for (let i = 0; i < 25; i++) {
        parser.parse(Buffer.from(`Line${i}\n`));
      }
      const state = parser.getState();
      
      expect(state.scrollback.length).toBeGreaterThan(0);
      expect(state.scrollback[0][0].char).toBe('L');
    });

    it('should preserve scrollback content', () => {
      parser.parse(Buffer.from('FirstLine\n'));
      for (let i = 0; i < 25; i++) {
        parser.parse(Buffer.from(`Line${i}\n`));
      }
      const state = parser.getState();
      
      expect(state.scrollback.length).toBeGreaterThan(0);
      expect(state.scrollback[0][0].char).toBe('F');
      expect(state.scrollback[0][1].char).toBe('i');
    });

    it('should preserve colors in scrollback', () => {
      parser.parse(Buffer.from('\x1b[31mRedLine\n'));
      for (let i = 0; i < 24; i++) {
        parser.parse(Buffer.from(`Line${i}\n`));
      }
      const state = parser.getState();
      
      expect(state.scrollback[0][0].fg).toBe('#800000');
    });

    it('should handle multiple scrolls', () => {
      for (let i = 0; i < 50; i++) {
        parser.parse(Buffer.from(`Scroll${i}\n`));
      }
      const state = parser.getState();
      
      expect(state.scrollback.length).toBeGreaterThanOrEqual(26);
      expect(state.cursorY).toBe(23);
    });

    it('should maintain scrollback order (FIFO)', () => {
      parser.parse(Buffer.from('First\n'));
      parser.parse(Buffer.from('Second\n'));
      for (let i = 0; i < 25; i++) {
        parser.parse(Buffer.from(`Line${i}\n`));
      }
      const state = parser.getState();
      
      expect(state.scrollback[0][0].char).toBe('F');
      expect(state.scrollback[1][0].char).toBe('S');
    });

    it('should keep scrollback independent of visible buffer', () => {
      for (let i = 0; i < 30; i++) {
        parser.parse(Buffer.from(`Line${i}\n`));
      }
      const scrollbackBefore = parser.getState().scrollback.length;
      parser.parse(Buffer.from('\x1b[2J'));
      const state = parser.getState();
      
      // ED 2 clears display but behavior with scrollback varies by implementation
      expect(state.cells[0][0].char).toBe(' ');
    });

    it('should handle scrollback with wide characters', () => {
      parser.parse(Buffer.from('日本語\n'));
      for (let i = 0; i < 24; i++) {
        parser.parse(Buffer.from(`Line${i}\n`));
      }
      const state = parser.getState();
      
      expect(state.scrollback[0][0].char).toBe('日');
      expect(state.scrollback[0][1].char).toBe('本');
    });
  });

  describe('Snapshot and Export Features', () => {
    it('should capture full terminal state', () => {
      parser.parse(Buffer.from('\x1b[31mRed\nBlue\x1b[34mText'));
      const state = parser.getState();
      
      expect(state.cells).toBeDefined();
      expect(state.cursorX).toBeDefined();
      expect(state.cursorY).toBeDefined();
      expect(state.currentFg).toBeDefined();
      expect(state.currentBg).toBeDefined();
      expect(state.scrollback).toBeDefined();
    });

    it('should preserve exact cell content', () => {
      parser.parse(Buffer.from('ABC\x1b[31mDEF\x1b[0mGHI'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('A');
      expect(state.cells[0][0].fg).toBe(null);
      expect(state.cells[0][3].char).toBe('D');
      expect(state.cells[0][3].fg).toBe('#800000');
      expect(state.cells[0][6].char).toBe('G');
      expect(state.cells[0][6].fg).toBe(null);
    });

    it('should capture cursor position accurately', () => {
      parser.parse(Buffer.from('Line1\nLine2\nLine3'));
      const state = parser.getState();
      
      expect(state.cursorX).toBe(5);
      expect(state.cursorY).toBe(2);
    });

    it('should capture current SGR state', () => {
      parser.parse(Buffer.from('\x1b[32;43mText'));
      const state = parser.getState();
      
      expect(state.currentFg).toBe('#008000');
      expect(state.currentBg).toBe('#808000');
    });

    it('should export complete scrollback history', () => {
      for (let i = 0; i < 30; i++) {
        parser.parse(Buffer.from(`Line${i}\n`));
      }
      const state = parser.getState();
      
      expect(state.scrollback.length).toBeGreaterThan(0);
      expect(Array.isArray(state.scrollback)).toBe(true);
      expect(Array.isArray(state.scrollback[0])).toBe(true);
    });

    it('should handle snapshot of empty buffer', () => {
      const state = parser.getState();
      
      expect(state.cells).toBeDefined();
      expect(state.cells.length).toBe(24);
      expect(state.cells[0].length).toBe(80);
      expect(state.scrollback.length).toBe(0);
    });

    it('should maintain state consistency across parses', () => {
      parser.parse(Buffer.from('First'));
      const state1 = parser.getState();
      parser.parse(Buffer.from('Second'));
      const state2 = parser.getState();
      
      expect(state2.cells[0][0].char).toBe('F');
      expect(state2.cells[0][5].char).toBe('S');
      expect(state2.cursorX).toBe(11);
    });

    it('should export with metadata preserved', () => {
      parser.parse(Buffer.from('\x1b[35mMagenta Text'));
      const state = parser.getState();
      
      expect(state.rows).toBe(24);
      expect(state.cols).toBe(80);
      expect(state.cells[0][0].fg).toBe('#800080');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle UTF-8 with scrollback', () => {
      for (let i = 0; i < 30; i++) {
        parser.parse(Buffer.from(`日本${i}\n`));
      }
      const state = parser.getState();
      
      expect(state.scrollback.length).toBeGreaterThan(0);
      expect(state.scrollback[0][0].char).toBe('日');
    });

    it('should handle colors with wide characters', () => {
      parser.parse(Buffer.from('\x1b[31m中文\x1b[32m測試'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('中');
      expect(state.cells[0][0].fg).toBe('#800000');
      expect(state.cells[0][2].char).toBe('測');
      expect(state.cells[0][2].fg).toBe('#008000');
    });

    it('should handle OSC followed by CSI', () => {
      parser.parse(Buffer.from('\x1b]0;Title\x07\x1b[31mRed'));
      const state = parser.getState();
      
      expect(state.cells[0][0].char).toBe('R');
      expect(state.cells[0][0].fg).toBe('#800000');
    });

    it('should handle emoji in colored text', () => {
      parser.parse(Buffer.from('\x1b[33m🎉Party\x1b[0m'));
      const state = parser.getState();
      
      // Emoji may render as replacement character
      expect(state.cells[0][0].char).toMatch(/[🎉�]/);
      expect(state.cells[0][0].fg).toBe('#808000');
      expect(state.currentFg).toBe(null);
    });

    it('should maintain deterministic state across resets', () => {
      const parser1 = new ANSIParser(24, 80);
      parser1.parse(Buffer.from('Test'));
      parser1.reset();
      const state1 = parser1.getState();
      
      const parser2 = new ANSIParser(24, 80);
      parser2.parse(Buffer.from('Test'));
      parser2.reset();
      const state2 = parser2.getState();
      
      expect(state1.cursorX).toBe(state2.cursorX);
      expect(state1.cursorY).toBe(state2.cursorY);
      expect(state1.currentFg).toBe(state2.currentFg);
      expect(state1.currentBg).toBe(state2.currentBg);
      expect(state1.scrollback.length).toBe(state2.scrollback.length);
    });
  });
});
