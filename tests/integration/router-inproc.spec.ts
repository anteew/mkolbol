import { describe, it, expect, afterEach } from 'vitest';
import { RoutingServer } from '../../src/router/RoutingServer.js';
import type { RoutingAnnouncement } from '../../src/types.js';

describe('RoutingServer (in-process)', () => {
  const baseAnnouncement: RoutingAnnouncement = {
    id: 'console.out',
    type: 'output',
    coordinates: 'node:console1',
    metadata: { module: 'ConsoleSink', runMode: 'inproc' },
  };

  let router: RoutingServer | undefined;

  afterEach(() => {
    router?.stopSweeper();
    router = undefined;
  });

  it('stores announcements and returns copies via list()', () => {
    router = new RoutingServer();

    router.announce(baseAnnouncement);

    const endpoints = router.list();
    expect(endpoints).toHaveLength(1);

    const endpoint = endpoints[0];
    expect(endpoint.id).toBe(baseAnnouncement.id);
    expect(endpoint.type).toBe(baseAnnouncement.type);
    expect(endpoint.coordinates).toBe(baseAnnouncement.coordinates);
    expect(endpoint.metadata).toEqual(baseAnnouncement.metadata);
    expect(endpoint.announcedAt).toBeGreaterThan(0);
    expect(endpoint.updatedAt).toBeGreaterThanOrEqual(endpoint.announcedAt);

    endpoint.metadata!.module = 'Mutated';
    expect(router.list()[0].metadata?.module).toBe('ConsoleSink');
  });

  it('is idempotent and updates timestamps and metadata', async () => {
    router = new RoutingServer();

    router.announce(baseAnnouncement);
    const first = router.list()[0];

    const updatedAnnouncement: RoutingAnnouncement = {
      ...baseAnnouncement,
      metadata: { module: 'ConsoleSink', runMode: 'inproc', version: '1.1.0' },
    };

    await new Promise((resolve) => setTimeout(resolve, 5));
    router.announce(updatedAnnouncement);

    const second = router.list()[0];
    expect(second.announcedAt).toBe(first.announcedAt);
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt);
    expect(second.metadata).toEqual(updatedAnnouncement.metadata);
  });

  it('withdraw removes endpoints', () => {
    router = new RoutingServer();

    router.announce(baseAnnouncement);
    router.withdraw(baseAnnouncement.id);

    expect(router.list()).toHaveLength(0);
    expect(() => router.withdraw(baseAnnouncement.id)).not.toThrow();
  });

  it('sweep removes stale endpoints based on TTL', async () => {
    router = new RoutingServer({ ttlMs: 100, sweepIntervalMs: 50 });

    router.announce(baseAnnouncement);
    expect(router.list()).toHaveLength(1);

    await new Promise((resolve) => setTimeout(resolve, 150));
    router.sweep();

    expect(router.list()).toHaveLength(0);
  });

  it('sweep keeps fresh endpoints', async () => {
    router = new RoutingServer({ ttlMs: 200, sweepIntervalMs: 50 });

    router.announce(baseAnnouncement);
    await new Promise((resolve) => setTimeout(resolve, 50));
    router.announce(baseAnnouncement);
    await new Promise((resolve) => setTimeout(resolve, 50));
    router.sweep();

    expect(router.list()).toHaveLength(1);
  });

  it('startSweeper automatically removes stale endpoints', async () => {
    router = new RoutingServer({ ttlMs: 100, sweepIntervalMs: 60 });

    router.announce(baseAnnouncement);
    router.startSweeper();

    expect(router.list()).toHaveLength(1);

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(router.list()).toHaveLength(0);
  });

  it('stopSweeper halts automatic cleanup', async () => {
    router = new RoutingServer({ ttlMs: 100, sweepIntervalMs: 50 });

    router.announce(baseAnnouncement);
    router.startSweeper();
    router.stopSweeper();

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(router.list()).toHaveLength(1);
  });

  it('allows multiple startSweeper calls without error', () => {
    router = new RoutingServer();
    router.startSweeper();
    router.startSweeper();
    router.startSweeper();
    expect(() => router.stopSweeper()).not.toThrow();
  });

  it('heartbeat keeps endpoint alive', async () => {
    router = new RoutingServer({ ttlMs: 150, sweepIntervalMs: 200 });

    router.announce(baseAnnouncement);
    router.startSweeper();

    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      router.announce(baseAnnouncement);
    }

    expect(router.list()).toHaveLength(1);
  });

  describe('Sweeper Metrics', () => {
    it('initializes metrics to zero', () => {
      router = new RoutingServer();
      const metrics = router.getSweeperMetrics();

      expect(metrics.totalSweeps).toBe(0);
      expect(metrics.totalRemoved).toBe(0);
      expect(metrics.lastSweepTime).toBeNull();
    });

    it('tracks totalSweeps after each sweep', () => {
      router = new RoutingServer({ ttlMs: 1000, sweepIntervalMs: 100 });

      router.sweep();
      expect(router.getSweeperMetrics().totalSweeps).toBe(1);

      router.sweep();
      expect(router.getSweeperMetrics().totalSweeps).toBe(2);

      router.sweep();
      expect(router.getSweeperMetrics().totalSweeps).toBe(3);
    });

    it('tracks totalRemoved across multiple sweeps', async () => {
      router = new RoutingServer({ ttlMs: 50, sweepIntervalMs: 100 });

      router.announce({ ...baseAnnouncement, id: 'ep1' });
      router.announce({ ...baseAnnouncement, id: 'ep2' });

      await new Promise((resolve) => setTimeout(resolve, 100));
      router.sweep();

      let metrics = router.getSweeperMetrics();
      expect(metrics.totalSweeps).toBe(1);
      expect(metrics.totalRemoved).toBe(2);

      router.announce({ ...baseAnnouncement, id: 'ep3' });
      router.announce({ ...baseAnnouncement, id: 'ep4' });
      router.announce({ ...baseAnnouncement, id: 'ep5' });

      await new Promise((resolve) => setTimeout(resolve, 100));
      router.sweep();

      metrics = router.getSweeperMetrics();
      expect(metrics.totalSweeps).toBe(2);
      expect(metrics.totalRemoved).toBe(5);
    });

    it('updates lastSweepTime on each sweep', async () => {
      router = new RoutingServer({ ttlMs: 1000, sweepIntervalMs: 100 });

      const beforeFirstSweep = Date.now();
      router.sweep();
      const afterFirstSweep = Date.now();

      let metrics = router.getSweeperMetrics();
      expect(metrics.lastSweepTime).not.toBeNull();
      expect(metrics.lastSweepTime).toBeGreaterThanOrEqual(beforeFirstSweep);
      expect(metrics.lastSweepTime).toBeLessThanOrEqual(afterFirstSweep);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const beforeSecondSweep = Date.now();
      router.sweep();
      const afterSecondSweep = Date.now();

      metrics = router.getSweeperMetrics();
      expect(metrics.lastSweepTime).toBeGreaterThanOrEqual(beforeSecondSweep);
      expect(metrics.lastSweepTime).toBeLessThanOrEqual(afterSecondSweep);
    });

    it('does not mutate returned metrics object', () => {
      router = new RoutingServer();

      const metrics1 = router.getSweeperMetrics();
      router.sweep();
      const metrics2 = router.getSweeperMetrics();

      expect(metrics1.totalSweeps).toBe(0);
      expect(metrics2.totalSweeps).toBe(1);
    });

    it('tracks metrics with automatic sweeper', async () => {
      router = new RoutingServer({ ttlMs: 100, sweepIntervalMs: 60 });

      router.announce({ ...baseAnnouncement, id: 'ep1' });
      router.announce({ ...baseAnnouncement, id: 'ep2' });

      router.startSweeper();

      await new Promise((resolve) => setTimeout(resolve, 200));

      const metrics = router.getSweeperMetrics();
      expect(metrics.totalSweeps).toBeGreaterThanOrEqual(2);
      expect(metrics.totalRemoved).toBeGreaterThanOrEqual(2);
      expect(metrics.lastSweepTime).not.toBeNull();
    });

    it('continues tracking after removing no endpoints', () => {
      router = new RoutingServer({ ttlMs: 1000, sweepIntervalMs: 100 });

      router.announce(baseAnnouncement);

      router.sweep();
      expect(router.getSweeperMetrics().totalSweeps).toBe(1);
      expect(router.getSweeperMetrics().totalRemoved).toBe(0);

      router.sweep();
      expect(router.getSweeperMetrics().totalSweeps).toBe(2);
      expect(router.getSweeperMetrics().totalRemoved).toBe(0);
    });
  });
});
