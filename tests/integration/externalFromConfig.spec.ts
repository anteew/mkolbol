import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { StateManager } from '../../src/state/StateManager.js';
import { Executor } from '../../src/executor/Executor.js';
import type { TopologyConfig } from '../../src/config/schema.js';

describe('External From Config Integration', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let stateManager: StateManager;
  let executor: Executor;

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

  // GATED: Process mode test requires experimental flag
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should spawn external process with stdio mode from config',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'echo-stdio',
            module: 'ExternalProcess',
            params: {
              command: 'cat',
              args: [],
              ioMode: 'stdio'
            },
            runMode: 'process'
          }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      // Verify endpoint registration
      const endpoints = hostess.listEndpoints();
      const stdioEndpoint = Array.from(endpoints.entries()).find(
        ([_, ep]) => ep.coordinates === 'node:echo-stdio'
      );

      expect(stdioEndpoint).toBeDefined();
      expect(stdioEndpoint![1].type).toBe('process');
      expect(stdioEndpoint![1].metadata?.runMode).toBe('process');
      expect(stdioEndpoint![1].metadata?.command).toBe('cat');

      // Verify state manager registered the node
      const state = stateManager.getState();
      const stdioNode = state.nodes.find((n: any) => n.id === 'echo-stdio');
      expect(stdioNode).toBeDefined();
      expect(stdioNode.location).toBe('process');

      // Test roundtrip: write data and read it back
      const wrapper = (executor as any).wrappers.get('echo-stdio');
      expect(wrapper).toBeDefined();

      const testData = Buffer.from('stdio-test\n');
      const outputChunks: Buffer[] = [];

      wrapper.outputPipe.on('data', (chunk: Buffer) => {
        outputChunks.push(chunk);
      });

      wrapper.inputPipe.write(testData);
      wrapper.inputPipe.end();

      // Wait for data to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      const output = Buffer.concat(outputChunks).toString();
      expect(output).toBe('stdio-test\n');

      await executor.down();
    },
    testTimeout
  );

  // GATED: Process mode test requires experimental flag
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should spawn external process with pty mode from config',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'echo-pty',
            module: 'ExternalProcess',
            params: {
              command: 'cat',
              args: [],
              ioMode: 'pty'
            },
            runMode: 'process'
          }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      // Verify endpoint registration
      const endpoints = hostess.listEndpoints();
      const ptyEndpoint = Array.from(endpoints.entries()).find(
        ([_, ep]) => ep.coordinates === 'node:echo-pty'
      );

      expect(ptyEndpoint).toBeDefined();
      expect(ptyEndpoint![1].type).toBe('process');
      expect(ptyEndpoint![1].metadata?.runMode).toBe('process');
      expect(ptyEndpoint![1].metadata?.command).toBe('cat');

      // Verify state manager registered the node
      const state = stateManager.getState();
      const ptyNode = state.nodes.find((n: any) => n.id === 'echo-pty');
      expect(ptyNode).toBeDefined();
      expect(ptyNode.location).toBe('process');

      // Test roundtrip: write data and read it back
      const wrapper = (executor as any).wrappers.get('echo-pty');
      expect(wrapper).toBeDefined();

      const testData = Buffer.from('pty-test\n');
      const outputChunks: Buffer[] = [];

      wrapper.outputPipe.on('data', (chunk: Buffer) => {
        outputChunks.push(chunk);
      });

      wrapper.inputPipe.write(testData);
      wrapper.inputPipe.end();

      // Wait for data to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      const output = Buffer.concat(outputChunks).toString();
      expect(output).toBe('pty-test\n');

      await executor.down();
    },
    testTimeout
  );

  // GATED: Process mode test requires experimental flag
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should handle both stdio and pty modes concurrently',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'echo-stdio',
            module: 'ExternalProcess',
            params: {
              command: 'cat',
              args: [],
              ioMode: 'stdio'
            },
            runMode: 'process'
          },
          {
            id: 'echo-pty',
            module: 'ExternalProcess',
            params: {
              command: 'cat',
              args: [],
              ioMode: 'pty'
            },
            runMode: 'process'
          }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      // Verify both endpoints are registered
      const endpoints = hostess.listEndpoints();
      const endpointsArray = Array.from(endpoints.entries());

      const stdioEndpoint = endpointsArray.find(
        ([_, ep]) => ep.coordinates === 'node:echo-stdio'
      );
      const ptyEndpoint = endpointsArray.find(
        ([_, ep]) => ep.coordinates === 'node:echo-pty'
      );

      expect(stdioEndpoint).toBeDefined();
      expect(ptyEndpoint).toBeDefined();

      // Verify both nodes in state manager
      const state = stateManager.getState();
      const stdioNode = state.nodes.find((n: any) => n.id === 'echo-stdio');
      const ptyNode = state.nodes.find((n: any) => n.id === 'echo-pty');

      expect(stdioNode).toBeDefined();
      expect(ptyNode).toBeDefined();
      expect(stdioNode.location).toBe('process');
      expect(ptyNode.location).toBe('process');

      await executor.down();
    },
    testTimeout
  );
});
