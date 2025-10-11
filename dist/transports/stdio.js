import readline from "node:readline";
export function startStdio(router) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    const session = {
        agentId: process.env.MCP_AGENT_ID || "stdio",
        token: process.env.MCP_TOKEN,
        transport: "stdio",
        sessionId: "stdio-" + Date.now()
    };
    rl.on("line", async (line) => {
        try {
            const req = JSON.parse(line);
            const res = await router.handle(session, req);
            write(res);
        }
        catch (e) {
            const err = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } };
            write(err);
        }
    });
}
function write(obj) {
    process.stdout.write(JSON.stringify(obj) + "\n");
}
//# sourceMappingURL=stdio.js.map