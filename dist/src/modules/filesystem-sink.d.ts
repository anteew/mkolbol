import { Kernel } from '../kernel/Kernel.js';
import type { Pipe } from '../types/stream.js';
export interface FilesystemSinkOptions {
    path: string;
    mode?: 'append' | 'truncate';
    encoding?: BufferEncoding;
    highWaterMark?: number;
    fsync?: 'always' | 'never' | 'auto';
    format?: 'raw' | 'jsonl';
    includeTimestamp?: boolean;
}
export declare class FilesystemSink {
    protected kernel: Kernel;
    private _inputPipe;
    private fileStream?;
    private options;
    private writeCount;
    private byteCount;
    private formatTransform?;
    constructor(kernel: Kernel, options: FilesystemSinkOptions);
    get inputPipe(): Pipe;
    private createFormatTransform;
    start(): Promise<void>;
    stop(): Promise<void>;
    getStats(): {
        writeCount: number;
        byteCount: number;
    };
}
//# sourceMappingURL=filesystem-sink.d.ts.map