import { debug } from '../debug/api.js';
import type { RoutingAnnouncement, RoutingEndpoint } from '../types.js';
import type { RouterEvent, RouterEventCallback } from '../types/router.js';
import { EventEmitter } from 'events';

export interface RoutingServerConfig {
  ttlMs?: number;
  sweepIntervalMs?: number;
}

export interface SweeperMetrics {
  totalSweeps: number;
  totalRemoved: number;
  lastSweepTime: number | null;
}

export class RoutingServer extends EventEmitter {
  private endpoints = new Map<string, RoutingEndpoint>();
  private ttlMs: number;
  private sweepIntervalMs: number;
  private sweepTimer?: NodeJS.Timeout;
  private sweeperMetrics: SweeperMetrics = {
    totalSweeps: 0,
    totalRemoved: 0,
    lastSweepTime: null,
  };
  private subscribers = new Set<RouterEventCallback>();

  constructor(config?: RoutingServerConfig) {
    super();
    this.ttlMs = config?.ttlMs ?? 30000;
    this.sweepIntervalMs = config?.sweepIntervalMs ?? 10000;
  }

  announce(announcement: RoutingAnnouncement): void {
    const { id, type, coordinates, metadata } = announcement;
    if (!id) {
      throw new Error('RoutingServer.announce requires an "id"');
    }

    const now = Date.now();
    const expiresAt = now + this.ttlMs;
    const existing = this.endpoints.get(id);
    const endpoint: RoutingEndpoint = existing
      ? {
          ...existing,
          type,
          coordinates,
          metadata: metadata ? { ...metadata } : undefined,
          updatedAt: now,
          expiresAt,
        }
      : {
          id,
          type,
          coordinates,
          metadata: metadata ? { ...metadata } : undefined,
          announcedAt: now,
          updatedAt: now,
          expiresAt,
        };

    const isNew = !existing;
    this.endpoints.set(id, endpoint);
    debug.emit('router', 'announce', { id, type, coordinates, metadata });

    this.emitEvent({
      type: isNew ? 'added' : 'updated',
      endpoint: { ...endpoint },
      timestamp: now,
    });
  }

  withdraw(id: string): void {
    if (!id) return;
    const endpoint = this.endpoints.get(id);
    if (this.endpoints.delete(id)) {
      debug.emit('router', 'withdraw', { id });
      if (endpoint) {
        this.emitEvent({
          type: 'removed',
          endpoint: { ...endpoint },
          timestamp: Date.now(),
        });
      }
    }
  }

  list(): RoutingEndpoint[] {
    return Array.from(this.endpoints.values()).map((endpoint) => ({
      ...endpoint,
      metadata: endpoint.metadata ? { ...endpoint.metadata } : undefined,
    }));
  }

  /**
   * Resolve the best endpoint for given coordinates using path preference.
   * Preference order: local > LAN > WAN (determined by federationSource metadata)
   * Returns the highest-priority endpoint, or undefined if none exist.
   */
  resolve(coordinates: string): RoutingEndpoint | undefined {
    const candidates = this.resolveAll(coordinates);
    return candidates.length > 0 ? candidates[0] : undefined;
  }

  /**
   * Resolve all endpoints for given coordinates, ranked by path preference.
   * Preference order: local > LAN > WAN
   * Local: no federationSource metadata
   * Remote: has federationSource metadata (LAN vs WAN could be distinguished later)
   */
  resolveAll(coordinates: string): RoutingEndpoint[] {
    const matches = Array.from(this.endpoints.values())
      .filter((ep) => ep.coordinates === coordinates)
      .map((endpoint) => ({
        ...endpoint,
        metadata: endpoint.metadata ? { ...endpoint.metadata } : undefined,
      }));

    // Sort by preference: local first, then by federationSource
    return matches.sort((a, b) => {
      const aIsLocal = !a.metadata?.federationSource;
      const bIsLocal = !b.metadata?.federationSource;

      // Local endpoints take priority
      if (aIsLocal && !bIsLocal) return -1;
      if (!aIsLocal && bIsLocal) return 1;

      // Both local or both remote: sort by most recently updated
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    });
  }

  startSweeper(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => {
      this.sweep();
    }, this.sweepIntervalMs);
  }

  stopSweeper(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = undefined;
    }
  }

  sweep(): void {
    const now = Date.now();
    const stale: string[] = [];
    const staleDetails: Array<{ id: string; age: number; type: string }> = [];

    debug.emit('router', 'sweep.start', {
      totalEndpoints: this.endpoints.size,
      ttlMs: this.ttlMs,
      sweepIntervalMs: this.sweepIntervalMs,
    });

    for (const [id, endpoint] of this.endpoints.entries()) {
      const age = now - endpoint.updatedAt;
      if (age > this.ttlMs) {
        stale.push(id);
        staleDetails.push({ id, age, type: endpoint.type });
        debug.emit(
          'router',
          'sweep.stale',
          {
            id,
            type: endpoint.type,
            age,
            ttlMs: this.ttlMs,
            lastUpdated: endpoint.updatedAt,
            coordinates: endpoint.coordinates,
          },
          'warn',
        );
      }
    }

    for (const id of stale) {
      const endpoint = this.endpoints.get(id);
      this.endpoints.delete(id);
      debug.emit('router', 'sweep.removed', {
        id,
        totalRemaining: this.endpoints.size,
      });

      // Emit staleExpired event for failover handling
      if (endpoint) {
        this.emitEvent({
          type: 'staleExpired',
          endpoint: { ...endpoint },
          timestamp: now,
        });
      }
    }

    this.sweeperMetrics.totalSweeps++;
    this.sweeperMetrics.totalRemoved += stale.length;
    this.sweeperMetrics.lastSweepTime = now;

    debug.emit('router', 'sweep.complete', {
      removed: stale.length,
      remaining: this.endpoints.size,
      staleDetails,
      totalSweeps: this.sweeperMetrics.totalSweeps,
      totalRemoved: this.sweeperMetrics.totalRemoved,
      duration: Date.now() - now,
    });
  }

  getSweeperMetrics(): SweeperMetrics {
    return {
      totalSweeps: this.sweeperMetrics.totalSweeps,
      totalRemoved: this.sweeperMetrics.totalRemoved,
      lastSweepTime: this.sweeperMetrics.lastSweepTime,
    };
  }

  subscribe(callback: RouterEventCallback): () => void {
    this.subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback: RouterEventCallback): void {
    this.subscribers.delete(callback);
  }

  private emitEvent(event: RouterEvent): void {
    this.subscribers.forEach((cb) => cb(event));
    this.emit('routerEvent', event);
  }
}
