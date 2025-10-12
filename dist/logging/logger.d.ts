import { LogLevel } from './TestEvent.js';
export declare class TestLogger {
    private suite;
    private caseName;
    private outputPath;
    private stream?;
    constructor(suite: string, caseName: string);
    private ensureStream;
    beginCase(phase?: string): void;
    endCase(phase?: string, payload?: unknown): void;
    emit<T = unknown>(evt: string, options?: {
        lvl?: LogLevel;
        phase?: string;
        id?: string;
        corr?: string;
        path?: string;
        payload?: T;
    }): void;
    private writeEvent;
    close(): void;
}
export declare function createLogger(suite: string, caseName: string): TestLogger;
//# sourceMappingURL=logger.d.ts.map