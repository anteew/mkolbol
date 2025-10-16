import { watch, FSWatcher } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { TopologyConfig } from '../config/schema.js';
import type { Executor } from '../executor/Executor.js';

export interface DevWatcherOptions {
  onReload?: (nodeId: string, modulePath: string) => void;
  verbose?: boolean;
}

export class DevWatcher {
  private watchers: Map<string, FSWatcher> = new Map();
  private modulePathCache: Map<string, string> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 300;

  constructor(
    private executor: Executor,
    private topology: TopologyConfig,
    private options: DevWatcherOptions = {}
  ) {}

  start(): void {
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

  stop(): void {
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

  private watchModule(nodeId: string, modulePath: string): void {
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
    } catch (error) {
      console.error(`[mk dev] Failed to watch ${modulePath}:`, error instanceof Error ? error.message : String(error));
    }
  }

  private handleFileChange(nodeId: string, modulePath: string): void {
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

  private async reloadModule(nodeId: string, modulePath: string): Promise<void> {
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
    } catch (error) {
      console.error(`[mk dev] ✗ Failed to reload ${nodeId}:`, error instanceof Error ? error.message : String(error));
    }
  }

  private resolveModulePath(moduleName: string): string | null {
    // Map of known module names to their paths
    const moduleMap: Record<string, string> = {
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

export function watchModules(
  executor: Executor,
  topology: TopologyConfig,
  options?: DevWatcherOptions
): DevWatcher {
  const watcher = new DevWatcher(executor, topology, options);
  watcher.start();
  return watcher;
}
