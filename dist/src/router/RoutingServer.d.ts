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
export declare class RoutingServer {
    private endpoints;
    private ttlMs;
    private sweepIntervalMs;
    private sweepTimer?;
    private sweeperMetrics;
    constructor(config?: RoutingServerConfig);
    announce(announcement: RoutingAnnouncement): void;
    withdraw(id: string): void;
    list(): RoutingEndpoint[];
    startSweeper(): void;
    stopSweeper(): void;
    sweep(): void;
    getSweeperMetrics(): SweeperMetrics;
}
//# sourceMappingURL=RoutingServer.d.ts.map