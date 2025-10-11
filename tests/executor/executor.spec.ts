import { describe, it, expect, beforeEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { StateManager } from '../../src/state/StateManager.js';
import { Executor } from '../../src/executor/Executor.js';
import type { TopologyConfig } from '../../src/config/schema.js';

describe('Executor', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let stateManager: StateManager;
  let executor: Executor;

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
    stateManager = new StateManager(kernel);
    executor = new Executor(kernel, hostess, stateManager);
  });

  it('should load configuration', () => {
    const config: TopologyConfig = {
      nodes: [
        { id: 'timer1', module: 'TimerSource', params: { periodMs: 500 } }
      ],
      connections: []
    };

    expect(() => executor.load(config)).not.toThrow();
  });

  it('should throw if up() called without load()', async () => {
    await expect(executor.up()).rejects.toThrow('No configuration loaded');
  });

  it('should instantiate modules and register with hostess', async () => {
    const config: TopologyConfig = {
      nodes: [
        { id: 'timer1', module: 'TimerSource', params: { periodMs: 500 } },
        { id: 'sink1', module: 'ConsoleSink', params: { prefix: '[test]' } }
      ],
      connections: []
    };

    executor.load(config);
    await executor.up();

    const services = hostess.list();
    expect(services).toHaveLength(2);
    expect(services.find(s => s.servername === 'timer1')).toBeDefined();
    expect(services.find(s => s.servername === 'sink1')).toBeDefined();

    await executor.down();
  });

  it('should wire connections via StateManager', async () => {
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

    const topology = stateManager.getTopology();
    expect(topology.nodes).toHaveLength(3);
    expect(topology.connections).toHaveLength(2);

    await executor.down();
  });

  it('should support restartNode', async () => {
    const config: TopologyConfig = {
      nodes: [
        { id: 'timer1', module: 'TimerSource', params: { periodMs: 500 } }
      ],
      connections: []
    };

    executor.load(config);
    await executor.up();

    await expect(executor.restartNode('timer1')).resolves.not.toThrow();

    await executor.down();
  });

  it('should throw on restartNode for non-existent node', async () => {
    const config: TopologyConfig = {
      nodes: [],
      connections: []
    };

    executor.load(config);
    await executor.up();

    await expect(executor.restartNode('nonexistent')).rejects.toThrow('Node not found');

    await executor.down();
  });
});
