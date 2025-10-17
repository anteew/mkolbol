import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { StateManager } from '../../src/state/StateManager.js';
import { Executor } from '../../src/executor/Executor.js';
import { RoutingServer } from '../../src/router/RoutingServer.js';
import type { TopologyConfig } from '../../src/config/schema.js';

describe('Executor → RoutingServer integration', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let stateManager: StateManager;
  let executor: Executor;
  let router: RoutingServer;

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
    stateManager = new StateManager(kernel);
    executor = new Executor(kernel, hostess, stateManager);
    router = new RoutingServer();
    executor.setRoutingServer(router);
  });

  afterEach(async () => {
    await executor.down();
  });

  it('announces endpoints when topology starts and withdraws on shutdown', async () => {
    const config: TopologyConfig = {
      nodes: [
        { id: 'timer1', module: 'TimerSource', params: { periodMs: 100 } },
        { id: 'sink1', module: 'ConsoleSink', params: { prefix: '[router]' } },
      ],
      connections: [{ from: 'timer1.output', to: 'sink1.input' }],
    };

    executor.load(config);
    await executor.up();

    const endpoints = router.list();
    expect(endpoints).toHaveLength(2);

    const ids = endpoints.map((ep) => ep.id);
    expect(ids.length).toBe(new Set(ids).size);

    const timerEndpoint = endpoints.find((ep) => ep.coordinates === 'node:timer1');
    expect(timerEndpoint?.metadata?.module).toBe('TimerSource');
    expect(timerEndpoint?.type).toBe('inproc');

    await executor.down();

    expect(router.list()).toHaveLength(0);
  });

  it('updates routing entry on restart', async () => {
    const config: TopologyConfig = {
      nodes: [{ id: 'timer1', module: 'TimerSource', params: { periodMs: 50 } }],
      connections: [],
    };

    executor.load(config);
    await executor.up();

    const first = router.list()[0];
    expect(first).toBeDefined();

    await executor.restartNode('timer1');

    const endpoints = router.list();
    expect(endpoints).toHaveLength(1);
    const second = endpoints[0];
    expect(second.id).not.toBe(first.id);
    expect(second.announcedAt).toBeGreaterThanOrEqual(first.announcedAt);
  });

  it('sends periodic heartbeats to router when enabled', async () => {
    const config: TopologyConfig = {
      nodes: [{ id: 'timer1', module: 'TimerSource', params: { periodMs: 200 } }],
      connections: [],
    };

    executor.setRouterHeartbeatConfig({ enabled: true, intervalMs: 100 });
    executor.load(config);
    await executor.up();

    const firstSnapshot = router.list()[0];
    const firstUpdated = firstSnapshot.updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 250));

    const secondSnapshot = router.list()[0];
    expect(secondSnapshot.updatedAt).toBeGreaterThan(firstUpdated);
  });

  it('stops heartbeats on shutdown', async () => {
    const config: TopologyConfig = {
      nodes: [{ id: 'timer1', module: 'TimerSource', params: { periodMs: 100 } }],
      connections: [],
    };

    executor.setRouterHeartbeatConfig({ enabled: true, intervalMs: 50 });
    executor.load(config);
    await executor.up();

    await executor.down();

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(router.list()).toHaveLength(0);
  });

  it('does not send heartbeats when disabled', async () => {
    const config: TopologyConfig = {
      nodes: [{ id: 'timer1', module: 'TimerSource', params: { periodMs: 100 } }],
      connections: [],
    };

    executor.setRouterHeartbeatConfig({ enabled: false });
    executor.load(config);
    await executor.up();

    const firstSnapshot = router.list()[0];
    const firstUpdated = firstSnapshot.updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 200));

    const secondSnapshot = router.list()[0];
    expect(secondSnapshot.updatedAt).toBe(firstUpdated);
  });
});
