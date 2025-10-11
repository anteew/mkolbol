export type Json = null | boolean | number | string | Json[] | {
    [k: string]: Json;
};
export type JsonRpcId = string | number | null;
export interface JsonRpcRequest {
    jsonrpc: "2.0";
    id?: JsonRpcId;
    method: string;
    params?: Json;
}
export interface JsonRpcResponse {
    jsonrpc: "2.0";
    id: JsonRpcId;
    result?: Json;
    error?: {
        code: number;
        message: string;
        data?: Json;
    };
}
export interface McpNotification {
    jsonrpc: "2.0";
    method: string;
    params?: Json;
}
export interface SessionIdentity {
    agentId: string;
    token?: string;
    transport: "inproc" | "stdio" | "http";
    sessionId: string;
}
export type Middleware = (ctx: DispatchContext, next: () => Promise<void>) => Promise<void>;
export interface DispatchContext {
    session: SessionIdentity;
    request?: JsonRpcRequest | McpNotification;
    response?: JsonRpcResponse | McpNotification;
    timestamp: number;
    meta: Record<string, unknown>;
}
export interface ToolDescriptor {
    name: string;
    description?: string;
    inputSchema?: Json;
    outputSchema?: Json;
    capability?: string;
}
export interface ResourceDescriptor {
    uri: string;
    description?: string;
    contentSchema?: Json;
    subscribable?: boolean;
    capability?: string;
}
export interface PluginManifest {
    name: string;
    version: string;
    tools: ToolDescriptor[];
    resources: ResourceDescriptor[];
    capabilities?: string[];
}
//# sourceMappingURL=types.d.ts.map