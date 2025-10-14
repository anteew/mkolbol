// Local copy of ProcessPipeAdapter to avoid TS resolution edge in CI
interface ProcessPipeAdapter {
  createDuplex(options?: import('../../types/stream.js').StreamOptions): import('../../types/stream.js').Pipe;
}
import type { Pipe, StreamOptions } from '../../types/stream.js';

export class WorkerPipeAdapter implements ProcessPipeAdapter {
  createDuplex(options?: StreamOptions): Pipe {
    throw new Error('WorkerPipeAdapter.createDuplex() stub not implemented');
  }
}
