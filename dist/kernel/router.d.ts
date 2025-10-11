import { JsonRpcRequest, JsonRpcResponse, McpNotification, ToolDescriptor, ResourceDescriptor, SessionIdentity, Json } from "../types";
type ToolHandler = (params: any, session: SessionIdentity) => Promise<Json>;
type ResourceReader = (uri: string, session: SessionIdentity) => Promise<Json>;
export declare class Router {
    private tools;
    private resources;
    private subscribers;
    registerTool(desc: ToolDescriptor, handler: ToolHandler): void;
    registerResource(desc: ResourceDescriptor, read: ResourceReader): void;
    listTools(): ToolDescriptor[];
    listResources(): ResourceDescriptor[];
    handle(session: SessionIdentity, req: JsonRpcRequest): Promise<JsonRpcResponse>;
    makeUpdatedNotification(uri: string): McpNotification;
    getSubscribers(uri: string): string[];
}
export {};
//# sourceMappingURL=router.d.ts.map