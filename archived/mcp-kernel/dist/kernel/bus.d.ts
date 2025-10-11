import { DispatchContext, Middleware, JsonRpcRequest, McpNotification } from "../types";
export declare class InProcBus {
    private middlewares;
    use(mw: Middleware): void;
    dispatch(session: DispatchContext["session"], msg: JsonRpcRequest | McpNotification, handler: (ctx: DispatchContext) => Promise<void>): Promise<DispatchContext>;
}
//# sourceMappingURL=bus.d.ts.map