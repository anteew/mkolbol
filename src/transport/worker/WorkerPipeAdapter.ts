import type { ProcessPipeAdapter } from '../../executor/ProcessInterfaces.js';
import type { Pipe, StreamOptions } from '../../types/stream.js';

export class WorkerPipeAdapter implements ProcessPipeAdapter {
  createDuplex(options?: StreamOptions): Pipe {
    throw new Error('WorkerPipeAdapter.createDuplex() stub not implemented');
  }
}
