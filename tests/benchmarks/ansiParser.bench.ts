import { describe, bench } from 'vitest';
import { ANSIParser } from '../../src/parsers/ANSIParser.js';

describe('ANSIParser Performance', () => {
  const plainText = Buffer.from('Hello World! '.repeat(100));
  const textWithEscapes = Buffer.from('\x1B[1mBold\x1B[0m Normal \x1B[31mRed\x1B[0m '.repeat(50));
  const mixedContent = Buffer.from(`
    \x1B[1;32mSuccess:\x1B[0m Operation completed
    ${'-'.repeat(80)}
    ${Array(20).fill('Line of text with some content').join('\n')}
    \x1B[33mWarning:\x1B[0m Some warning message
    \x1B[31mError:\x1B[0m Something failed
  `);
  const heavyEscapes = Buffer.from('\x1B[1m\x1B[31m\x1B[44mText\x1B[0m'.repeat(200));

  bench(`plain text (${plainText.length} chars)`, () => {
    const parser = new ANSIParser(24, 80);
    parser.parse(plainText);
  });

  bench(`text with SGR codes (${textWithEscapes.length} chars)`, () => {
    const parser = new ANSIParser(24, 80);
    parser.parse(textWithEscapes);
  });

  bench('mixed content with newlines', () => {
    const parser = new ANSIParser(24, 80);
    parser.parse(mixedContent);
  });

  bench(`heavy escape sequences (${heavyEscapes.length} chars)`, () => {
    const parser = new ANSIParser(24, 80);
    parser.parse(heavyEscapes);
  });

  bench('reused parser instance', () => {
    const parser = new ANSIParser(24, 80);
    parser.parse(textWithEscapes);
    parser.reset();
    parser.parse(plainText);
  });

  bench('cursor movements', () => {
    const parser = new ANSIParser(24, 80);
    const cursorText = Buffer.from(
      '\x1B[H\x1B[2J\x1B[10;20HText\x1B[5A\x1B[3B\x1B[2C\x1B[1D'.repeat(20),
    );
    parser.parse(cursorText);
  });

  bench('UTF-8 characters', () => {
    const parser = new ANSIParser(24, 80);
    const utf8Text = Buffer.from('Hello世界Test日本語café'.repeat(50));
    parser.parse(utf8Text);
  });

  bench('256-color sequences', () => {
    const parser = new ANSIParser(24, 80);
    const colorText = Buffer.from('\x1B[38;5;196mRed\x1B[38;5;21mBlue\x1B[0m'.repeat(100));
    parser.parse(colorText);
  });

  bench('truecolor sequences', () => {
    const parser = new ANSIParser(24, 80);
    const truecolorText = Buffer.from(
      '\x1B[38;2;255;128;64mOrange\x1B[38;2;64;128;255mBlue\x1B[0m'.repeat(100),
    );
    parser.parse(truecolorText);
  });

  bench('DEC mode sequences', () => {
    const parser = new ANSIParser(24, 80);
    const modeText = Buffer.from('\x1B[?7h\x1B[?25l\x1B[?1049hText\x1B[?1049l\x1B[?25h'.repeat(50));
    parser.parse(modeText);
  });

  bench('mixed P3 features', () => {
    const parser = new ANSIParser(24, 80);
    const mixedText = Buffer.from(
      '\x1B[38;2;200;100;50m日本\x1B[?7h\x1B[48;5;21mTest\x1B[0m'.repeat(50),
    );
    parser.parse(mixedText);
  });

  bench('scrollback with colors', () => {
    const parser = new ANSIParser(24, 80);
    for (let i = 0; i < 30; i++) {
      parser.parse(Buffer.from(`\x1B[38;5;${i % 256}mLine ${i}\n`));
    }
  });

  bench('resize scenario', () => {
    const parser1 = new ANSIParser(24, 80);
    parser1.parse(Buffer.from('Test content'));

    const parser2 = new ANSIParser(30, 100);
    parser2.parse(Buffer.from('Test content'));
  });
});
