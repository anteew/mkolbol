import type { Pipe } from '../types/stream.js';
interface TTYRendererOptions {
    writer?: NodeJS.WritableStream;
    altBuffer?: boolean;
}
/**
 * XtermTTYRenderer
 *
 * Minimal terminal renderer that writes raw ANSI bytes to a TTY (default: process.stdout).
 * - Output-only module (inputPipe only)
 * - Optional alternate screen buffer management
 * - Testable: accepts custom writer
 */
export declare class XtermTTYRenderer {
    readonly inputPipe: Pipe;
    private writer;
    private altBuffer;
    private started;
    constructor(options?: TTYRendererOptions);
    start(): void;
    stop(): void;
}
export {};
//# sourceMappingURL=xterm-tty-renderer.d.ts.map