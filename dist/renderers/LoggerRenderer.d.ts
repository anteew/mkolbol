import type { Pipe } from '../types/stream.js';
import { Kernel } from '../kernel/Kernel.js';
export declare class LoggerRenderer {
    readonly inputPipe: Pipe;
    private writeStream;
    constructor(kernel: Kernel, logFilePath: string);
    destroy(): void;
}
//# sourceMappingURL=LoggerRenderer.d.ts.map