import { Middleware } from "../types";

export const metricsMiddleware: Middleware = async (ctx, next) => {
  const start = Date.now();
  await next();
  const dur = Date.now() - start;
  ctx.meta.latencyMs = dur;
};
