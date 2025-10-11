import http from "node:http";
import { Router } from "../kernel/router";
import { JsonRpcRequest, SessionIdentity, McpNotification } from "../types";
import { URL } from "node:url";

type Client = { id: string; res: http.ServerResponse };

export class SSEHub {
  private clients = new Map<string, Client>();
  add(client: Client) {
    this.clients.set(client.id, client);
  }
  remove(id: string) {
    this.clients.delete(id);
  }
  broadcast(note: McpNotification) {
    const payload = `data: ${JSON.stringify(note)}\n\n`;
    for (const c of this.clients.values()) {
      c.res.write(payload);
    }
  }
  heartbeat() {
    const payload = `event: ping\ndata: ${Date.now()}\n\n`;
    for (const c of this.clients.values()) {
      c.res.write(payload);
    }
  }
}

export function startHttp(router: Router, port: number, sse: SSEHub) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      if (req.method === "POST" && url.pathname === "/rpc") {
        const body = await parseJson(req);
        const session: SessionIdentity = {
          agentId: (req.headers["x-agent-id"] as string) || "http",
          token: parseAuth(req.headers["authorization"] as string),
          transport: "http",
          sessionId: genSessionId()
        };
        const out = await router.handle(session, body as JsonRpcRequest);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(out));
        return;
      }
      if (req.method === "GET" && url.pathname === "/events") {
        const id = genSessionId();
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no"
        });
        sse.add({ id, res });
        req.on("close", () => sse.remove(id));
        res.write(`event: open\ndata: ${id}\n\n`);
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
    } catch (e: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal" }));
    }
  });

  const timer = setInterval(() => sse.heartbeat(), 15000);
  server.on("close", () => clearInterval(timer));
  server.listen(port);
  return server;
}

function genSessionId() {
  return Math.random().toString(36).slice(2);
}

function parseAuth(h?: string) {
  if (!h) return undefined;
  const [, token] = (h || "").split(" ");
  return token;
}

async function parseJson(req: http.IncomingMessage) {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk as Uint8Array);
  const s = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(s);
}
