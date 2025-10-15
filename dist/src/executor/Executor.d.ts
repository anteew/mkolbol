import { Kernel } from '../kernel/Kernel.js';
import { Hostess } from '../hostess/Hostess.js';
import { StateManager } from '../state/StateManager.js';
import { ExternalServerWrapper } from '../wrappers/ExternalServerWrapper.js';
import type { TopologyConfig } from '../config/schema.js';
import type { ExternalServerManifest } from '../types.js';
import type { TestLogger } from '../logging/logger.js';
export declare class Executor {
    private kernel;
    private hostess;
    private stateManager;
    private config?;
    private modules;
    private moduleRegistry;
    private logger?;
    constructor(kernel: Kernel, hostess: Hostess, stateManager: StateManager, logger?: TestLogger);
    load(config: TopologyConfig): void;
    up(): Promise<void>;
    down(): Promise<void>;
    private drainAndTeardownProcess;
    restartNode(id: string): Promise<void>;
    registerModule(name: string, constructor: any): void;
    spawnExternalWrapper(manifest: ExternalServerManifest): Promise<ExternalServerWrapper>;
    private instantiateNode;
    private instantiateProcessNode;
    private instantiateInProcNode;
    private instantiateWorkerNode;
    private getModulePath;
    private inferTerminalsForHostess;
    private inferTerminalsForStateManager;
    private getClassHex;
    private getModuleType;
}
//# sourceMappingURL=Executor.d.ts.map