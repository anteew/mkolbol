import { DispatchContext, Middleware, JsonRpcRequest, McpNotification } from "../types";

export class InProcBus {
  private middlewares: Middleware[] = [];

  use(mw: Middleware) {
    this.middlewares.push(mw);
  }

  async dispatch(session: DispatchContext["session"], msg: JsonRpcRequest | McpNotification, handler: (ctx: DispatchContext) => Promise<void>) {
    const ctx: DispatchContext = { session, request: msg, timestamp: Date.now(), meta: {} };
    let i = -1;
    const run = async (idx: number): Promise<void> => {
      if (idx <= i) throw new Error("next() called multiple times");
      i = idx;
      const mw = this.middlewares[idx];
      if (mw) {
        await mw(ctx, () => run(idx + 1));
      } else {
        await handler(ctx);
      }
    };
    await run(0);
    return ctx;
  }
}
