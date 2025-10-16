import { Writable } from 'stream';
import { createWriteStream, WriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { Pipe } from '../types/stream.js';
import { Kernel } from '../kernel/Kernel.js';

export interface TTYRendererOptions {
  target?: 'stdout' | string;
  rawMode?: boolean;
  stripAnsi?: boolean;
}

export class TTYRenderer {
  public readonly inputPipe: Pipe;
  private fileStream?: WriteStream;
  private options: Required<TTYRendererOptions>;
  private isTTY: boolean;

  constructor(
    protected kernel: Kernel,
    options?: TTYRendererOptions
  ) {
    this.options = {
      target: options?.target ?? 'stdout',
      rawMode: options?.rawMode ?? true,
      stripAnsi: options?.stripAnsi ?? false
    };

    this.isTTY = this.options.target === 'stdout' && process.stdout.isTTY;

    const sink = new Writable({
      objectMode: true,
      write: (chunk, _enc, cb) => {
        this.writeChunk(chunk);
        cb();
      }
    });

    this.inputPipe = sink as unknown as Pipe;
  }

  private writeChunk(chunk: any): void {
    let data: Buffer;

    if (typeof chunk === 'string') {
      data = Buffer.from(chunk);
    } else if (Buffer.isBuffer(chunk)) {
      data = chunk;
    } else {
      data = Buffer.from(JSON.stringify(chunk));
    }

    if (this.options.stripAnsi) {
      data = this.stripAnsiCodes(data);
    }

    if (this.options.target === 'stdout') {
      process.stdout.write(data);
    } else if (this.fileStream) {
      this.fileStream.write(data);
    }
  }

  private stripAnsiCodes(buffer: Buffer): Buffer {
    const str = buffer.toString();
    const stripped = str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    return Buffer.from(stripped);
  }

  async start(): Promise<void> {
    if (this.options.target !== 'stdout') {
      const dir = dirname(this.options.target);
      await mkdir(dir, { recursive: true });

      this.fileStream = createWriteStream(this.options.target, {
        flags: 'a',
        encoding: 'utf8'
      });

      this.fileStream.on('error', (err: Error) => {
        console.error(`[TTYRenderer] Error writing to ${this.options.target}:`, err);
      });
    }

    if (this.options.rawMode && this.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
  }

  async stop(): Promise<void> {
    if (this.options.rawMode && this.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }

    if (this.fileStream) {
      return new Promise((resolve, reject) => {
        this.fileStream!.once('finish', resolve);
        this.fileStream!.once('error', reject);
        this.fileStream!.end();
      });
    }
  }

  destroy(): void {
    if (this.fileStream) {
      this.fileStream.destroy();
    }
  }
}
