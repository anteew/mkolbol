import { Kernel } from '../kernel/Kernel.js';
import type { Pipe } from '../types/stream.js';
export interface FilesystemSinkOptions {
    path: string;
    mode?: 'append' | 'truncate';
    encoding?: BufferEncoding;
    highWaterMark?: number;
    fsync?: 'always' | 'never' | 'auto';
}
export declare class FilesystemSink {
    protected kernel: Kernel;
    private _inputPipe;
    private fileStream?;
    private options;
    private writeCount;
    private byteCount;
    constructor(kernel: Kernel, options: FilesystemSinkOptions);
    get inputPipe(): Pipe;
    start(): Promise<void>;
    stop(): Promise<void>;
    getStats(): {
        writeCount: number;
        byteCount: number;
    };
}
//# sourceMappingURL=filesystem-sink.d.ts.map