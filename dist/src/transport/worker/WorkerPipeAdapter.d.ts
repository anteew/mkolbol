interface ProcessPipeAdapter {
    createDuplex(options?: import('../../types/stream.js').StreamOptions): import('../../types/stream.js').Pipe;
}
import type { Pipe, StreamOptions } from '../../types/stream.js';
export declare class WorkerPipeAdapter implements ProcessPipeAdapter {
    createDuplex(options?: StreamOptions): Pipe;
}
export {};
//# sourceMappingURL=WorkerPipeAdapter.d.ts.map