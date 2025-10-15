import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
export declare class AnsiParserModule {
    private kernel;
    readonly inputPipe: Pipe;
    readonly outputPipe: Pipe;
    private parser;
    constructor(kernel: Kernel, name?: string);
    reset(): void;
    getState(): import("../transforms/AnsiParser.js").AnsiParserState;
}
//# sourceMappingURL=ansi-parser-module.d.ts.map