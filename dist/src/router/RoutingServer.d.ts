import type { RoutingAnnouncement, RoutingEndpoint } from '../types.js';
import type { RouterEventCallback } from '../types/router.js';
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
export declare class RoutingServer extends EventEmitter {
    private endpoints;
    private ttlMs;
    private sweepIntervalMs;
    private sweepTimer?;
    private sweeperMetrics;
    private subscribers;
    constructor(config?: RoutingServerConfig);
    announce(announcement: RoutingAnnouncement): void;
    withdraw(id: string): void;
    list(): RoutingEndpoint[];
    startSweeper(): void;
    stopSweeper(): void;
    sweep(): void;
    getSweeperMetrics(): SweeperMetrics;
    subscribe(callback: RouterEventCallback): () => void;
    unsubscribe(callback: RouterEventCallback): void;
    private emitEvent;
}
//# sourceMappingURL=RoutingServer.d.ts.map