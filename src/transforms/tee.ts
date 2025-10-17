import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
import { Transform } from 'stream';

export interface TeeOptions {
  outputCount?: number;
  objectMode?: boolean;
}

export class TeeTransform {
  public readonly inputPipe: Pipe;
  public readonly outputPipes: Pipe[];

  private transformer: Transform;
  private isPaused = false;

  constructor(
    private kernel: Kernel,
    options: TeeOptions = {},
  ) {
    const outputCount = options.outputCount ?? 2;
    const objectMode = options.objectMode ?? true;

    if (outputCount < 1) {
      throw new Error('outputCount must be at least 1');
    }

    this.inputPipe = kernel.createPipe({ objectMode });

    this.outputPipes = [];
    for (let i = 0; i < outputCount; i++) {
      const outputPipe = kernel.createPipe({ objectMode });
      this.outputPipes.push(outputPipe);

      outputPipe.on('drain', () => {
        this.checkBackpressure();
      });
    }

    this.transformer = new Transform({
      objectMode,
      transform: (chunk, _enc, callback) => {
        this.handleData(chunk);
        callback();
      },
      flush: (callback) => {
        for (const outputPipe of this.outputPipes) {
          outputPipe.end();
        }
        callback();
      },
    });

    this.inputPipe.pipe(this.transformer);
  }

  private handleData(chunk: any): void {
    let shouldPause = false;

    for (const outputPipe of this.outputPipes) {
      const canWrite = outputPipe.write(chunk);
      if (!canWrite) {
        shouldPause = true;
      }
    }

    if (shouldPause && !this.isPaused) {
      this.isPaused = true;
      this.transformer.pause();
    }
  }

  private checkBackpressure(): void {
    if (!this.isPaused) {
      return;
    }

    const allReady = this.outputPipes.every((pipe) => {
      const writable = pipe.writableHighWaterMark - pipe.writableLength;
      return writable > 0;
    });

    if (allReady) {
      this.isPaused = false;
      this.transformer.resume();
    }
  }
}
