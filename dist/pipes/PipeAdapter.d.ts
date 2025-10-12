import type { Pipe, StreamOptions } from '../types/stream';
export interface PipeAdapter {
    createDuplex(options?: StreamOptions): Pipe;
}
//# sourceMappingURL=PipeAdapter.d.ts.map