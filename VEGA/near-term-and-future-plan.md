# Near-Term and Future Plan (VEGA)

Version: 2025-10-12
Owner: VEGA

## Near Term (next 1–2 sessions)

Laminar v003 — Digest Rules + Generator
- Add laminar.config.json schema (match/actions: include/slice/redact/priority; budget; toggles)
- Implement digest generator (JSON + MD) with suspect scoring (proximity/density/corr)
- Integrate with laminar:run (auto-generate on fail)
- Extend CLI: `lam digest`, `lam show` upgrades

Laminar v004 — MCP Skeleton
- Add MCP server for Laminar (tools: run, digest.generate, rules.get/set, logs.case.get, query, repro)
- Return compact JSON for agent workflows

Laminar v005 — Cross-language Ingest
- Ingest shim for Go: `go test -json` → Laminar JSONL
- Document minimal integration patterns

## Next (following sessions)

mkolbol — Hostess Control Endpoints
- Include control endpoint metadata (type + coordinates) in Hostess registration for each server

Process-mode (Phase 2)
- Unix/TCP adapters for control + pipes; Executor runMode 'process' with blue/green cutover
- Optional: NATS adapter later for ControlBus

## Future / Parking Lot

- Mux transform (N→1, setActive) for tmux-like switching without rewiring
- Router + gossip announcements (multi-hop envelopes, hop counts)
- LLDP/probe/beacon servers (connectivity knowledge)
- Pipe Meter transform (flow/latency counters) with metrics topics
- Golden transcript tests for demos
- Serial/TCP bridge server; VPN overlay experiment
- Process isolation hardening; worker harness pattern

## State of Mind Snapshot

- Keep kernel inert and tiny; invest in adapters and controllers.
- Prefer message boundaries over direct calls; stable envelopes, swappable transports.
- Demos that feel like physical plumbing: tee, cutover, mux.
