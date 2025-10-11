import { Middleware } from "../types";
import { metricsMiddleware } from "./metrics";
import { compressionMiddleware } from "./compression";
export { metricsMiddleware, compressionMiddleware };
export type PipelineConfig = {
    metrics: boolean;
    compression: boolean;
};
export declare function defaultPipeline(config?: Partial<PipelineConfig>): {
    middlewares: Middleware[];
    config: PipelineConfig;
};
//# sourceMappingURL=index.d.ts.map