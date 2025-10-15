import { describe, bench } from 'vitest';
import { AnsiParser } from '../../src/transforms/AnsiParser';

describe('AnsiParser Performance', () => {
  const plainText = 'Hello World! '.repeat(100);
  const textWithEscapes = '\x1B[1mBold\x1B[0m Normal \x1B[31mRed\x1B[0m '.repeat(50);
  const mixedContent = `
    \x1B[1;32mSuccess:\x1B[0m Operation completed
    ${'-'.repeat(80)}
    ${Array(20).fill('Line of text with some content').join('\n')}
    \x1B[33mWarning:\x1B[0m Some warning message
    \x1B[31mError:\x1B[0m Something failed
  `;
  const heavyEscapes = '\x1B[1m\x1B[31m\x1B[44mText\x1B[0m'.repeat(200);

  bench(`plain text (${plainText.length} chars)`, () => {
    const parser = new AnsiParser();
    parser.parse(plainText);
  });

  bench(`text with SGR codes (${textWithEscapes.length} chars)`, () => {
    const parser = new AnsiParser();
    parser.parse(textWithEscapes);
  });

  bench('mixed content with newlines', () => {
    const parser = new AnsiParser();
    parser.parse(mixedContent);
  });

  bench(`heavy escape sequences (${heavyEscapes.length} chars)`, () => {
    const parser = new AnsiParser();
    parser.parse(heavyEscapes);
  });

  bench('reused parser instance', () => {
    const parser = new AnsiParser();
    parser.parse(textWithEscapes);
    parser.reset();
    parser.parse(plainText);
  });

  bench('cursor movements', () => {
    const parser = new AnsiParser();
    const cursorText = '\x1B[H\x1B[2J\x1B[10;20HText\x1B[5A\x1B[3B\x1B[2C\x1B[1D'.repeat(20);
    parser.parse(cursorText);
  });
});
