import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { StateManager } from '../../src/state/StateManager.js';
import { Executor } from '../../src/executor/Executor.js';
import type { TopologyConfig } from '../../src/config/schema.js';

describe('Worker Mode Integration', () => {
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

  // GATED: Worker mode test requires worker harness infrastructure
  // Only run when MK_WORKER_EXPERIMENTAL=1 is set
  it.skipIf(!process.env.MK_WORKER_EXPERIMENTAL)('should execute Timer → Worker(Uppercase) → Console topology', async () => {
    const config: TopologyConfig = {
      nodes: [
        { 
          id: 'timer-source', 
          module: 'TimerSource', 
          params: { periodMs: 200 },
          runMode: 'inproc'
        },
        { 
          id: 'uppercase-worker', 
          module: 'UppercaseTransform',
          runMode: 'worker'
        },
        { 
          id: 'console-sink', 
          module: 'ConsoleSink', 
          params: { prefix: '[WORKER-TEST]' },
          runMode: 'inproc'
        }
      ],
      connections: [
        { from: 'timer-source.output', to: 'uppercase-worker.input' },
        { from: 'uppercase-worker.output', to: 'console-sink.input' }
      ]
    };

    executor.load(config);
    await executor.up();

    // Verify all nodes are registered
    const state = stateManager.getState();
    expect(state.nodes).toHaveLength(3);

    const timerNode = state.nodes.find((n: any) => n.id === 'timer-source');
    const workerNode = state.nodes.find((n: any) => n.id === 'uppercase-worker');
    const sinkNode = state.nodes.find((n: any) => n.id === 'console-sink');

    expect(timerNode).toBeDefined();
    expect(timerNode.location).toBe('inproc');

    expect(workerNode).toBeDefined();
    expect(workerNode.location).toBe('worker');

    expect(sinkNode).toBeDefined();
    expect(sinkNode.location).toBe('inproc');

    // Verify endpoints are registered
    const endpoints = hostess.listEndpoints();
    const endpointEntries = Array.from(endpoints.entries());
    
    const timerEndpoint = endpointEntries.find(([_, ep]) => ep.coordinates === 'node:timer-source');
    const workerEndpoint = endpointEntries.find(([_, ep]) => ep.coordinates === 'node:uppercase-worker');
    const sinkEndpoint = endpointEntries.find(([_, ep]) => ep.coordinates === 'node:console-sink');

    expect(timerEndpoint).toBeDefined();
    expect(timerEndpoint![1].type).toBe('inproc');
    expect(timerEndpoint![1].metadata?.runMode).toBe('inproc');

    expect(workerEndpoint).toBeDefined();
    expect(workerEndpoint![1].type).toBe('worker');
    expect(workerEndpoint![1].metadata?.runMode).toBe('worker');
    expect(workerEndpoint![1].metadata?.module).toBe('UppercaseTransform');

    expect(sinkEndpoint).toBeDefined();
    expect(sinkEndpoint![1].type).toBe('inproc');

    // Let data flow through the topology
    await new Promise(resolve => setTimeout(resolve, 800));

    // Clean shutdown
    await executor.down();

    // Verify clean teardown
    const endpointsAfter = hostess.listEndpoints();
    expect(endpointsAfter.size).toBe(0);
  }, testTimeout);

  it.skipIf(!process.env.MK_WORKER_EXPERIMENTAL)('should handle worker node lifecycle (up → run → down)', async () => {
    const config: TopologyConfig = {
      nodes: [
        { 
          id: 'worker-node', 
          module: 'UppercaseTransform',
          runMode: 'worker'
        }
      ],
      connections: []
    };

    executor.load(config);
    
    // UP phase
    await executor.up();
    
    const stateAfterUp = stateManager.getState();
    const workerNode = stateAfterUp.nodes.find((n: any) => n.id === 'worker-node');
    expect(workerNode).toBeDefined();
    expect(workerNode.location).toBe('worker');

    const endpointsAfterUp = hostess.listEndpoints();
    expect(endpointsAfterUp.size).toBeGreaterThanOrEqual(1);

    // RUN phase (worker should be operational)
    await new Promise(resolve => setTimeout(resolve, 200));

    // DOWN phase
    await executor.down();

    const endpointsAfterDown = hostess.listEndpoints();
    expect(endpointsAfterDown.size).toBe(0);
  }, testTimeout);

  it.skipIf(!process.env.MK_WORKER_EXPERIMENTAL)('should support mixed inproc and worker nodes', async () => {
    const config: TopologyConfig = {
      nodes: [
        { id: 'timer-1', module: 'TimerSource', params: { periodMs: 300 }, runMode: 'inproc' },
        { id: 'upper-worker', module: 'UppercaseTransform', runMode: 'worker' },
        { id: 'upper-inproc', module: 'UppercaseTransform', runMode: 'inproc' },
        { id: 'sink-1', module: 'ConsoleSink', params: { prefix: '[WORKER]' }, runMode: 'inproc' },
        { id: 'sink-2', module: 'ConsoleSink', params: { prefix: '[INPROC]' }, runMode: 'inproc' }
      ],
      connections: [
        { from: 'timer-1.output', to: 'upper-worker.input' },
        { from: 'timer-1.output', to: 'upper-inproc.input' },
        { from: 'upper-worker.output', to: 'sink-1.input' },
        { from: 'upper-inproc.output', to: 'sink-2.input' }
      ]
    };

    executor.load(config);
    await executor.up();

    const state = stateManager.getState();
    expect(state.nodes).toHaveLength(5);

    const workerNodes = state.nodes.filter((n: any) => n.location === 'worker');
    const inprocNodes = state.nodes.filter((n: any) => n.location === 'inproc');

    expect(workerNodes).toHaveLength(1);
    expect(inprocNodes).toHaveLength(4);

    const endpoints = hostess.listEndpoints();
    const types = new Set(Array.from(endpoints.values()).map(ep => ep.type));
    
    expect(types.has('inproc')).toBe(true);
    expect(types.has('worker')).toBe(true);

    // Let topology run
    await new Promise(resolve => setTimeout(resolve, 600));

    await executor.down();
  }, testTimeout);
});
