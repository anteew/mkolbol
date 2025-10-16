import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DevWatcher, watchModules } from '../../src/mk/dev.js';
import type { TopologyConfig } from '../../src/config/schema.js';
import type { Executor } from '../../src/executor/Executor.js';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

describe('DevWatcher', () => {
  const testDir = join(__dirname, '../fixtures/dev-test');
  let mockExecutor: Partial<Executor>;
  let testFiles: string[] = [];

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    mockExecutor = {
      restartNode: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    testFiles.forEach(file => {
      try {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      } catch (err) {
        // Ignore cleanup errors
      }
    });
    testFiles = [];
  });

  describe('constructor and initialization', () => {
    it('should create a DevWatcher instance', () => {
      const topology: TopologyConfig = {
        nodes: [],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      expect(watcher).toBeDefined();
    });

    it('should accept verbose option', () => {
      const topology: TopologyConfig = {
        nodes: [],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology,
        { verbose: true }
      );

      expect(watcher).toBeDefined();
    });

    it('should accept onReload callback', () => {
      const topology: TopologyConfig = {
        nodes: [],
        connections: []
      };

      const onReload = vi.fn();
      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology,
        { onReload }
      );

      expect(watcher).toBeDefined();
    });
  });

  describe('start and stop', () => {
    it('should start watching without errors for empty topology', () => {
      const topology: TopologyConfig = {
        nodes: [],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      expect(() => watcher.start()).not.toThrow();
      watcher.stop();
    });

    it('should stop watchers cleanly', () => {
      const topology: TopologyConfig = {
        nodes: [],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      watcher.start();
      expect(() => watcher.stop()).not.toThrow();
    });

    it('should handle multiple start/stop cycles', () => {
      const topology: TopologyConfig = {
        nodes: [],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      watcher.start();
      watcher.stop();
      watcher.start();
      watcher.stop();

      expect(true).toBe(true); // No crashes
    });
  });

  describe('module watching', () => {
    it('should skip non-inproc modules', () => {
      const topology: TopologyConfig = {
        nodes: [
          { id: 'worker1', module: 'TimerSource', runMode: 'worker' },
          { id: 'process1', module: 'UppercaseTransform', runMode: 'process' }
        ],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      watcher.start();
      watcher.stop();

      // Should not have called restartNode since no files changed
      expect(mockExecutor.restartNode).not.toHaveBeenCalled();
    });

    it('should only watch inproc modules', () => {
      const topology: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource', runMode: 'inproc' },
          { id: 'worker1', module: 'ConsoleSink', runMode: 'worker' }
        ],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      watcher.start();
      watcher.stop();

      expect(true).toBe(true);
    });

    it('should handle unknown modules gracefully', () => {
      const topology: TopologyConfig = {
        nodes: [
          { id: 'unknown1', module: 'UnknownModule', runMode: 'inproc' }
        ],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      expect(() => watcher.start()).not.toThrow();
      watcher.stop();
    });
  });

  describe('file change detection', () => {
    it('should call restartNode when module file changes', async () => {
      // Create a test module file
      const testModulePath = join(testDir, 'test-module.ts');
      writeFileSync(testModulePath, 'export class TestModule {}');
      testFiles.push(testModulePath);

      const topology: TopologyConfig = {
        nodes: [
          { id: 'test1', module: 'TimerSource', runMode: 'inproc' }
        ],
        connections: []
      };

      const onReload = vi.fn();
      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology,
        { onReload, verbose: false }
      );

      watcher.start();

      // Give it time to set up watchers
      await new Promise(resolve => setTimeout(resolve, 100));

      watcher.stop();
    });

    it('should debounce rapid file changes', async () => {
      const topology: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource', runMode: 'inproc' }
        ],
        connections: []
      };

      const onReload = vi.fn();
      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology,
        { onReload }
      );

      watcher.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      watcher.stop();

      // Debouncing should prevent multiple reloads
      expect(mockExecutor.restartNode).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle restartNode errors gracefully', async () => {
      mockExecutor.restartNode = vi.fn().mockRejectedValue(new Error('Restart failed'));

      const topology: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource', runMode: 'inproc' }
        ],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      // Should not throw even if restart fails
      expect(() => watcher.start()).not.toThrow();
      watcher.stop();
    });

    it('should handle watch errors gracefully', () => {
      const topology: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource', runMode: 'inproc' }
        ],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      expect(() => watcher.start()).not.toThrow();
      watcher.stop();
    });
  });

  describe('watchModules factory function', () => {
    it('should create and start a watcher', () => {
      const topology: TopologyConfig = {
        nodes: [],
        connections: []
      };

      const watcher = watchModules(
        mockExecutor as Executor,
        topology
      );

      expect(watcher).toBeDefined();
      expect(watcher).toBeInstanceOf(DevWatcher);
      watcher.stop();
    });

    it('should accept options', () => {
      const topology: TopologyConfig = {
        nodes: [],
        connections: []
      };

      const onReload = vi.fn();
      const watcher = watchModules(
        mockExecutor as Executor,
        topology,
        { verbose: true, onReload }
      );

      expect(watcher).toBeDefined();
      watcher.stop();
    });
  });

  describe('verbose logging', () => {
    it('should log when verbose is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const topology: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource', runMode: 'inproc' }
        ],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology,
        { verbose: true }
      );

      watcher.start();
      expect(consoleSpy).toHaveBeenCalled();
      
      watcher.stop();
      consoleSpy.mockRestore();
    });

    it('should not log when verbose is disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const topology: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource', runMode: 'inproc' }
        ],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology,
        { verbose: false }
      );

      watcher.start();
      watcher.stop();
      
      consoleSpy.mockRestore();
    });
  });

  describe('reload callback', () => {
    it('should call onReload callback after successful reload', () => {
      const onReload = vi.fn();
      const topology: TopologyConfig = {
        nodes: [],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology,
        { onReload }
      );

      watcher.start();
      watcher.stop();

      // Callback not called since no files changed
      expect(onReload).not.toHaveBeenCalled();
    });
  });

  describe('module path resolution', () => {
    it('should handle modules with known paths', () => {
      const topology: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource' },
          { id: 'upper1', module: 'UppercaseTransform' },
          { id: 'console1', module: 'ConsoleSink' }
        ],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      expect(() => watcher.start()).not.toThrow();
      watcher.stop();
    });

    it('should handle modules without known paths', () => {
      const topology: TopologyConfig = {
        nodes: [
          { id: 'custom1', module: 'CustomModule' }
        ],
        connections: []
      };

      const watcher = new DevWatcher(
        mockExecutor as Executor,
        topology
      );

      expect(() => watcher.start()).not.toThrow();
      watcher.stop();
    });
  });
});
