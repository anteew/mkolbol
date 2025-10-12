import { PassThrough } from 'stream';
import type { Pipe, StreamOptions } from '../../types/stream';
import type { PipeAdapter } from '../PipeAdapter';

export class InProcPipe implements PipeAdapter {
  createDuplex(options?: StreamOptions): Pipe {
    return new PassThrough(options);
  }
}
