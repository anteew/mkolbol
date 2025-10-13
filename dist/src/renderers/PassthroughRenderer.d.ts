import type { Pipe } from '../types/stream.js';
import { Kernel } from '../kernel/Kernel.js';
export declare class PassthroughRenderer {
    readonly inputPipe: Pipe;
    constructor(kernel: Kernel);
    destroy(): void;
}
//# sourceMappingURL=PassthroughRenderer.d.ts.map