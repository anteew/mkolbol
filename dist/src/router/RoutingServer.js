import { debug } from '../debug/api.js';
export class RoutingServer {
    endpoints = new Map();
    ttlMs;
    sweepIntervalMs;
    sweepTimer;
    sweeperMetrics = {
        totalSweeps: 0,
        totalRemoved: 0,
        lastSweepTime: null,
    };
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
        const expiresAt = now + this.ttlMs;
        const existing = this.endpoints.get(id);
        const endpoint = existing
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
        const staleDetails = [];
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
    getSweeperMetrics() {
        return {
            totalSweeps: this.sweeperMetrics.totalSweeps,
            totalRemoved: this.sweeperMetrics.totalRemoved,
            lastSweepTime: this.sweeperMetrics.lastSweepTime,
        };
    }
}
//# sourceMappingURL=RoutingServer.js.map