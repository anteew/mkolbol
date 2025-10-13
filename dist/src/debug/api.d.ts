import { DebugLevel } from './config.js';
export interface DebugEvent {
    module: string;
    level: DebugLevel;
    event: string;
    payload?: unknown;
}
declare class Debug {
    on(module: string): boolean;
    shouldEmit(module: string, level: DebugLevel): boolean;
    emit(module: string, event: string, payload?: unknown, level?: DebugLevel): void;
    private isLaminarPresent;
    private emitAsTestEvent;
    private emitToConsole;
    private mapLevelToLogLevel;
}
export declare const debug: Debug;
export {};
//# sourceMappingURL=api.d.ts.map