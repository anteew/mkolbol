export class InProcBus {
    middlewares = [];
    use(mw) {
        this.middlewares.push(mw);
    }
    async dispatch(session, msg, handler) {
        const ctx = { session, request: msg, timestamp: Date.now(), meta: {} };
        let i = -1;
        const run = async (idx) => {
            if (idx <= i)
                throw new Error("next() called multiple times");
            i = idx;
            const mw = this.middlewares[idx];
            if (mw) {
                await mw(ctx, () => run(idx + 1));
            }
            else {
                await handler(ctx);
            }
        };
        await run(0);
        return ctx;
    }
}
//# sourceMappingURL=bus.js.map