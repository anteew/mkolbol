import { Kernel } from '../kernel/Kernel.js';
export type ModuleConstructor = new (kernel: Kernel, ...args: any[]) => any;
export declare class ModuleRegistry {
    private registry;
    constructor();
    register(name: string, constructor: any): void;
    get(name: string): any;
    has(name: string): boolean;
}
//# sourceMappingURL=moduleRegistry.d.ts.map