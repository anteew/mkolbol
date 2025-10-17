import { describe, it, expect, afterEach } from 'vitest';
import { RoutingServer } from '../../src/router/RoutingServer.js';
import type { RoutingAnnouncement } from '../../src/types.js';

describe('RoutingServer TTL and Expiry', () => {
  const baseAnnouncement: RoutingAnnouncement = {
    id: 'test.endpoint',
    type: 'output',
    coordinates: 'node:test1',
    metadata: { module: 'TestModule', runMode: 'inproc' },
  };

  let router: RoutingServer | undefined;

  afterEach(() => {
    router?.stopSweeper();
    router = undefined;
  });

  describe('expiresAt field', () => {
    it('calculates expiresAt = announcedAt + ttlMs on first announce', () => {
      router = new RoutingServer({ ttlMs: 30000 });

      const beforeAnnounce = Date.now();
      router.announce(baseAnnouncement);
      const afterAnnounce = Date.now();

      const endpoints = router.list();
      expect(endpoints).toHaveLength(1);

      const endpoint = endpoints[0];
      expect(endpoint.expiresAt).toBeDefined();
      expect(endpoint.expiresAt).toBeGreaterThanOrEqual(beforeAnnounce + 30000);
      expect(endpoint.expiresAt).toBeLessThanOrEqual(afterAnnounce + 30000);
      expect(endpoint.expiresAt).toBe(endpoint.announcedAt + 30000);
    });

    it('updates expiresAt on subsequent announces', async () => {
      router = new RoutingServer({ ttlMs: 5000 });

      router.announce(baseAnnouncement);
      const first = router.list()[0];

      await new Promise((resolve) => setTimeout(resolve, 100));

      router.announce(baseAnnouncement);
      const second = router.list()[0];

      expect(second.expiresAt).toBeGreaterThan(first.expiresAt);
      expect(second.expiresAt).toBe(second.updatedAt + 5000);
    });

    it('includes expiresAt in list() snapshots', () => {
      router = new RoutingServer({ ttlMs: 10000 });

      router.announce(baseAnnouncement);
      const snapshot = router.list()[0];

      expect(snapshot).toHaveProperty('expiresAt');
      expect(typeof snapshot.expiresAt).toBe('number');
      expect(snapshot.expiresAt).toBeGreaterThan(Date.now());
    });

    it('uses custom ttlMs value for expiresAt calculation', () => {
      router = new RoutingServer({ ttlMs: 15000 });

      const beforeAnnounce = Date.now();
      router.announce(baseAnnouncement);
      const afterAnnounce = Date.now();

      const endpoint = router.list()[0];
      expect(endpoint.expiresAt).toBeGreaterThanOrEqual(beforeAnnounce + 15000);
      expect(endpoint.expiresAt).toBeLessThanOrEqual(afterAnnounce + 15000);
    });

    it('uses default ttlMs (30000) when not specified', () => {
      router = new RoutingServer();

      const beforeAnnounce = Date.now();
      router.announce(baseAnnouncement);
      const afterAnnounce = Date.now();

      const endpoint = router.list()[0];
      expect(endpoint.expiresAt).toBeGreaterThanOrEqual(beforeAnnounce + 30000);
      expect(endpoint.expiresAt).toBeLessThanOrEqual(afterAnnounce + 30000);
    });

    it('returns defensive copies with expiresAt', () => {
      router = new RoutingServer({ ttlMs: 10000 });

      router.announce(baseAnnouncement);
      const snapshot1 = router.list()[0];
      const snapshot2 = router.list()[0];

      expect(snapshot1.expiresAt).toBe(snapshot2.expiresAt);
      expect(snapshot1).not.toBe(snapshot2);
    });
  });

  describe('TTL expiry semantics', () => {
    it('removes endpoint when updatedAt + ttlMs < now', async () => {
      router = new RoutingServer({ ttlMs: 100, sweepIntervalMs: 50 });

      router.announce(baseAnnouncement);
      expect(router.list()).toHaveLength(1);

      const endpoint = router.list()[0];
      const expectedExpiry = endpoint.expiresAt;

      await new Promise((resolve) => setTimeout(resolve, 150));
      
      expect(Date.now()).toBeGreaterThan(expectedExpiry);
      router.sweep();

      expect(router.list()).toHaveLength(0);
    });

    it('keeps endpoint when updatedAt + ttlMs > now', async () => {
      router = new RoutingServer({ ttlMs: 500, sweepIntervalMs: 100 });

      router.announce(baseAnnouncement);
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const endpoint = router.list()[0];
      expect(Date.now()).toBeLessThan(endpoint.expiresAt);
      
      router.sweep();
      expect(router.list()).toHaveLength(1);
    });

    it('automatic sweeper removes expired endpoints', async () => {
      router = new RoutingServer({ ttlMs: 100, sweepIntervalMs: 60 });

      router.announce(baseAnnouncement);
      const endpoint = router.list()[0];
      
      router.startSweeper();
      expect(router.list()).toHaveLength(1);

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(Date.now()).toBeGreaterThan(endpoint.expiresAt);
      expect(router.list()).toHaveLength(0);
    });

    it('heartbeat updates extend expiresAt and prevent expiry', async () => {
      router = new RoutingServer({ ttlMs: 150, sweepIntervalMs: 200 });

      router.announce(baseAnnouncement);
      const firstExpiry = router.list()[0].expiresAt;

      await new Promise((resolve) => setTimeout(resolve, 80));
      router.announce(baseAnnouncement);
      const secondExpiry = router.list()[0].expiresAt;

      expect(secondExpiry).toBeGreaterThan(firstExpiry);

      await new Promise((resolve) => setTimeout(resolve, 80));
      router.announce(baseAnnouncement);
      const thirdExpiry = router.list()[0].expiresAt;

      expect(thirdExpiry).toBeGreaterThan(secondExpiry);
      expect(router.list()).toHaveLength(1);
    });

    it('multiple endpoints expire independently', async () => {
      router = new RoutingServer({ ttlMs: 100, sweepIntervalMs: 50 });

      router.announce({ ...baseAnnouncement, id: 'ep1' });
      await new Promise((resolve) => setTimeout(resolve, 50));
      router.announce({ ...baseAnnouncement, id: 'ep2' });
      await new Promise((resolve) => setTimeout(resolve, 60));
      
      router.sweep();
      
      const remaining = router.list();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('ep2');
    });

    it('expiresAt correctly reflects last update time', async () => {
      router = new RoutingServer({ ttlMs: 1000 });

      router.announce(baseAnnouncement);
      const first = router.list()[0];
      expect(first.expiresAt).toBe(first.updatedAt + 1000);

      await new Promise((resolve) => setTimeout(resolve, 100));
      router.announce(baseAnnouncement);
      const second = router.list()[0];
      
      expect(second.announcedAt).toBe(first.announcedAt);
      expect(second.updatedAt).toBeGreaterThan(first.updatedAt);
      expect(second.expiresAt).toBe(second.updatedAt + 1000);
      expect(second.expiresAt).toBeGreaterThan(first.expiresAt);
    });
  });

  describe('Sweep behavior verification', () => {
    it('verifies sweeper uses updatedAt for age calculation', async () => {
      router = new RoutingServer({ ttlMs: 200, sweepIntervalMs: 100 });

      router.announce(baseAnnouncement);
      const firstEndpoint = router.list()[0];

      await new Promise((resolve) => setTimeout(resolve, 150));
      router.announce(baseAnnouncement);
      const secondEndpoint = router.list()[0];

      expect(secondEndpoint.announcedAt).toBe(firstEndpoint.announcedAt);
      expect(secondEndpoint.updatedAt).toBeGreaterThan(firstEndpoint.updatedAt);

      await new Promise((resolve) => setTimeout(resolve, 100));
      router.sweep();

      expect(router.list()).toHaveLength(1);
    });

    it('emits stale withdrawal debug events on expiry', async () => {
      router = new RoutingServer({ ttlMs: 50, sweepIntervalMs: 100 });

      router.announce(baseAnnouncement);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const beforeSweep = router.list();
      expect(beforeSweep).toHaveLength(1);

      router.sweep();

      const afterSweep = router.list();
      expect(afterSweep).toHaveLength(0);

      const metrics = router.getSweeperMetrics();
      expect(metrics.totalRemoved).toBe(1);
    });

    it('sweeper respects expiresAt boundaries', async () => {
      router = new RoutingServer({ ttlMs: 200, sweepIntervalMs: 50 });

      router.announce({ ...baseAnnouncement, id: 'ep1' });
      const ep1Expiry = router.list().find(e => e.id === 'ep1')!.expiresAt;

      await new Promise((resolve) => setTimeout(resolve, 100));
      router.announce({ ...baseAnnouncement, id: 'ep2' });
      const ep2Expiry = router.list().find(e => e.id === 'ep2')!.expiresAt;

      expect(ep2Expiry).toBeGreaterThan(ep1Expiry);

      await new Promise((resolve) => setTimeout(resolve, 120));
      
      const now = Date.now();
      expect(now).toBeGreaterThan(ep1Expiry);
      expect(now).toBeLessThan(ep2Expiry);

      router.sweep();

      const remaining = router.list();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('ep2');
    });
  });
});
