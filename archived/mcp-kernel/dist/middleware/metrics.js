export const metricsMiddleware = async (ctx, next) => {
    const start = Date.now();
    await next();
    const dur = Date.now() - start;
    ctx.meta.latencyMs = dur;
};
//# sourceMappingURL=metrics.js.map