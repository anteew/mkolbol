import { describe, it, expect } from "vitest";
import { Router } from "../src/kernel/router";
import { JsonRpcRequest, SessionIdentity } from "../src/types";

const session: SessionIdentity = { agentId: "test", transport: "inproc", token: "t", sessionId: "s1" };

describe("router basics", () => {
  it("initialize", async () => {
    const r = new Router();
    const req: JsonRpcRequest = { jsonrpc: "2.0", id: 1, method: "initialize" };
    const res = await r.handle(session, req);
    expect(res.result).toBeTruthy();
  });

  it("tools/resources list read", async () => {
    const r = new Router();
    r.registerTool({ name: "x.echo" }, async (p) => p ?? null);
    r.registerResource({ uri: "mcp://x/a.json" }, async () => ({ a: 1 }));
    let res = await r.handle(session, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(res.result).toBeTruthy();
    res = await r.handle(session, { jsonrpc: "2.0", id: 2, method: "resources/list" });
    expect(res.result).toBeTruthy();
    res = await r.handle(session, { jsonrpc: "2.0", id: 3, method: "resources/read", params: { uri: "mcp://x/a.json" } });
    expect(res.result).toBeTruthy();
  });
});
