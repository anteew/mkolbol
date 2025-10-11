import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
import { Transform } from 'stream';

export class UppercaseTransform {
  public readonly inputPipe: Pipe;
  public readonly outputPipe: Pipe;

  constructor(private kernel: Kernel) {
    this.inputPipe = kernel.createPipe({ objectMode: true });
    const transformer = new Transform({
      objectMode: true,
      transform(chunk, _enc, cb) {
        const s = typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
        cb(null, s.toUpperCase());
      }
    });
    this.outputPipe = kernel.createPipe({ objectMode: true });
    this.inputPipe.pipe(transformer).pipe(this.outputPipe);
  }
}
