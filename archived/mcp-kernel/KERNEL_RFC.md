# Obol Kernel RFC (Draft)

Purpose

- Define a microkernel for the Obol MCP server that is testable in isolation, easy-install (Node + TypeScript + SQLite), and supports future process/network splits without API changes.

Scope and responsibilities

- In-kernel only:
  - JSON-RPC/MCP router (request/response and notifications)
  - Transport adapters (in-proc bus; stdio; HTTP/SSE), pluggable
  - Auth/identity binding (stdio env; HTTP Bearer → agent_id)
  - Subscriptions + notify fanout (resources/updated, resources/list_changed, progress)
  - Event log (append-only) + replay
  - Presence tracking hooks (ping/heartbeat + timestamps)
  - Supervision and backpressure (bounded queues, coalescing, timeouts, cancellation)
- Out of kernel (plugins/servers):
  - Tickets, Comments, Agents/Presence details, Routing/Autorouter, Search, Admin tools
  - All business logic exposed via MCP tools/resources

Protocol and IPC

- Protocol: JSON-RPC 2.0 with MCP conventions
  - Methods: initialize, tools/list, tools/call, resources/list, resources/read, resources/subscribe
  - Notifications: notifications/resources/updated, notifications/resources/list_changed, notifications/progress, ping
- Boundary rule: all inter-module calls are MCP messages over the kernel bus; no direct function calls across module boundaries.

Transports

- In-proc bus (default): zero-IO message dispatcher with deterministic ordering.
- Stdio adapter: framing + env identity for local adapters.
- HTTP/SSE adapter: HTTP JSON-RPC for calls; SSE for push streams.
- Migration path: in-proc → Unix domain sockets → TCP/WebSocket (no API changes; swap adapters).
  Middleware and filters (bus pipeline)
- Purpose: composable, transparent cross-cutting concerns without changing servers.
- Placement: pre- and post-dispatch handlers in the kernel bus; applicable per-transport and per-connection.
- Examples:
  - Compression: compress request/notification payloads on egress and decompress on ingress.
  - Encryption/signing: message-level crypto independent of transport TLS.
  - Metrics/tracing: inject/propagate correlation IDs; measure latency, sizes; sample traces.
  - ACL/policy: allow/deny/transform based on capabilities, method/resource, or tenant.
  - Redaction/scrubbing: remove sensitive fields from logs or outbound payloads.
- Properties:
  - Servers unchanged: middleware operates at the bus layer; no tool/resource code changes.
  - Declarative composition: ordered pipeline with named stages; enable/disable at runtime.
  - Scoping: global, per-transport, per-connection/session, or per-plugin.
  - Idempotence: middlewares should be safe under retries and duplicate deliveries.
- Config:
  - Default pipeline shipped disabled except tracing/metrics; compression negotiated by transport or forced via policy.
  - Conflicts resolved by explicit order; kernel validates compatible stage ordering.

Plugin model

- Plugin = user-space “server” exposing MCP:
  - tools: array of {name, description, inputSchema, outputSchema}
  - resources: array of {uri, description, contentSchema, subscribable}
- Manifest (JSON, semver):
  {
  "name": "tickets",
  "version": "1.0.0",
  "tools": [...],
  "resources": [...],
  "capabilities": ["tickets.read","tickets.write"]
  }
- Lifecycle:
  - load(manifest) → register tools/resources → tools/list reflects → emit notifications/tools/list_changed
  - unload(name@version) → deregister → emit list_changed
- Isolation:
  - Optional per-plugin worker/thread/process; kernel enforces timeouts, concurrency caps, circuit breakers.
    Control plane (sideband)
- Separate from data path; exposed as MCP tools/resources under mcp://kernel/\*
- Tools:
  - kernel.middleware.list | enable | disable | configure
  - kernel.transport.list | configure
  - kernel.introspection.router | subscriptions | plugins
  - kernel.health.get | reset_counters
- Resources:
  - mcp://kernel/middleware.json (active pipeline, order, config)
  - mcp://kernel/transports.json (adapters, listeners, sessions)
  - mcp://kernel/metrics.json (queues, fanout latency, dropped/coalesced)
  - mcp://kernel/plugins.json (loaded manifests, versions, states)
- Behavior:
  - Runtime reconfiguration without restarting; atomic pipeline swaps.
  - Capability-gated (admin-only) and auditable via the event log.
  - Sideband changes emit notifications/resources/updated on corresponding mcp://kernel/\* URIs.

Auth and identity

- HTTP: Authorization: Bearer <token> → binds to agent_id; scopes map to capabilities.
- Stdio: environment variables (MCP_AGENT_ID, MCP_TOKEN) provide identity.
- Kernel enforces per-tool/resource capability checks; deny-by-default.

Subscriptions and notifications

- resources/subscribe(uri) → server pushes:
  - notifications/resources/updated on content change
  - notifications/resources/list_changed for collection membership changes
  - notifications/progress for long operations keyed by progressToken
- Ordering: per-resource ordering preserved; coalescing merges burst updates.

Backpressure and coalescing

- Bounded queues per subscriber and per plugin.
- Coalesce by resource URI; throttle slow consumers; drop-duplicate counters and metrics.
- SSE: detect slow clients; apply coalescing; never unbounded RAM growth.

Event log and replay

- Append-only events table:
  - seq (monotonic), type, aggregate_id, payload, created_at
- On tool success, append event(s); on restart or audit, replay to reconstruct state and verify resource/queue membership.
- Golden transcript support for deterministic replays.

Presence and liveness

- Accept ping from clients; record last_ping_at and status; timeouts mark offline.
- Presence changes reflected in mcp://agents/directory.json (plugin-provided resource); kernel provides hooks and notifications.

Supervision and failure handling

- Per-call timeouts; plugin error transforms → structured JSON-RPC errors.
- Circuit breaker on repeated plugin faults with backoff.
- Health metrics per plugin and per transport.

Testing strategy

- Kernel-only harness:
  - In-proc bus; stdio/HTTP/SSE stubs; in-memory store or SQLite tmp DB (Drizzle migrations).
  - Tests: initialize → list → subscribe → updates; progress streaming; auth binding; backpressure/coalescing; event-log replay.
  - Middleware: deterministic pre/post execution order; compression round-trip (size decreases, payload equality); ACL denies; tracing/metrics emission; idempotent retries.
  - Control plane: kernel.middleware.enable/disable/configure affects only targeted scopes; atomic pipeline swap with no message loss; mcp://kernel/\* resources update and notify.
- Plugin harness (in-proc):
  - Manifest validation, dynamic load/unload; tools/resources registration; tickets plugin CRUD + FSM errors; notifications and persistence.
  - Middleware compatibility: plugins observe original payloads; no code changes required when middleware toggles on/off.
- Property/fuzz:
  - Random interleavings of initialize/subscriptions/notifications; duplicate ids/idempotency; burst update coalescing.
  - Middleware + backpressure under load: bounded memory, preserved per-resource ordering.

Migration path

- Start single process, in-proc bus, SQLite file (easy install).
- For isolation: move select plugins to Unix domain sockets with identical MCP interface.
- For distribution: switch transports to TCP/WebSocket/HTTP; kernel API unchanged.

Operational observability

- Structured logs with trace_id, agent_id, ticket_id, progressToken.
- Metrics: queue sizes, fanout latency p95/p99, dropped/coalesced counters, plugin error rates.
- Traces across RPC hops (propagate correlation ids).

Alignment with existing RFC

- 1.2 Architecture: JSON-RPC over stdio and HTTP/SSE; modules list maps to plugins.
- Notifications: resources/updated, resources/list_changed, progress.
- Initialize + presence/heartbeat; tools/resources discovery; status FSM and queue resources.
- Events: append-only audit/replay table.

Defaults and constraints

- Implementation: Node + TypeScript
- DB: SQLite (Drizzle ORM) for easy install; schema compatible with future Postgres
- Package: pnpm
- Security: capability tokens; admin-only tools gated

Deliverables (for M0–M2)

- Kernel package with router, transports (in-proc, stdio, HTTP/SSE), auth binding, notifier, event log.
- Plugin loader + manifest schema and validator.
- Tickets plugin v0: minimal CRUD + queues + notifications.
- Kernel test harness with golden transcript and replay tests.
