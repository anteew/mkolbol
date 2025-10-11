import { JsonRpcRequest, JsonRpcResponse, McpNotification, ToolDescriptor, ResourceDescriptor, SessionIdentity, Json } from "../types";

type ToolHandler = (params: any, session: SessionIdentity) => Promise<Json>;
type ResourceReader = (uri: string, session: SessionIdentity) => Promise<Json>;

function toJsonTool(desc: ToolDescriptor): Json {
  return {
    name: desc.name,
    description: desc.description ?? null,
    inputSchema: desc.inputSchema ?? null,
    outputSchema: desc.outputSchema ?? null,
    capability: desc.capability ?? null
  };
}

function toJsonResource(desc: ResourceDescriptor): Json {
  return {
    uri: desc.uri,
    description: desc.description ?? null,
    contentSchema: desc.contentSchema ?? null,
    subscribable: desc.subscribable ?? null,
    capability: desc.capability ?? null
  };
}

export class Router {
  private tools = new Map<string, { desc: ToolDescriptor; handler: ToolHandler }>();
  private resources = new Map<string, { desc: ResourceDescriptor; read: ResourceReader }>();
  private subscribers = new Map<string, Set<string>>();

  registerTool(desc: ToolDescriptor, handler: ToolHandler) {
    this.tools.set(desc.name, { desc, handler });
  }

  registerResource(desc: ResourceDescriptor, read: ResourceReader) {
    this.resources.set(desc.uri, { desc, read });
  }

  listTools(): ToolDescriptor[] {
    return Array.from(this.tools.values()).map(t => t.desc);
  }

  listResources(): ResourceDescriptor[] {
    return Array.from(this.resources.values()).map(r => r.desc);
  }

  async handle(session: SessionIdentity, req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, id } = req;
    try {
      switch (method) {
        case "initialize":
          return { jsonrpc: "2.0", id: id ?? null, result: { serverInfo: { name: "obol-kernel", version: "0.1.0" } } as Json };
        case "tools/list": {
          const tools = this.listTools().map(toJsonTool);
          return { jsonrpc: "2.0", id: id ?? null, result: { tools } as Json };
        }
        case "resources/list": {
          const resources = this.listResources().map(toJsonResource);
          return { jsonrpc: "2.0", id: id ?? null, result: { resources } as Json };
        }
        case "resources/read": {
          const { uri } = (req.params as any) ?? {};
          const res = this.resources.get(uri);
          if (!res) throw new Error("Resource not found");
          const content = await res.read(uri, session);
          return { jsonrpc: "2.0", id: id ?? null, result: { contents: content } as Json };
        }
        case "resources/subscribe": {
          const { uri } = (req.params as any) ?? {};
          if (!this.resources.has(uri)) throw new Error("Resource not found");
          const set = this.subscribers.get(uri) ?? new Set<string>();
          set.add(session.sessionId);
          this.subscribers.set(uri, set);
          return { jsonrpc: "2.0", id: id ?? null, result: { ok: true } as Json };
        }
        case "tools/call": {
          const { name, arguments: args } = (req.params as any) ?? {};
          const tool = this.tools.get(name);
          if (!tool) throw new Error("Tool not found");
          const out = await tool.handler(args, session);
          return { jsonrpc: "2.0", id: id ?? null, result: { content: out } as Json };
        }
        case "ping":
          return { jsonrpc: "2.0", id: id ?? null, result: { pong: true, now: Date.now() } as Json };
        default:
          return { jsonrpc: "2.0", id: id ?? null, error: { code: -32601, message: "Method not found" } };
      }
    } catch (e: any) {
      return { jsonrpc: "2.0", id: id ?? null, error: { code: -32000, message: e?.message ?? "Internal error" } };
    }
  }

  makeUpdatedNotification(uri: string): McpNotification {
    return { jsonrpc: "2.0", method: "notifications/resources/updated", params: { uri, at: Date.now() } };
  }

  getSubscribers(uri: string): string[] {
    return Array.from(this.subscribers.get(uri) ?? []);
  }
}
