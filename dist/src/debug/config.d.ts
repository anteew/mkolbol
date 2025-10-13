export type DebugLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
export interface DebugConfig {
    enabled: boolean;
    modules: Set<string>;
    level: DebugLevel;
    levelValue: number;
}
export declare const config: DebugConfig;
//# sourceMappingURL=config.d.ts.map