import type { Pipe } from '../types/stream';
import { Kernel } from '../kernel/Kernel';
export declare class UppercaseTransform {
    private kernel;
    readonly inputPipe: Pipe;
    readonly outputPipe: Pipe;
    constructor(kernel: Kernel);
}
//# sourceMappingURL=uppercase.d.ts.map