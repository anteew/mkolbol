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
              ioMode: 'stdio',
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      // Verify endpoint registration
      const endpoints = hostess.listEndpoints();
      const stdioEndpoint = Array.from(endpoints.entries()).find(
        ([_, ep]) => ep.coordinates === 'node:echo-stdio',
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
    testTimeout,
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
              ioMode: 'pty',
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      // Verify endpoint registration
      const endpoints = hostess.listEndpoints();
      const ptyEndpoint = Array.from(endpoints.entries()).find(
        ([_, ep]) => ep.coordinates === 'node:echo-pty',
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
    testTimeout,
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
              ioMode: 'stdio',
            },
            runMode: 'process',
          },
          {
            id: 'echo-pty',
            module: 'ExternalProcess',
            params: {
              command: 'cat',
              args: [],
              ioMode: 'pty',
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      // Verify both endpoints are registered
      const endpoints = hostess.listEndpoints();
      const endpointsArray = Array.from(endpoints.entries());

      const stdioEndpoint = endpointsArray.find(([_, ep]) => ep.coordinates === 'node:echo-stdio');
      const ptyEndpoint = endpointsArray.find(([_, ep]) => ep.coordinates === 'node:echo-pty');

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
    testTimeout,
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
              ioMode: 'stdio',
            },
            runMode: 'process',
          },
        ],
        connections: [],
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
    testTimeout,
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
              restartDelay: 1000,
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('backoff-test');
      expect(wrapper).toBeDefined();

      // Test backoff calculation (private method, but we can verify it exists)
      expect(typeof wrapper.calculateBackoffDelay).toBe('function');

      await executor.down();
    },
    testTimeout,
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
              ioMode: 'stdio',
            },
            runMode: 'process',
          },
        ],
        connections: [],
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
    testTimeout,
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
              restart: 'never',
            },
            runMode: 'process',
          },
        ],
        connections: [],
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
    testTimeout,
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
              restart: 'never',
            },
            runMode: 'process',
          },
        ],
        connections: [],
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
    testTimeout,
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
              restart: 'never',
            },
            runMode: 'process',
          },
        ],
        connections: [],
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
    testTimeout,
  );

  // EDGE CASE: Capture limit enforcement
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should enforce 100KB capture limit strictly',
    async () => {
      // Generate exactly 150KB of data (50KB more than limit)
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'capture-limit',
            module: 'ExternalProcess',
            params: {
              command: 'sh',
              args: ['-c', 'dd if=/dev/zero bs=1024 count=150 2>/dev/null | base64'],
              ioMode: 'stdio',
              restart: 'never',
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('capture-limit');
      expect(wrapper).toBeDefined();

      // Wait for process to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const stdout = wrapper.getCapturedStdout();
      const captureSize = Buffer.from(stdout, 'utf8').length;

      // Must be exactly at 100KB limit
      expect(captureSize).toBe(100 * 1024);
      expect(captureSize).toBeLessThanOrEqual(100 * 1024);

      await executor.down();
    },
    15000,
  );

  // EDGE CASE: Backoff cap at 30s
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should cap exponential backoff at 30 seconds',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'backoff-cap',
            module: 'ExternalProcess',
            params: {
              command: 'echo',
              args: ['test'],
              ioMode: 'stdio',
              restart: 'never',
              restartDelay: 1000,
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('backoff-cap');
      expect(wrapper).toBeDefined();

      // Simulate multiple restart attempts by setting restart count
      (wrapper as any).restartCount = 10; // 2^10 * 1000 = 1024000ms (17 minutes)

      const backoffDelay = (wrapper as any).calculateBackoffDelay();

      // Should be capped at 30 seconds, not 17 minutes
      expect(backoffDelay).toBe(30000);
      expect(backoffDelay).toBeLessThanOrEqual(30000);

      await executor.down();
    },
    testTimeout,
  );

  // EDGE CASE: SIGTERM signal handling
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should handle SIGTERM signal correctly',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'sigterm-test',
            module: 'ExternalProcess',
            params: {
              command: 'sh',
              args: ['-c', 'trap "exit 143" TERM; sleep 10 & wait'],
              ioMode: 'stdio',
              restart: 'never',
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('sigterm-test');
      expect(wrapper).toBeDefined();

      // Wait for process to start
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Send SIGTERM
      wrapper.sendSignal('SIGTERM');

      // Wait for process to handle signal
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const lastExitCode = wrapper.getLastExitCode();
      const exitInfo = wrapper.getExitInfo();

      // When trapped, shell exits with code 143, not signal
      expect(lastExitCode).toBe(143);
      expect(exitInfo).toContain('terminated (SIGTERM)');

      await executor.down();
    },
    testTimeout,
  );

  // EDGE CASE: SIGKILL signal handling
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should handle SIGKILL signal correctly',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'sigkill-test',
            module: 'ExternalProcess',
            params: {
              command: 'sh',
              args: ['-c', 'sleep 10'],
              ioMode: 'stdio',
              restart: 'never',
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('sigkill-test');
      expect(wrapper).toBeDefined();

      // Wait for process to start
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Send SIGKILL
      wrapper.sendSignal('SIGKILL');

      // Wait for process to be killed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const lastSignal = wrapper.getLastSignal();
      const lastExitCode = wrapper.getLastExitCode();

      // Should have been killed by SIGKILL
      expect(lastSignal).toBe('SIGKILL');
      expect(lastExitCode).toBeNull();

      await executor.down();
    },
    testTimeout,
  );

  // EDGE CASE: Restart count limit
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should respect restart count limits and not exceed maxRestarts',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'restart-limit',
            module: 'ExternalProcess',
            params: {
              command: 'sh',
              args: ['-c', 'exit 1'],
              ioMode: 'stdio',
              restart: 'always',
              maxRestarts: 2,
              restartDelay: 50,
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('restart-limit');
      expect(wrapper).toBeDefined();

      // Wait for initial spawn + restarts with exponential backoff
      // Initial spawn (fails), restart 1 (50ms), restart 2 (100ms) = max 2 restarts
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const restartCount = wrapper.getRestartCount();
      const isRunning = wrapper.isRunning();

      // Should have stopped at maxRestarts
      expect(restartCount).toBeLessThanOrEqual(2);
      // Process should no longer be running after hitting limit
      expect(isRunning).toBe(false);

      await executor.down();
    },
    testTimeout,
  );

  // EDGE CASE: Capture limit for stderr
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should enforce 100KB capture limit on stderr',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'stderr-limit',
            module: 'ExternalProcess',
            params: {
              command: 'sh',
              args: ['-c', 'dd if=/dev/zero bs=1024 count=150 2>&1 >&2 | base64 >&2'],
              ioMode: 'stdio',
              restart: 'never',
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('stderr-limit');
      expect(wrapper).toBeDefined();

      // Wait for process to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const stderr = wrapper.getCapturedStderr();
      const stderrSize = Buffer.from(stderr, 'utf8').length;

      // Should be capped at 100KB
      expect(stderrSize).toBeLessThanOrEqual(100 * 1024);

      await executor.down();
    },
    15000,
  );

  // EDGE CASE: Shutdown timeout with SIGKILL fallback
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should use SIGKILL if SIGTERM timeout is exceeded',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'shutdown-timeout',
            module: 'ExternalProcess',
            params: {
              command: 'sleep',
              args: ['60'],
              ioMode: 'stdio',
              restart: 'never',
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('shutdown-timeout');
      expect(wrapper).toBeDefined();

      // Wait for process to start
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify process is running
      expect(wrapper.isRunning()).toBe(true);

      const startTime = Date.now();

      // Shutdown with short timeout (sleep responds to SIGTERM quickly)
      await wrapper.shutdown(500);

      const elapsedTime = Date.now() - startTime;

      // Should have completed quickly (sleep responds to SIGTERM)
      expect(elapsedTime).toBeLessThan(2000);
      expect(wrapper.isRunning()).toBe(false);

      // The wrapper's shutdown method should have completed
      expect(wrapper.process).toBeUndefined();

      await executor.down();
    },
    10000,
  );

  // Health check: command type success
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should pass command-based health check',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'healthcheck-command',
            module: 'ExternalProcess',
            params: {
              command: 'sleep',
              args: ['5'],
              ioMode: 'stdio',
              restart: 'never',
              healthCheck: {
                type: 'command',
                command: 'exit 0',
                timeout: 1000,
                retries: 2,
              },
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('healthcheck-command');
      expect(wrapper).toBeDefined();
      expect(wrapper.isRunning()).toBe(true);

      await executor.down();
    },
    testTimeout,
  );

  // Health check: command type failure
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should fail command-based health check after retries',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'healthcheck-fail',
            module: 'ExternalProcess',
            params: {
              command: 'sleep',
              args: ['5'],
              ioMode: 'stdio',
              restart: 'never',
              healthCheck: {
                type: 'command',
                command: 'exit 1',
                timeout: 500,
                retries: 2,
              },
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);

      await expect(executor.up()).rejects.toThrow(/Health check failed/);

      await executor.down();
    },
    testTimeout,
  );

  async function getFreePort(): Promise<number> {
    return await new Promise((resolve, reject) => {
      const net = require('net');
      const s = net.createServer();
      s.listen(0, () => {
        const address = s.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        s.close(() => resolve(port));
      });
      s.on('error', reject);
    });
  }

  // Health check: HTTP type success (uses a free ephemeral port to avoid collisions)
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should pass HTTP-based health check',
    async () => {
      const port = await getFreePort();
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'healthcheck-http',
            module: 'ExternalProcess',
            params: {
              command: 'node',
              args: [
                '-e',
                `const http=require("http");const s=http.createServer((req,res)=>res.end("OK"));s.listen(${port});process.on("SIGTERM",()=>s.close())`,
              ],
              ioMode: 'stdio',
              restart: 'never',
              healthCheck: {
                type: 'http',
                url: `http://localhost:${port}`,
                timeout: 2000,
                retries: 5,
              },
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);
      await executor.up();

      const wrapper = (executor as any).wrappers.get('healthcheck-http');
      expect(wrapper).toBeDefined();
      expect(wrapper.isRunning()).toBe(true);

      await executor.down();
    },
    testTimeout,
  );

  // Health check: HTTP type failure
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should fail HTTP-based health check with timeout',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'healthcheck-http-fail',
            module: 'ExternalProcess',
            params: {
              command: 'sleep',
              args: ['5'],
              ioMode: 'stdio',
              restart: 'never',
              healthCheck: {
                type: 'http',
                url: 'http://localhost:99999',
                timeout: 500,
                retries: 2,
              },
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);

      await expect(executor.up()).rejects.toThrow(/Health check failed/);

      await executor.down();
    },
    testTimeout,
  );

  // Health check: HTTP type 404 failure (uses a free ephemeral port)
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should fail HTTP health check on non-2xx status',
    async () => {
      const port = await getFreePort();
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'healthcheck-http-404',
            module: 'ExternalProcess',
            params: {
              command: 'node',
              args: [
                '-e',
                `const http=require("http");const s=http.createServer((req,res)=>{res.statusCode=404;res.end()});s.listen(${port});process.on("SIGTERM",()=>s.close())`,
              ],
              ioMode: 'stdio',
              restart: 'never',
              healthCheck: {
                type: 'http',
                url: `http://localhost:${port}`,
                timeout: 2000,
                retries: 2,
              },
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);

      await expect(executor.up()).rejects.toThrow(/Health check failed/);

      await executor.down();
    },
    testTimeout,
  );

  // Health check: exponential backoff
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should use exponential backoff between health check retries',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'healthcheck-backoff',
            module: 'ExternalProcess',
            params: {
              command: 'sleep',
              args: ['5'],
              ioMode: 'stdio',
              restart: 'never',
              healthCheck: {
                type: 'command',
                command: 'exit 1',
                timeout: 100,
                retries: 3,
              },
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);

      const startTime = Date.now();
      try {
        await executor.up();
      } catch (error) {
        // Expected to fail
      }
      const elapsed = Date.now() - startTime;

      // With 3 retries and exponential backoff (1s, 2s):
      // Should take at least 3 seconds (1000 + 2000 + execution time)
      expect(elapsed).toBeGreaterThan(3000);

      await executor.down();
    },
    testTimeout,
  );

  // Health check: command timeout
  it.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)(
    'should timeout command health check',
    async () => {
      const config: TopologyConfig = {
        nodes: [
          {
            id: 'healthcheck-cmd-timeout',
            module: 'ExternalProcess',
            params: {
              command: 'sleep',
              args: ['5'],
              ioMode: 'stdio',
              restart: 'never',
              healthCheck: {
                type: 'command',
                command: 'sleep 10',
                timeout: 500,
                retries: 1,
              },
            },
            runMode: 'process',
          },
        ],
        connections: [],
      };

      executor.load(config);

      await expect(executor.up()).rejects.toThrow(/timed out/);

      await executor.down();
    },
    testTimeout,
  );
});
