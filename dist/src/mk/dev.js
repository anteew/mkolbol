import { watch } from 'node:fs';
import { resolve } from 'node:path';
export class DevWatcher {
    executor;
    topology;
    options;
    watchers = new Map();
    modulePathCache = new Map();
    debounceTimers = new Map();
    debounceMs = 300;
    constructor(executor, topology, options = {}) {
        this.executor = executor;
        this.topology = topology;
        this.options = options;
    }
    start() {
        const { verbose } = this.options;
        if (verbose) {
            console.log('[mk dev] Starting file watchers...');
        }
        for (const node of this.topology.nodes) {
            // Only watch in-proc modules (not external processes or workers)
            const runMode = node.runMode || 'inproc';
            if (runMode !== 'inproc') {
                if (verbose) {
                    console.log(`[mk dev] Skipping ${node.id} (runMode: ${runMode})`);
                }
                continue;
            }
            // Try to resolve module path
            const modulePath = this.resolveModulePath(node.module);
            if (!modulePath) {
                if (verbose) {
                    console.log(`[mk dev] Could not resolve module path for ${node.module}`);
                }
                continue;
            }
            this.modulePathCache.set(node.id, modulePath);
            this.watchModule(node.id, modulePath);
        }
        if (verbose) {
            console.log(`[mk dev] Watching ${this.watchers.size} module(s) for changes`);
        }
    }
    stop() {
        for (const [nodeId, watcher] of this.watchers.entries()) {
            watcher.close();
            if (this.options.verbose) {
                console.log(`[mk dev] Stopped watching ${nodeId}`);
            }
        }
        this.watchers.clear();
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();
    }
    watchModule(nodeId, modulePath) {
        try {
            const watcher = watch(modulePath, (eventType, filename) => {
                if (eventType === 'change') {
                    this.handleFileChange(nodeId, modulePath);
                }
            });
            watcher.on('error', (error) => {
                console.error(`[mk dev] Watcher error for ${nodeId}:`, error.message);
            });
            this.watchers.set(nodeId, watcher);
            if (this.options.verbose) {
                console.log(`[mk dev] Watching ${modulePath} for node ${nodeId}`);
            }
        }
        catch (error) {
            console.error(`[mk dev] Failed to watch ${modulePath}:`, error instanceof Error ? error.message : String(error));
        }
    }
    handleFileChange(nodeId, modulePath) {
        // Clear existing debounce timer
        const existingTimer = this.debounceTimers.get(nodeId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        // Set new debounce timer
        const timer = setTimeout(() => {
            this.reloadModule(nodeId, modulePath);
            this.debounceTimers.delete(nodeId);
        }, this.debounceMs);
        this.debounceTimers.set(nodeId, timer);
    }
    async reloadModule(nodeId, modulePath) {
        console.log(`\n[mk dev] Module ${nodeId} changed, reloading...`);
        try {
            // Clear Node.js module cache for the module
            const absolutePath = resolve(modulePath);
            if (require.cache[absolutePath]) {
                delete require.cache[absolutePath];
            }
            // Restart the node via Executor
            await this.executor.restartNode(nodeId);
            console.log(`[mk dev] ✓ Module ${nodeId} reloaded successfully`);
            if (this.options.onReload) {
                this.options.onReload(nodeId, modulePath);
            }
        }
        catch (error) {
            console.error(`[mk dev] ✗ Failed to reload ${nodeId}:`, error instanceof Error ? error.message : String(error));
        }
    }
    resolveModulePath(moduleName) {
        // Map of known module names to their paths
        const moduleMap = {
            'TimerSource': './src/modules/timer.ts',
            'UppercaseTransform': './src/modules/uppercase.ts',
            'ConsoleSink': './src/modules/consoleSink.ts',
            'FilesystemSink': './src/modules/filesystem-sink.ts',
            'PipeMeterTransform': './src/transforms/pipeMeter.ts',
            'RateLimiterTransform': './src/transforms/rateLimiter.ts',
            'TeeTransform': './src/transforms/tee.ts',
        };
        const relativePath = moduleMap[moduleName];
        if (!relativePath) {
            return null;
        }
        // Resolve relative to project root
        return resolve(process.cwd(), relativePath);
    }
}
export function watchModules(executor, topology, options) {
    const watcher = new DevWatcher(executor, topology, options);
    watcher.start();
    return watcher;
}
//# sourceMappingURL=dev.js.map