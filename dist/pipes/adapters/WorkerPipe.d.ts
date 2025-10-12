import { MessagePort } from 'node:worker_threads';
import type { Pipe, StreamOptions } from '../../types/stream';
import type { PipeAdapter } from '../PipeAdapter';
export declare class WorkerPipe implements PipeAdapter {
    private port;
    constructor(port: MessagePort);
    createDuplex(options?: StreamOptions): Pipe;
}
//# sourceMappingURL=WorkerPipe.d.ts.map