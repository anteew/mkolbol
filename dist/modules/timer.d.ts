import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
export declare class TimerSource {
    private kernel;
    private periodMs;
    readonly outputPipe: Pipe;
    private interval?;
    constructor(kernel: Kernel, periodMs?: number);
    start(): void;
    stop(): void;
}
//# sourceMappingURL=timer.d.ts.map