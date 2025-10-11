import { metricsMiddleware } from "./metrics";
import { compressionMiddleware } from "./compression";
export function defaultPipeline(config) {
    const cfg = { metrics: true, compression: false, ...(config ?? {}) };
    const mws = [];
    if (cfg.metrics)
        mws.push(metricsMiddleware);
    if (cfg.compression)
        mws.push(compressionMiddleware);
    return { middlewares: mws, config: cfg };
}
//# sourceMappingURL=index.js.map