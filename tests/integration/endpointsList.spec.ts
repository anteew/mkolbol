import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { StateManager } from '../../src/state/StateManager.js';
import { Executor } from '../../src/executor/Executor.js';
import { ExternalServerWrapper } from '../../src/wrappers/ExternalServerWrapper.js';
import { PTYServerWrapper } from '../../src/wrappers/PTYServerWrapper.js';
import type { TopologyConfig } from '../../src/config/schema.js';
import type { ExternalServerManifest } from '../../src/types.js';

describe('Endpoints List Integration', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let stateManager: StateManager;
  let executor: Executor;

  // PTY operations can be slow, especially under load
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

  describe('Executor endpoint registration', () => {
    it('should register endpoints for inproc nodes', async () => {
      const config: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource', params: { periodMs: 1000 } },
          { id: 'sink1', module: 'ConsoleSink', params: { prefix: '[test]' } }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      const endpoints = hostess.listEndpoints();

      // Should have 2 endpoints registered
      expect(endpoints.size).toBeGreaterThanOrEqual(2);

      // Find endpoints by their coordinates pattern
      const endpointEntries = Array.from(endpoints.entries());
      const timer1Endpoint = endpointEntries.find(([_, ep]) => ep.coordinates === 'node:timer1');
      const sink1Endpoint = endpointEntries.find(([_, ep]) => ep.coordinates === 'node:sink1');

      expect(timer1Endpoint).toBeDefined();
      expect(timer1Endpoint![1].type).toBe('inproc');
      expect(timer1Endpoint![1].metadata?.module).toBe('TimerSource');
      expect(timer1Endpoint![1].metadata?.runMode).toBe('inproc');

      expect(sink1Endpoint).toBeDefined();
      expect(sink1Endpoint![1].type).toBe('inproc');
      expect(sink1Endpoint![1].metadata?.module).toBe('ConsoleSink');
    });

    // GATED: Worker endpoint test requires worker harness infrastructure (T4611)
    // Only run when MK_WORKER_EXPERIMENTAL=1 is set
    it.skipIf(!process.env.MK_WORKER_EXPERIMENTAL)('should register endpoints for worker nodes', async () => {
      const config: TopologyConfig = {
        nodes: [
          { id: 'worker1', module: 'UppercaseTransform', runMode: 'worker' }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBeGreaterThanOrEqual(1);

      const endpointEntries = Array.from(endpoints.entries());
      const workerEndpoint = endpointEntries.find(([_, ep]) => ep.coordinates === 'node:worker1');

      expect(workerEndpoint).toBeDefined();
      expect(workerEndpoint![1].type).toBe('worker');
      expect(workerEndpoint![1].metadata?.module).toBe('UppercaseTransform');
      expect(workerEndpoint![1].metadata?.runMode).toBe('worker');
    });

    it('should list all registered endpoints across multiple nodes', async () => {
      const config: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource' },
          { id: 'upper1', module: 'UppercaseTransform' },
          { id: 'sink1', module: 'ConsoleSink' }
        ],
        connections: [
          { from: 'timer1.output', to: 'upper1.input' },
          { from: 'upper1.output', to: 'sink1.input' }
        ]
      };

      executor.load(config);
      await executor.up();

      const endpoints = hostess.listEndpoints();

      // Should have endpoints for all 3 nodes
      expect(endpoints.size).toBeGreaterThanOrEqual(3);

      const coordinatesSet = new Set(Array.from(endpoints.values()).map(ep => ep.coordinates));
      expect(coordinatesSet.has('node:timer1')).toBe(true);
      expect(coordinatesSet.has('node:upper1')).toBe(true);
      expect(coordinatesSet.has('node:sink1')).toBe(true);
    });
  });

  describe('ExternalServerWrapper endpoint registration', () => {
    let wrapper: ExternalServerWrapper;

    afterEach(async () => {
      if (wrapper && wrapper.isRunning()) {
        await wrapper.shutdown();
      }
    });

    it('should register external endpoint when wrapper spawns', async () => {
      const manifest: ExternalServerManifest = {
        fqdn: 'localhost',
        servername: 'echo-server',
        classHex: '0xFFFF',
        owner: 'test',
        auth: 'no',
        authMechanism: 'none',
        terminals: [
          { name: 'input', type: 'local', direction: 'input' },
          { name: 'output', type: 'local', direction: 'output' }
        ],
        capabilities: {
          type: 'transform'
        },
        command: '/bin/cat',
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'stdio'
      };

      wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
      await wrapper.spawn();

      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBeGreaterThanOrEqual(1);

      const endpointEntries = Array.from(endpoints.entries());
      const externalEndpoint = endpointEntries.find(([_, ep]) => ep.type === 'external');

      expect(externalEndpoint).toBeDefined();
      expect(externalEndpoint![1].coordinates).toContain('/bin/cat');
      expect(externalEndpoint![1].metadata?.cwd).toBe(process.cwd());
      expect(externalEndpoint![1].metadata?.ioMode).toBe('stdio');
    });
  });

  describe('PTYServerWrapper endpoint registration', () => {
    let wrapper: PTYServerWrapper;

    afterEach(async () => {
      if (wrapper && wrapper.isRunning()) {
        await wrapper.shutdown();
      }
    });

    it('should register pty endpoint when wrapper spawns', { timeout: testTimeout }, async () => {
      const manifest: ExternalServerManifest = {
        fqdn: 'localhost',
        servername: 'bash-pty',
        classHex: '0xFFFF',
        owner: 'test',
        auth: 'no',
        authMechanism: 'none',
        terminals: [
          { name: 'input', type: 'local', direction: 'input' },
          { name: 'output', type: 'local', direction: 'output' }
        ],
        capabilities: {
          type: 'transform'
        },
        command: '/bin/bash',
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'pty',
        initialCols: 80,
        initialRows: 24,
        terminalType: 'xterm-256color'
      };

      wrapper = new PTYServerWrapper(kernel, hostess, manifest);
      await wrapper.spawn();

      const endpoints = hostess.listEndpoints();
      expect(endpoints.size).toBeGreaterThanOrEqual(1);

      const endpointEntries = Array.from(endpoints.entries());
      const ptyEndpoint = endpointEntries.find(([_, ep]) => ep.type === 'pty');

      expect(ptyEndpoint).toBeDefined();
      expect(ptyEndpoint![1].coordinates).toMatch(/^pid:\d+$/);
      expect(ptyEndpoint![1].metadata?.cols).toBe(80);
      expect(ptyEndpoint![1].metadata?.rows).toBe(24);
      expect(ptyEndpoint![1].metadata?.terminalType).toBe('xterm-256color');
    });
  });

  describe('Full topology with mixed endpoint types', () => {
    let externalWrapper: ExternalServerWrapper;

    afterEach(async () => {
      if (externalWrapper && externalWrapper.isRunning()) {
        await externalWrapper.shutdown();
      }
    });

    it('should list all endpoint types in a mixed topology', async () => {
      // Create executor with inproc nodes
      const config: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource' },
          { id: 'sink1', module: 'ConsoleSink' }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      // Add an external wrapper
      const externalManifest: ExternalServerManifest = {
        fqdn: 'localhost',
        servername: 'external-cat',
        classHex: '0xEEEE',
        owner: 'test',
        auth: 'no',
        authMechanism: 'none',
        terminals: [
          { name: 'input', type: 'local', direction: 'input' },
          { name: 'output', type: 'local', direction: 'output' }
        ],
        capabilities: {
          type: 'transform'
        },
        command: '/bin/cat',
        args: [],
        env: {},
        cwd: process.cwd(),
        ioMode: 'stdio'
      };

      externalWrapper = new ExternalServerWrapper(kernel, hostess, externalManifest);
      await externalWrapper.spawn();

      // List all endpoints
      const endpoints = hostess.listEndpoints();

      // Should have at least 3 endpoints (2 inproc + 1 external)
      expect(endpoints.size).toBeGreaterThanOrEqual(3);

      const types = new Set(Array.from(endpoints.values()).map(ep => ep.type));
      expect(types.has('inproc')).toBe(true);
      expect(types.has('external')).toBe(true);
    });
  });

  describe('Endpoint lifecycle', () => {
    it('should maintain endpoints after executor restart', async () => {
      const config: TopologyConfig = {
        nodes: [
          { id: 'timer1', module: 'TimerSource' }
        ],
        connections: []
      };

      executor.load(config);
      await executor.up();

      const endpointsBefore = hostess.listEndpoints();
      expect(endpointsBefore.size).toBeGreaterThanOrEqual(1);

      await executor.restartNode('timer1');

      const endpointsAfter = hostess.listEndpoints();
      // After restart, should still have endpoints (may have more due to re-registration)
      expect(endpointsAfter.size).toBeGreaterThanOrEqual(1);
    });
  });
});
