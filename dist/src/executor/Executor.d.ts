import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { ExternalServerWrapper } from '../wrappers/ExternalServerWrapper.js';
import type { TopologyConfig } from '../config/schema.js';
import type { ExternalServerManifest } from '../types.js';
import type { TestLogger } from '../logging/logger.js';
import type { RoutingServer } from '../router/RoutingServer.js';
interface HeartbeatConfig {
    timeout: number;
    maxMissed: number;
    checkInterval: number;
}
interface CutoverConfig {
    drainTimeout: number;
    killTimeout: number;
}
interface RouterHeartbeatConfig {
    enabled: boolean;
    intervalMs: number;
}
export declare class Executor {
    private kernel;
    private hostess;
    private stateManager;
    private config?;
    private modules;
    private moduleRegistry;
    private logger?;
    private routingServer?;
    private routingIndex;
    private heartbeatConfig;
    private cutoverConfig;
    private routerHeartbeatConfig;
    private heartbeatTimer?;
    constructor(kernel: Kernel, hostess: Hostess, stateManager: StateManager, logger?: TestLogger);
    setHeartbeatConfig(config: Partial<HeartbeatConfig>): void;
    setCutoverConfig(config: Partial<CutoverConfig>): void;
    setRoutingServer(server: RoutingServer): void;
    setRouterHeartbeatConfig(config: Partial<RouterHeartbeatConfig>): void;
    load(config: TopologyConfig): void;
    up(): Promise<void>;
    down(): Promise<void>;
    private drainAndTeardownProcess;
    restartNode(id: string): Promise<void>;
    registerModule(name: string, constructor: any): void;
    spawnExternalWrapper(manifest: ExternalServerManifest): Promise<ExternalServerWrapper>;
    private instantiateNode;
    private instantiateExternalProcessNode;
    private instantiateProcessNode;
    private instantiateInProcNode;
    private instantiateWorkerNode;
    private announceRoutingEndpoint;
    private getModulePath;
    private inferTerminalsForHostess;
    private inferTerminalsForStateManager;
    private getClassHex;
    private getModuleType;
    private startRouterHeartbeats;
    private stopRouterHeartbeats;
    private sendRouterHeartbeats;
}
export {};
//# sourceMappingURL=Executor.d.ts.map