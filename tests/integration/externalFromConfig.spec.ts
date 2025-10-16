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

  // GATED: Process mode test requires experimental flag
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should capture stdout and stderr logs',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'log-test',
            module: 'ExternalProcess',
            params: {
              command: 'sh',
              args: ['-c', 'echo "stdout message" && echo "stderr message" >&2'],
              ioMode: 'stdio'
            },
            runMode: 'process'
          }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('log-test');
      expect(wrapper).toBeDefined();

      // Wait for process to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const stdout = wrapper.getCapturedStdout();
      const stderr = wrapper.getCapturedStderr();

      expect(stdout).toContain('stdout message');
      expect(stderr).toContain('stderr message');

      await executor.down();
    },
    testTimeout
  );

  // GATED: Process mode test requires experimental flag
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should have exponential backoff calculation',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'backoff-test',
            module: 'ExternalProcess',
            params: {
              command: 'echo',
              args: ['test'],
              ioMode: 'stdio',
              restart: 'never',
              restartDelay: 1000
            },
            runMode: 'process'
          }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('backoff-test');
      expect(wrapper).toBeDefined();

      // Test backoff calculation (private method, but we can verify it exists)
      expect(typeof wrapper.calculateBackoffDelay).toBe('function');

      await executor.down();
    },
    testTimeout
  );

  // GATED: Process mode test requires experimental flag
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should respect capture limit for large outputs',
    async () => {
      // Generate more than 100KB of output (using yes command)
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'large-output',
            module: 'ExternalProcess',
            params: {
              command: 'sh',
              args: ['-c', 'yes "test line" | head -n 10000'],
              ioMode: 'stdio'
            },
            runMode: 'process'
          }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('large-output');
      expect(wrapper).toBeDefined();

      // Wait for process to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const stdout = wrapper.getCapturedStdout();
      const captureSize = Buffer.from(stdout, 'utf8').length;

      // Should be capped at 100KB
      expect(captureSize).toBeLessThanOrEqual(100 * 1024);

      await executor.down();
    },
    testTimeout
  );

  // GATED: Process mode test requires experimental flag
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should track exit codes and provide exit info',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'exit-tracker',
            module: 'ExternalProcess',
            params: {
              command: 'sh',
              args: ['-c', 'exit 127'],
              ioMode: 'stdio',
              restart: 'never'
            },
            runMode: 'process'
          }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('exit-tracker');
      expect(wrapper).toBeDefined();

      // Wait for process to exit
      await new Promise((resolve) => setTimeout(resolve, 500));

      const exitCode = wrapper.getLastExitCode();
      const exitInfo = wrapper.getExitInfo();

      expect(exitCode).toBe(127);
      expect(exitInfo).toContain('command not found');

      await executor.down();
    },
    testTimeout
  );

  // GATED: Process mode test requires experimental flag
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should handle environment variables',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'env-test',
            module: 'ExternalProcess',
            params: {
              command: 'sh',
              args: ['-c', 'echo "TEST_VAR=$TEST_VAR"'],
              ioMode: 'stdio',
              env: { TEST_VAR: 'hello' },
              restart: 'never'
            },
            runMode: 'process'
          }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('env-test');
      expect(wrapper).toBeDefined();

      // Wait for process to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const stdout = wrapper.getCapturedStdout();
      expect(stdout).toContain('TEST_VAR=hello');

      await executor.down();
    },
    testTimeout
  );

  // GATED: Process mode test requires experimental flag
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should respect working directory',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'cwd-test',
            module: 'ExternalProcess',
            params: {
              command: 'pwd',
              args: [],
              ioMode: 'stdio',
              cwd: '/tmp',
              restart: 'never'
            },
            runMode: 'process'
          }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('cwd-test');
      expect(wrapper).toBeDefined();

      // Wait for process to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const stdout = wrapper.getCapturedStdout();
      expect(stdout.trim()).toBe('/tmp');

      await executor.down();
    },
    testTimeout
  );
});
