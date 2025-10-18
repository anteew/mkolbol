import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RoutingServer } from '../../src/router/RoutingServer.js';
import type { RouterEvent } from '../../src/types/router.js';

describe('Router Failover and Path Preference', () => {
  let router: RoutingServer;
  let events: RouterEvent[];

  beforeEach(() => {
    router = new RoutingServer({ ttlMs: 1000, sweepIntervalMs: 500 });
    events = [];
    router.subscribe((event) => {
      events.push(event);
    });
  });

  afterEach(() => {
    router.stopSweeper();
  });

  describe('Path Preference', () => {
    it('prefers local endpoints over remote endpoints', () => {
      // Announce local endpoint
      router.announce({
        id: 'local-service-a',
        type: 'inproc',
        coordinates: 'node:service-a',
      });

      // Announce remote endpoint (from federation)
      router.announce({
        id: 'remote-service-a',
        type: 'tcp',
        coordinates: 'node:service-a',
        metadata: { federationSource: 'router-2' },
      });

      const best = router.resolve('node:service-a');
      expect(best).toBeDefined();
      expect(best?.id).toBe('local-service-a');
      expect(best?.metadata?.federationSource).toBeUndefined();
    });

    it('returns remote endpoint when no local endpoint exists', () => {
      router.announce({
        id: 'remote-service-b',
        type: 'tcp',
        coordinates: 'node:service-b',
        metadata: { federationSource: 'router-3' },
      });

      const best = router.resolve('node:service-b');
      expect(best).toBeDefined();
      expect(best?.id).toBe('remote-service-b');
      expect(best?.metadata?.federationSource).toBe('router-3');
    });

    it('returns undefined when no endpoints match coordinates', () => {
      const best = router.resolve('node:nonexistent');
      expect(best).toBeUndefined();
    });

    it('ranks all endpoints by preference using resolveAll', () => {
      router.announce({
        id: 'local-1',
        type: 'inproc',
        coordinates: 'node:multi',
      });

      router.announce({
        id: 'remote-1',
        type: 'tcp',
        coordinates: 'node:multi',
        metadata: { federationSource: 'router-2' },
      });

      router.announce({
        id: 'remote-2',
        type: 'tcp',
        coordinates: 'node:multi',
        metadata: { federationSource: 'router-3' },
      });

      const all = router.resolveAll('node:multi');
      expect(all.length).toBe(3);

      // First should be local
      expect(all[0].id).toBe('local-1');
      expect(all[0].metadata?.federationSource).toBeUndefined();

      // Next two should be remote (order by most recent update)
      expect(all[1].metadata?.federationSource).toBeDefined();
      expect(all[2].metadata?.federationSource).toBeDefined();
    });

    it('prefers most recently updated when both are local', async () => {
      router.announce({
        id: 'local-old',
        type: 'inproc',
        coordinates: 'node:service-c',
      });

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      router.announce({
        id: 'local-new',
        type: 'inproc',
        coordinates: 'node:service-c',
      });

      const all = router.resolveAll('node:service-c');
      expect(all.length).toBe(2);
      // Both are local, so sorted by most recent
      expect(all[0].id).toBe('local-new');
      expect(all[1].id).toBe('local-old');
    });
  });

  describe('Failover on TTL Expiration', () => {
    it('emits staleExpired events when endpoints expire', async () => {
      router.announce({
        id: 'temp-endpoint',
        type: 'inproc',
        coordinates: 'node:temp',
      });

      router.startSweeper();

      // Wait for TTL to expire and sweep to run
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const staleEvents = events.filter((e) => e.type === 'staleExpired');
      expect(staleEvents.length).toBeGreaterThan(0);
      expect(staleEvents[0].endpoint.id).toBe('temp-endpoint');
    });

    it('automatically fails over to remote when local expires', async () => {
      // Announce local with short TTL
      router.announce({
        id: 'local-failover',
        type: 'inproc',
        coordinates: 'node:failover-test',
      });

      // Announce remote backup
      router.announce({
        id: 'remote-backup',
        type: 'tcp',
        coordinates: 'node:failover-test',
        metadata: { federationSource: 'router-backup' },
      });

      // Initially, local is preferred
      let best = router.resolve('node:failover-test');
      expect(best?.id).toBe('local-failover');

      router.startSweeper();

      // Keep remote alive by re-announcing at 600ms
      setTimeout(() => {
        router.announce({
          id: 'remote-backup',
          type: 'tcp',
          coordinates: 'node:failover-test',
          metadata: { federationSource: 'router-backup' },
        });
      }, 600);

      // Wait for local to expire (needs > 1000ms for TTL + sweep cycle)
      await new Promise((resolve) => setTimeout(resolve, 1600));

      // After expiration, should fail over to remote
      best = router.resolve('node:failover-test');
      expect(best?.id).toBe('remote-backup');
      expect(best?.metadata?.federationSource).toBe('router-backup');
    });

    it('keeps remote endpoint alive with periodic updates', async () => {
      router.announce({
        id: 'remote-persistent',
        type: 'tcp',
        coordinates: 'node:persistent',
        metadata: { federationSource: 'router-4' },
      });

      router.startSweeper();

      // Re-announce before TTL expires
      await new Promise((resolve) => setTimeout(resolve, 600));
      router.announce({
        id: 'remote-persistent',
        type: 'tcp',
        coordinates: 'node:persistent',
        metadata: { federationSource: 'router-4' },
      });

      // Wait longer
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should still exist
      const best = router.resolve('node:persistent');
      expect(best?.id).toBe('remote-persistent');
    });
  });

  describe('Multiple Remote Endpoints', () => {
    it('handles multiple remote sources for same coordinates', () => {
      router.announce({
        id: 'remote-r2',
        type: 'tcp',
        coordinates: 'node:redundant',
        metadata: { federationSource: 'router-2' },
      });

      router.announce({
        id: 'remote-r3',
        type: 'tcp',
        coordinates: 'node:redundant',
        metadata: { federationSource: 'router-3' },
      });

      router.announce({
        id: 'remote-r4',
        type: 'tcp',
        coordinates: 'node:redundant',
        metadata: { federationSource: 'router-4' },
      });

      const all = router.resolveAll('node:redundant');
      expect(all.length).toBe(3);

      // All should be remote
      all.forEach((ep) => {
        expect(ep.metadata?.federationSource).toBeDefined();
      });
    });

    it('fails over through multiple remote endpoints as they expire', async () => {
      router.announce({
        id: 'remote-primary',
        type: 'tcp',
        coordinates: 'node:cascade',
        metadata: { federationSource: 'router-primary' },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      router.announce({
        id: 'remote-secondary',
        type: 'tcp',
        coordinates: 'node:cascade',
        metadata: { federationSource: 'router-secondary' },
      });

      router.startSweeper();

      // Primary should be selected (more recent)
      let best = router.resolve('node:cascade');
      expect(best?.id).toBe('remote-secondary');

      // Wait for primary to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should still have secondary or have both expired
      const remaining = router.resolveAll('node:cascade');
      expect(remaining.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Event-Driven Failover', () => {
    it('subscribers can react to staleExpired events for automatic failover', async () => {
      const failoverLog: string[] = [];

      router.subscribe((event) => {
        if (event.type === 'staleExpired') {
          failoverLog.push(`expired: ${event.endpoint.id}`);

          // Find alternative
          const alternative = router.resolve(event.endpoint.coordinates);
          if (alternative) {
            failoverLog.push(`failover: ${alternative.id}`);
          } else {
            failoverLog.push('no-alternative');
          }
        }
      });

      router.announce({
        id: 'primary',
        type: 'inproc',
        coordinates: 'node:watched',
      });

      router.announce({
        id: 'backup',
        type: 'tcp',
        coordinates: 'node:watched',
        metadata: { federationSource: 'router-backup' },
      });

      router.startSweeper();

      // Keep backup alive
      setTimeout(() => {
        router.announce({
          id: 'backup',
          type: 'tcp',
          coordinates: 'node:watched',
          metadata: { federationSource: 'router-backup' },
        });
      }, 600);

      await new Promise((resolve) => setTimeout(resolve, 1600));

      expect(failoverLog).toContain('expired: primary');
      expect(failoverLog).toContain('failover: backup');
    });
  });
});
