import type { Pipe } from '../types/stream';
import { Writable } from 'stream';

export class ConsoleSink {
  public readonly inputPipe: Pipe;

  constructor(private prefix = '[sink]') {
    const sink = new Writable({
      objectMode: true,
      write(chunk, _enc, cb) {
        if (typeof chunk === 'string') {
          console.log(`${prefix} ${chunk}`);
        } else {
          console.log(`${prefix} ${JSON.stringify(chunk)}`);
        }
        cb();
      }
    });
    this.inputPipe = sink as unknown as Pipe;
  }
}
