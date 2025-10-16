import type { Pipe } from '../types/stream';
export interface ConsoleSinkOptions {
    prefix?: string;
    format?: 'text' | 'jsonl';
}
export declare class ConsoleSink {
    readonly inputPipe: Pipe;
    private readonly prefix;
    private readonly format;
    constructor(options?: string | ConsoleSinkOptions);
    private writeText;
    private writeJsonl;
}
//# sourceMappingURL=consoleSink.d.ts.map