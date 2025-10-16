import type { TopologyConfig } from '../config/schema.js';
import type { Executor } from '../executor/Executor.js';
export interface DevWatcherOptions {
    onReload?: (nodeId: string, modulePath: string) => void;
    verbose?: boolean;
}
export declare class DevWatcher {
    private executor;
    private topology;
    private options;
    private watchers;
    private modulePathCache;
    private debounceTimers;
    private debounceMs;
    constructor(executor: Executor, topology: TopologyConfig, options?: DevWatcherOptions);
    start(): void;
    stop(): void;
    private watchModule;
    private handleFileChange;
    private reloadModule;
    private resolveModulePath;
}
export declare function watchModules(executor: Executor, topology: TopologyConfig, options?: DevWatcherOptions): DevWatcher;
//# sourceMappingURL=dev.d.ts.map