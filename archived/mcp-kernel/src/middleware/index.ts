import { Middleware } from '../types';
import { metricsMiddleware } from './metrics';
import { compressionMiddleware } from './compression';

export { metricsMiddleware, compressionMiddleware };

export type PipelineConfig = {
  metrics: boolean;
  compression: boolean;
};

export function defaultPipeline(config?: Partial<PipelineConfig>): {
  middlewares: Middleware[];
  config: PipelineConfig;
} {
  const cfg: PipelineConfig = { metrics: true, compression: false, ...(config ?? {}) };
  const mws: Middleware[] = [];
  if (cfg.metrics) mws.push(metricsMiddleware);
  if (cfg.compression) mws.push(compressionMiddleware);
  return { middlewares: mws, config: cfg };
}
