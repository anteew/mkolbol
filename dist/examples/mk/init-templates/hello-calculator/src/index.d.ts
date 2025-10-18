import { Kernel } from 'mkolbol';
export declare class CalculatorServer {
    private server;
    private kernel;
    private options;
    constructor(kernel: Kernel, options: {
        port: number;
        precision: number;
    });
    start(): void;
    stop(): void;
}
//# sourceMappingURL=index.d.ts.map