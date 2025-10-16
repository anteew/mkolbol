# Near-Term and Future Plan (VEGA)

Version: 2025-10-16
Owner: VEGA

## Near Term (next 1–2 sessions)

mkolbol — Parser P3 polish + mkctl ergonomics
- Merge PR #64; branch mkolbol-devex-p5.
- Parser P3: small polish (docs/examples), keep perf guard stable; no kernel changes.
- mkctl run: quality‑of‑life (SIGINT handling, exit codes, friendlier errors).

DevEx — First Five Minutes landing (optional if time)
- Short landing that routes to: mkctl run → StdIO path → Interactive topology.

## Next (following sessions)

mkolbol — Optional follow‑ups
- Minimal Router/Routing announcements P1 (skeleton; no network) for discovery UX.
- Starter “Renderer Pack” plan (TTY + JSON → future browser module).

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
