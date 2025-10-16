# Near-Term and Future Plan (VEGA)

Version: 2025-10-12
Owner: VEGA

## Near Term (next 1–2 sessions)

mkolbol — Process‑mode enforcement
- Promote the Unix adapters spec from monitored to required after a green window; finalize timeouts and health checks.

Laminar Packaging/Quickstart
- npx entry (`npx laminar`), `lam init` scaffolder, and a GH Actions sample; README Quickstart.

Laminar Docs Final
- MCP cookbook; ingest how‑tos; rule packs & redaction guidance; budgets/overlays patterns.

## Next (following sessions)

mkolbol — Optional follow‑ups
- TCP adapters experiment for remote child once Unix path is enforced
- NATS adapter later for ControlBus (stretch)

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
