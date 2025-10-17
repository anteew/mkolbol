import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { StateManager } from '../../src/state/StateManager.js';
import { Executor } from '../../src/executor/Executor.js';
import type { TopologyConfig } from '../../src/config/schema.js';

describe('Process Mode Integration', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let stateManager: StateManager;
  let executor: Executor;

  // Process operations can be slow
  const testTimeout = 10000;

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
    stateManager = new StateManager(kernel);
    executor = new Executor(kernel, hostess, stateManager);
  });

  afterEach(async () => {
    if (executor) {
      await executor.down();
    }
  });

  // GATED: Process mode test requires experimental flag (T4705)
  // Only run when MK_PROCESS_EXPERIMENTAL=1 is set
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should spawn and manage process lifecycle',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'echo-process',
            module: 'ExternalProcess',
            params: {
              command: 'cat',
              args: [],
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      // Verify process endpoint is registered
      const endpoints = hostess.listEndpoints();
      const processEndpoint = Array.from(endpoints.entries()).find(
        ([_, ep]) => ep.coordinates === 'node:echo-process',
      );

      expect(processEndpoint).toBeDefined();
      expect(processEndpoint![1].type).toBe('process');
      expect(processEndpoint![1].metadata?.runMode).toBe('process');
      expect(processEndpoint![1].metadata?.command).toBe('cat');

      // Verify state manager registered the node
      const state = stateManager.getState();
      const processNode = state.nodes.find((n: any) => n.id === 'echo-process');
      expect(processNode).toBeDefined();
      expect(processNode.location).toBe('process');

      // Clean shutdown
      await executor.down();
    },
    testTimeout,
  );
});
