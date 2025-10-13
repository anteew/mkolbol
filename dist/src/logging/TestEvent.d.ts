export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface TestEventEnvelope<T = unknown> {
    ts: number;
    lvl: LogLevel;
    case: string;
    phase?: string;
    evt: string;
    id?: string;
    corr?: string;
    path?: string;
    payload?: T;
}
export declare function createEvent<T = unknown>(evt: string, caseName: string, options?: {
    lvl?: LogLevel;
    phase?: string;
    id?: string;
    corr?: string;
    path?: string;
    payload?: T;
}): TestEventEnvelope<T>;
//# sourceMappingURL=TestEvent.d.ts.map