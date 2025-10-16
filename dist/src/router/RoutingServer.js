import { debug } from '../debug/api.js';
export class RoutingServer {
    endpoints = new Map();
    ttlMs;
    sweepIntervalMs;
    sweepTimer;
    constructor(config) {
        this.ttlMs = config?.ttlMs ?? 30000;
        this.sweepIntervalMs = config?.sweepIntervalMs ?? 10000;
    }
    announce(announcement) {
        const { id, type, coordinates, metadata } = announcement;
        if (!id) {
            throw new Error('RoutingServer.announce requires an "id"');
        }
        const now = Date.now();
        const existing = this.endpoints.get(id);
        const endpoint = existing
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
    withdraw(id) {
        if (!id)
            return;
        if (this.endpoints.delete(id)) {
            debug.emit('router', 'withdraw', { id });
        }
    }
    list() {
        return Array.from(this.endpoints.values()).map((endpoint) => ({
            ...endpoint,
            metadata: endpoint.metadata ? { ...endpoint.metadata } : undefined,
        }));
    }
    startSweeper() {
        if (this.sweepTimer)
            return;
        this.sweepTimer = setInterval(() => {
            this.sweep();
        }, this.sweepIntervalMs);
    }
    stopSweeper() {
        if (this.sweepTimer) {
            clearInterval(this.sweepTimer);
            this.sweepTimer = undefined;
        }
    }
    sweep() {
        const now = Date.now();
        const stale = [];
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
//# sourceMappingURL=RoutingServer.js.map