export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export interface LogsOptions {
    module?: string;
    level?: LogLevel;
    json?: boolean;
    follow?: boolean;
    lines?: number;
}
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    module: string;
    event: string;
    payload?: unknown;
}
export declare function tailLogs(options: LogsOptions): Promise<void>;
//# sourceMappingURL=logs.d.ts.map