import { Middleware } from "../types";
export type PipelineConfig = {
    metrics: boolean;
    compression: boolean;
};
export declare function defaultPipeline(config?: Partial<PipelineConfig>): {
    middlewares: Middleware[];
    config: PipelineConfig;
};
//# sourceMappingURL=index.d.ts.map