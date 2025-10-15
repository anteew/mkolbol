import type { TopologyConfig } from './schema.js';
export interface LoadConfigOptions {
    validate?: boolean;
}
export declare function loadConfig(pathOrString: string, opts?: LoadConfigOptions): TopologyConfig;
export declare function validateTopology(config: any): void;
//# sourceMappingURL=loader.d.ts.map