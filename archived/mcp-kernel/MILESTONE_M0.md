# Milestone M0 — Kernel Skeleton (Easy Install, TS + SQLite)

Goals

- Run a minimal, testable kernel in-process.
- Expose MCP/JSON-RPC surface: initialize, tools/list, resources/list/read/subscribe, ping.
- Provide pluggable transports (in-proc bus baseline; stdio and HTTP/SSE stubs).
- Include middleware pipeline hooks and a control-plane surface (stubs) with tests.
- No external services; SQLite file under /data (gitignored), but DB optional in M0.

Deliverables

1. Kernel package (TypeScript)

- Router (JSON-RPC/MCP): methods initialize, tools/list, tools/call (no-op), resources/list, resources/read, resources/subscribe, ping.
- Transports:
  - In-proc bus (default).
  - Stdio adapter (stubbed framing, env-auth).
  - HTTP/SSE adapter (HTTP for calls, SSE stream stub for notifications).
- Auth binding:
  - Stdio: env vars MCP_AGENT_ID, MCP_TOKEN.
  - HTTP: Bearer <token> parsing (no real verifier in M0).
- Subscriptions/notify:
  - resources/subscribe(uri).
  - notifications/resources/updated and notifications/resources/list_changed (emit from a fake resource store).
  - notifications/progress support (stub progressToken flow).
- Middleware hooks (bus pipeline):
  - Pre/post dispatch handlers; register/unregister; order preserved.
  - Provide sample middlewares: tracing/metrics (on by default), compression (off by default).
- Control plane (sideband):
  - Tools: kernel.middleware.list | enable | disable.
  - Resources: mcp://kernel/middleware.json (active pipeline view).
  - Events emitted on change.
- Event log (stub):
  - Append-only in-memory event collector; shape matches RFC (seq, type, aggregate_id, payload, created_at).
  - Wire up on tool success.

2. Plugin model (stubs)

- Manifest loader and validator (JSON Schema).
- Minimal Fake “Tickets” plugin manifest with 1 resource (mcp://tickets/example.json) and 1 tool (ticket.ping).
- Dynamic load/unload at startup only (no hot reload yet).

3. Dev ergonomics

- pnpm scripts: dev (run in-proc), test (unit + integration), build.
- .env.example; /data/.gitignore for future SQLite file.
- README quickstart; example curl commands or Node client snippet.

4. Tests (kernel-only harness)

- Unit: router contracts, middleware order, control-plane tool calls, auth binding (token → agent_id).
- Integration: initialize → tools/resources listing → subscribe to a resource → trigger an update → receive notifications via in-proc and SSE stub.
- Backpressure/coalescing smoke: bounded queue config present; counters exposed (stubbed).
- Golden transcript skeleton: record a short init/subscribe/update flow and replay to assert equality.

Acceptance criteria

- pnpm dev starts the kernel; prints available transports and endpoints.
- tools/list returns kernel.\* tools and fake plugin tool.
- resources/list returns kernel and fake plugin resources; resources/read works for example JSON.
- resources/subscribe on example resource yields notifications/resources/updated when a simulated change occurs.
- Middleware pipeline present: enabling compression yields smaller payloads on the wire in the stub path while preserving content equality; disabling restores original behavior; servers unchanged.
- Control plane tools update mcp://kernel/middleware.json and emit notifications/resources/updated.
- HTTP/SSE stub: client connects, receives ping/heartbeat and one simulated update; disconnect/reconnect works.
- Tests pass with pnpm test.

Out of scope for M0 (deferred to M1+)

- Real SQLite persistence and migrations (Drizzle).
- Real tickets CRUD, queues, status FSM.
- Presence timeouts, autorouter, circuit breakers.
- Unix domain sockets or TCP/WebSocket transport.
- Real event-log persistence and full replay.
