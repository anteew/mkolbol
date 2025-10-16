import { debug } from '../debug/api.js';
import type { RoutingAnnouncement, RoutingEndpoint } from '../types.js';

export interface RoutingServerConfig {
  ttlMs?: number;
  sweepIntervalMs?: number;
}

export class RoutingServer {
  private endpoints = new Map<string, RoutingEndpoint>();
  private ttlMs: number;
  private sweepIntervalMs: number;
  private sweepTimer?: NodeJS.Timeout;

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
    const existing = this.endpoints.get(id);
    const endpoint: RoutingEndpoint = existing
      ? {
          ...existing,
          type,
          coordinates,
          metadata: metadata ? { ...metadata } : undefined,
          updatedAt: now,
        }
      : {
          id,
          type,
          coordinates,
          metadata: metadata ? { ...metadata } : undefined,
          announcedAt: now,
          updatedAt: now,
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

    for (const [id, endpoint] of this.endpoints.entries()) {
      const age = now - endpoint.updatedAt;
      if (age > this.ttlMs) {
        stale.push(id);
        debug.emit('router', 'sweep.stale', {
          id,
          age,
          ttlMs: this.ttlMs,
          lastUpdated: endpoint.updatedAt
        }, 'warn');
      }
    }

    for (const id of stale) {
      this.endpoints.delete(id);
      debug.emit('router', 'sweep.removed', { id });
    }

    if (stale.length > 0) {
      debug.emit('router', 'sweep.complete', {
        removed: stale.length,
        remaining: this.endpoints.size
      });
    }
  }
}
