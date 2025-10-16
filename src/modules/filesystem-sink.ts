import { Writable } from 'stream';
import { createWriteStream, WriteStream, fsync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { Kernel } from '../kernel/Kernel.js';
import type { Pipe } from '../types/stream.js';
import { debug } from '../debug/api.js';

export interface FilesystemSinkOptions {
  path: string;
  mode?: 'append' | 'truncate';
  encoding?: BufferEncoding;
  highWaterMark?: number;
  fsync?: 'always' | 'never' | 'auto';
}

export class FilesystemSink {
  private _inputPipe: Pipe;
  private fileStream?: WriteStream;
  private options: Required<FilesystemSinkOptions>;
  private writeCount = 0;
  private byteCount = 0;

  constructor(
    protected kernel: Kernel,
    options: FilesystemSinkOptions
  ) {
    this.options = {
      path: options.path,
      mode: options.mode ?? 'append',
      encoding: options.encoding ?? 'utf8',
      highWaterMark: options.highWaterMark ?? 16384,
      fsync: options.fsync ?? 'auto'
    };

    this._inputPipe = kernel.createPipe();
  }

  get inputPipe(): Pipe {
    return this._inputPipe;
  }

  async start(): Promise<void> {
    debug.emit('filesystem-sink', 'start', { path: this.options.path, mode: this.options.mode }, 'info');

    // Ensure directory exists
    const dir = dirname(this.options.path);
    await mkdir(dir, { recursive: true });

    // Create write stream
    const flags = this.options.mode === 'append' ? 'a' : 'w';
    this.fileStream = createWriteStream(this.options.path, {
      flags,
      encoding: this.options.encoding,
      highWaterMark: this.options.highWaterMark
    });

    // Pipe input to file - just pipe directly, don't manually handle data
    this._inputPipe.pipe(this.fileStream);

    // Track writes for statistics
    this._inputPipe.on('data', (chunk) => {
      this.writeCount++;
      this.byteCount += chunk.length;
      
      debug.emit('filesystem-sink', 'write', {
        path: this.options.path,
        bytes: chunk.length,
        totalWrites: this.writeCount,
        totalBytes: this.byteCount
      }, 'trace');

      if (this.options.fsync === 'always' && this.fileStream) {
        const fd = (this.fileStream as any).fd;
        if (typeof fd === 'number') {
          fsync(fd, (err) => {
            if (err) {
              debug.emit('filesystem-sink', 'fsync-error', {
                path: this.options.path,
                error: err.message
              }, 'error');
            }
          });
        }
      }
    });

    this._inputPipe.on('end', () => {
      debug.emit('filesystem-sink', 'input-end', {
        path: this.options.path,
        totalWrites: this.writeCount,
        totalBytes: this.byteCount
      }, 'info');
    });

    this.fileStream.on('error', (err) => {
      debug.emit('filesystem-sink', 'error', {
        path: this.options.path,
        error: err.message
      }, 'error');

      console.error(`[FilesystemSink] Error writing to ${this.options.path}:`, err);
    });

    this.fileStream.on('finish', () => {
      debug.emit('filesystem-sink', 'finish', {
        path: this.options.path,
        totalWrites: this.writeCount,
        totalBytes: this.byteCount
      }, 'info');
    });
  }

  async stop(): Promise<void> {
    debug.emit('filesystem-sink', 'stop', {
      path: this.options.path,
      totalWrites: this.writeCount,
      totalBytes: this.byteCount
    }, 'info');

    if (!this.fileStream) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.fileStream!.once('finish', () => {
        debug.emit('filesystem-sink', 'stopped', {
          path: this.options.path
        }, 'info');
        this.fileStream = undefined;
        resolve();
      });

      this.fileStream!.once('error', (err) => {
        reject(err);
      });

      // End the input pipe which will end the file stream
      this._inputPipe.end();
    });
  }

  getStats(): { writeCount: number; byteCount: number } {
    return {
      writeCount: this.writeCount,
      byteCount: this.byteCount
    };
  }
}
