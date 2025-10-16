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
});
