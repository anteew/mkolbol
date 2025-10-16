import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
export interface TeeOptions {
    outputCount?: number;
    objectMode?: boolean;
}
export declare class TeeTransform {
    private kernel;
    readonly inputPipe: Pipe;
    readonly outputPipes: Pipe[];
    private transformer;
    private isPaused;
    constructor(kernel: Kernel, options?: TeeOptions);
    private handleData;
    private checkBackpressure;
}
//# sourceMappingURL=tee.d.ts.map