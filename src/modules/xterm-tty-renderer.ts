import { Writable } from 'node:stream';
import type { Pipe } from '../types/stream.js';

interface TTYRendererOptions {
  writer?: NodeJS.WritableStream;
  altBuffer?: boolean; // use alternate screen buffer
}

/**
 * XtermTTYRenderer
 *
 * Minimal terminal renderer that writes raw ANSI bytes to a TTY (default: process.stdout).
 * - Output-only module (inputPipe only)
 * - Optional alternate screen buffer management
 * - Testable: accepts custom writer
 */
export class XtermTTYRenderer {
  public readonly inputPipe: Pipe;
  private writer: NodeJS.WritableStream;
  private altBuffer: boolean;
  private started = false;

  constructor(options: TTYRendererOptions = {}) {
    this.writer = options.writer ?? process.stdout;
    this.altBuffer = Boolean(options.altBuffer);

    // Writable that forwards chunks to the terminal
    const sink = new Writable({
      write: (chunk: any, _enc, cb) => {
        try {
          if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
            this.writer.write(chunk);
          } else {
            // If upstream sends objects (e.g., from parser), stringify minimally
            const s = typeof chunk?.raw === 'string' ? chunk.raw : String(chunk);
            this.writer.write(s);
          }
          cb();
        } catch (err) {
          cb(err as Error);
        }
      },
      objectMode: true,
    });

    this.inputPipe = sink as unknown as Pipe;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    if (this.altBuffer && (this.writer as any).isTTY) {
      // Enter alternate screen buffer
      this.writer.write('\u001b[?1049h');
    }
  }

  stop(): void {
    if (!this.started) return;
    if (this.altBuffer && (this.writer as any).isTTY) {
      // Leave alternate screen buffer
      this.writer.write('\u001b[?1049l');
    }
    this.started = false;
  }
}
