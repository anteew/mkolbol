import { Duplex } from 'stream';
import { MessagePort } from 'node:worker_threads';
import type { Pipe, StreamOptions } from '../../types/stream.js';

interface ProcessPipeAdapter {
  createDuplex(options?: StreamOptions): Pipe;
}

interface WorkerPipeAdapterOptions extends StreamOptions {
  port: MessagePort;
}

class WorkerPipeAdapterDuplex extends Duplex {
  private port: MessagePort;
  private paused: boolean = false;
  private buffer: Array<Buffer | any> = [];

  constructor(options: WorkerPipeAdapterOptions) {
    const { port, ...streamOptions } = options;
    super(streamOptions);
    this.port = port;

    this.port.on('message', (data: any) => {
      if (data && data.type === 'pause') {
        this.paused = true;
        return;
      }

      if (data && data.type === 'resume') {
        this.paused = false;
        this.drainBuffer();
        return;
      }

      if (data && data.type === 'end') {
        this.push(null);
        return;
      }

      if (data && data.type === 'data') {
        const payload = data.payload;
        if (!this.push(payload)) {
          this.port.postMessage({ type: 'pause' });
        }
      } else {
        if (!this.push(data)) {
          this.port.postMessage({ type: 'pause' });
        }
      }
    });

    this.port.on('messageerror', () => {
      this.destroy(new Error('MessagePort error'));
    });

    this.port.on('close', () => {
      this.destroy();
    });

    // Rely on _final() for end signalling; avoid duplicate 'end' frames here.
  }

  _read(_size: number): void {
    this.port.postMessage({ type: 'resume' });
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (this.paused) {
      this.buffer.push(chunk);
      callback();
    } else {
      try {
        this.port.postMessage({ type: 'data', payload: chunk });
        callback();
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    this.port.postMessage({ type: 'end' });
    callback();
  }

  _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    this.port.close();
    callback(error);
  }

  private drainBuffer(): void {
    while (this.buffer.length > 0 && !this.paused) {
      const chunk = this.buffer.shift();
      this.port.postMessage({ type: 'data', payload: chunk });
    }
  }
}

export class WorkerPipeAdapter implements ProcessPipeAdapter {
  private port: MessagePort;

  constructor(port: MessagePort) {
    this.port = port;
  }

  createDuplex(options?: StreamOptions): Pipe {
    return new WorkerPipeAdapterDuplex({
      ...(options ?? {}),
      port: this.port,
    });
  }
}
