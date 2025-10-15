import { MessagePort } from 'node:worker_threads';
import type { Pipe, StreamOptions } from '../../types/stream.js';
interface ProcessPipeAdapter {
    createDuplex(options?: StreamOptions): Pipe;
}
export declare class WorkerPipeAdapter implements ProcessPipeAdapter {
    private port;
    constructor(port: MessagePort);
    createDuplex(options?: StreamOptions): Pipe;
}
export {};
//# sourceMappingURL=WorkerPipeAdapter.d.ts.map