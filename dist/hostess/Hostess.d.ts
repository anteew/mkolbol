import { CapabilityQuery, GuestBookEntry, ServerManifest } from '../types.js';
interface HostessOptions {
    heartbeatIntervalMs?: number;
    evictionThresholdMs?: number;
}
export declare class Hostess {
    private guestBook;
    private interval?;
    private readonly heartbeatIntervalMs;
    private readonly evictionThresholdMs;
    constructor(opts?: HostessOptions);
    register(entry: ServerManifest): string;
    heartbeat(serverId: string): void;
    markInUse(serverId: string, terminalName: string, connectomeId: string): void;
    markAvailable(serverId: string, terminalName: string): void;
    query(filter?: CapabilityQuery): GuestBookEntry[];
    list(): GuestBookEntry[];
    startEvictionLoop(): void;
    stopEvictionLoop(): void;
    private isLive;
    private computeAvailable;
}
export {};
//# sourceMappingURL=Hostess.d.ts.map