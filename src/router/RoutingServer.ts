import { debug } from '../debug/api.js';
import type { RoutingAnnouncement, RoutingEndpoint } from '../types.js';

export interface RoutingServerConfig {
  ttlMs?: number;
  sweepIntervalMs?: number;
}

export interface SweeperMetrics {
  totalSweeps: number;
  totalRemoved: number;
  lastSweepTime: number | null;
}

export class RoutingServer {
  private endpoints = new Map<string, RoutingEndpoint>();
  private ttlMs: number;
  private sweepIntervalMs: number;
  private sweepTimer?: NodeJS.Timeout;
  private sweeperMetrics: SweeperMetrics = {
    totalSweeps: 0,
    totalRemoved: 0,
    lastSweepTime: null,
  };

  constructor(config?: RoutingServerConfig) {
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

    this.endpoints.set(id, endpoint);
    debug.emit('router', 'announce', { id, type, coordinates, metadata });
  }

  withdraw(id: string): void {
    if (!id) return;
    if (this.endpoints.delete(id)) {
      debug.emit('router', 'withdraw', { id });
    }
  }

  list(): RoutingEndpoint[] {
    return Array.from(this.endpoints.values()).map((endpoint) => ({
      ...endpoint,
      metadata: endpoint.metadata ? { ...endpoint.metadata } : undefined,
    }));
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
        debug.emit('router', 'sweep.stale', {
          id,
          type: endpoint.type,
          age,
          ttlMs: this.ttlMs,
          lastUpdated: endpoint.updatedAt,
          coordinates: endpoint.coordinates,
        }, 'warn');
      }
    }

    for (const id of stale) {
      this.endpoints.delete(id);
      debug.emit('router', 'sweep.removed', { 
        id,
        totalRemaining: this.endpoints.size,
      });
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
}
