import readline from "node:readline";
import { Router } from "../kernel/router";
import { JsonRpcRequest, JsonRpcResponse, SessionIdentity } from "../types";

export function startStdio(router: Router) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const session: SessionIdentity = {
    agentId: process.env.MCP_AGENT_ID || "stdio",
    token: process.env.MCP_TOKEN,
    transport: "stdio",
    sessionId: "stdio-" + Date.now()
  };
  rl.on("line", async line => {
    try {
      const req = JSON.parse(line) as JsonRpcRequest;
      const res = await router.handle(session, req);
      write(res);
    } catch (e: any) {
      const err: JsonRpcResponse = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } };
      write(err);
    }
  });
}

function write(obj: any) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}
