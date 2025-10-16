import type { RoutingAnnouncement, RoutingEndpoint } from '../types.js';
export interface RoutingServerConfig {
    ttlMs?: number;
    sweepIntervalMs?: number;
}
export declare class RoutingServer {
    private endpoints;
    private ttlMs;
    private sweepIntervalMs;
    private sweepTimer?;
    constructor(config?: RoutingServerConfig);
    announce(announcement: RoutingAnnouncement): void;
    withdraw(id: string): void;
    list(): RoutingEndpoint[];
    startSweeper(): void;
    stopSweeper(): void;
    sweep(): void;
}
//# sourceMappingURL=RoutingServer.d.ts.map