import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { XtermTTYRenderer } from '../../src/modules/xterm-tty-renderer.js';

describe('XtermTTYRenderer', () => {
  let out: PassThrough;
  let renderer: XtermTTYRenderer;

  beforeEach(() => {
    out = new PassThrough();
  });

  afterEach(() => {
    renderer?.stop();
  });

  it('should forward raw ANSI to writer', () => {
    renderer = new XtermTTYRenderer({ writer: out });
    renderer.start();

    const data = Buffer.from('Hello\x1b[31m Red \x1b[0m World\n');
    (renderer.inputPipe as any).write(data);

    const result = out.read()?.toString('utf8') ?? '';
    expect(result).toContain('Hello');
    expect(result).toContain('World');
    // ANSI bytes should pass through (we spot-check ESC '[' sequence exists)
    expect(result).toContain('\u001b[');
  });

  it('should emit alt buffer enter/leave when enabled and start/stop called', () => {
    // Simulate a TTY-like writer by monkey-patching isTTY
    (out as any).isTTY = true;

    renderer = new XtermTTYRenderer({ writer: out, altBuffer: true });
    renderer.start();
    renderer.stop();

    const output = Buffer.concat(out.readableBuffer as any).toString('utf8');
    expect(output).toContain('\u001b[?1049h'); // enter alt buffer
    expect(output).toContain('\u001b[?1049l'); // leave alt buffer
  });
});
