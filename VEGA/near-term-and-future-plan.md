# Near-Term and Future Plan (VEGA)

Version: 2025-10-12
Owner: VEGA

## Near Term (next 1–2 sessions)

Laminar Packaging/Quickstart (SB‑LAM‑PKG‑QUICKSTART‑P1)
- npx entry (`npx laminar`), local bin script, and `lam init` to scaffold laminar.config.json with defaults (rule packs + redaction presets)
- GitHub Actions sample workflow (threads lane + optional PTY lane) publishing `reports/` artifacts and a brief `lam summary` to job summary
- README front‑page Quickstart with copy‑paste commands

Laminar Docs Final (SB‑LAM‑DOCS‑FINAL‑P1)
- MCP cookbook (tool calls + JSON contracts + examples)
- Cross‑language ingest how‑tos (Go/Pytest/JUnit) with minimal fixtures
- Rule pack presets + redaction guidance; budgets and overlays (focus rules) patterns

Laminar Stabilization (mini)
- Address “matching test count between index and summary” parity nit
- Expand redaction tests for corner cases; document safe test fixture patterns

## Next (following sessions)

mkolbol — Hostess Control Endpoints
- Include control endpoint metadata (type + coordinates) in Hostess registration for each server

Process‑mode (Phase 2)
- Unix/TCP adapters for control + pipes; Executor runMode 'process' with blue/green cutover
- Optional: NATS adapter later for ControlBus

## Future / Parking Lot

- Digest diffs at scale (delta heuristics, budget‑aware attachments)
- Trend UIs (ASCII summaries; optional web panel later)
- Mux transform (N→1, setActive) for tmux‑like switching without rewiring
- Router + gossip announcements (multi‑hop envelopes, hop counts)
- LLDP/probe/beacon servers (connectivity knowledge)
- Pipe Meter transform (flow/latency counters) with metrics topics
- Serial/TCP bridge server; VPN overlay experiment
- Process isolation hardening; worker harness pattern

## State of Mind Snapshot

- Keep kernel inert and tiny; invest in adapters and controllers.
- Prefer message boundaries over direct calls; stable envelopes, swappable transports.
- Demos that feel like physical plumbing: tee, cutover, mux.
