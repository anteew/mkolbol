import { Kernel } from '../kernel/Kernel.js';
import { StateManager } from '../state/StateManager.js';
import { ControlBus } from '../control/ControlBus.js';
export interface TopologyControllerOptions {
    commandsTopic?: string;
    eventsTopic?: string;
}
export declare class TopologyController {
    private kernel;
    private state;
    private bus;
    private unsub?;
    private readonly commandsTopic;
    private readonly eventsTopic;
    constructor(kernel: Kernel, state: StateManager, bus: ControlBus, opts?: TopologyControllerOptions);
    start(): void;
    stop(): void;
    private ack;
    private err;
    private handleCommand;
}
//# sourceMappingURL=TopologyController.d.ts.map