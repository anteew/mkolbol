import type { Pipe } from '../types/stream.js';
import { Kernel } from '../kernel/Kernel.js';
export interface TTYRendererOptions {
    target?: 'stdout' | string;
    rawMode?: boolean;
    stripAnsi?: boolean;
}
export declare class TTYRenderer {
    protected kernel: Kernel;
    readonly inputPipe: Pipe;
    private fileStream?;
    private options;
    private isTTY;
    constructor(kernel: Kernel, options?: TTYRendererOptions);
    private writeChunk;
    private stripAnsiCodes;
    start(): Promise<void>;
    stop(): Promise<void>;
    destroy(): void;
}
//# sourceMappingURL=ttyRenderer.d.ts.map