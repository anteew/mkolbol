function toJsonTool(desc) {
    return {
        name: desc.name,
        description: desc.description ?? null,
        inputSchema: desc.inputSchema ?? null,
        outputSchema: desc.outputSchema ?? null,
        capability: desc.capability ?? null
    };
}
function toJsonResource(desc) {
    return {
        uri: desc.uri,
        description: desc.description ?? null,
        contentSchema: desc.contentSchema ?? null,
        subscribable: desc.subscribable ?? null,
        capability: desc.capability ?? null
    };
}
export class Router {
    tools = new Map();
    resources = new Map();
    subscribers = new Map();
    registerTool(desc, handler) {
        this.tools.set(desc.name, { desc, handler });
    }
    registerResource(desc, read) {
        this.resources.set(desc.uri, { desc, read });
    }
    listTools() {
        return Array.from(this.tools.values()).map(t => t.desc);
    }
    listResources() {
        return Array.from(this.resources.values()).map(r => r.desc);
    }
    async handle(session, req) {
        const { method, id } = req;
        try {
            switch (method) {
                case "initialize":
                    return { jsonrpc: "2.0", id: id ?? null, result: { serverInfo: { name: "obol-kernel", version: "0.1.0" } } };
                case "tools/list": {
                    const tools = this.listTools().map(toJsonTool);
                    return { jsonrpc: "2.0", id: id ?? null, result: { tools } };
                }
                case "resources/list": {
                    const resources = this.listResources().map(toJsonResource);
                    return { jsonrpc: "2.0", id: id ?? null, result: { resources } };
                }
                case "resources/read": {
                    const { uri } = req.params ?? {};
                    const res = this.resources.get(uri);
                    if (!res)
                        throw new Error("Resource not found");
                    const content = await res.read(uri, session);
                    return { jsonrpc: "2.0", id: id ?? null, result: { contents: content } };
                }
                case "resources/subscribe": {
                    const { uri } = req.params ?? {};
                    if (!this.resources.has(uri))
                        throw new Error("Resource not found");
                    const set = this.subscribers.get(uri) ?? new Set();
                    set.add(session.sessionId);
                    this.subscribers.set(uri, set);
                    return { jsonrpc: "2.0", id: id ?? null, result: { ok: true } };
                }
                case "tools/call": {
                    const { name, arguments: args } = req.params ?? {};
                    const tool = this.tools.get(name);
                    if (!tool)
                        throw new Error("Tool not found");
                    const out = await tool.handler(args, session);
                    return { jsonrpc: "2.0", id: id ?? null, result: { content: out } };
                }
                case "ping":
                    return { jsonrpc: "2.0", id: id ?? null, result: { pong: true, now: Date.now() } };
                default:
                    return { jsonrpc: "2.0", id: id ?? null, error: { code: -32601, message: "Method not found" } };
            }
        }
        catch (e) {
            return { jsonrpc: "2.0", id: id ?? null, error: { code: -32000, message: e?.message ?? "Internal error" } };
        }
    }
    makeUpdatedNotification(uri) {
        return { jsonrpc: "2.0", method: "notifications/resources/updated", params: { uri, at: Date.now() } };
    }
    getSubscribers(uri) {
        return Array.from(this.subscribers.get(uri) ?? []);
    }
}
//# sourceMappingURL=router.js.map