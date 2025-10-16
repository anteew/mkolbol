# Near-Term and Future Plan (VEGA)

Version: 2025-10-16
Owner: VEGA

## Near Term (Local Node v1.0 — next 1–2 sessions)

Local‑first gating
- Export `MK_LOCAL_NODE=1` (disable network adapters/transports in loader + CLI; Router in‑proc only).
- CI executes threads + process lanes; no network tests.

Core (Susan)
- Router P2: TTL/heartbeat, capability filters, `mkctl endpoints --watch` (JSON + filters), snapshots under `reports/router-endpoints.json`.
- ExternalProcess Hardening P1: restartPolicy/backoff/log capture/env/cwd; exit‑code mapping.
- Process Cutover P2: drain→switch→teardown under load (frame‑safe; no data loss).
- FilesystemSink P1: append/truncate, fsync policy; backpressure + error propagation.

DevEx (Vex)
- Validate/Doctor matrix aligned with mkctl messages; cookbook refresh.
- Onboarding v2; acceptance pack; packaging via GitHub install.

## Next (following sessions)

Local Node v1.0 acceptance & polish
- Acceptance: external HTTP process → FilesystemSink (logs) and optional DB gateway; XtermTTYRenderer; mkctl endpoints --watch shows live entries; TTL expiry works.
- Polish: perf guard stability; error surfaces; doc examples runnable end‑to‑end.

## Future / Parking Lot (post Local Node v1.0)

- Router Network P1 (Unix socket adapter; mkctl --connect)
- Digest diffs at scale; trend UIs; mux transform; gossip announcements
- Probe/beacon servers; Pipe Meter transform; Serial/TCP bridges; VPN overlay
- Process isolation hardening; worker harness pattern

## State of Mind Snapshot

- Keep kernel inert and tiny; invest in adapters and controllers.
- Prefer message boundaries over direct calls; stable envelopes, swappable transports.
- Demos that feel like physical plumbing: tee, cutover, mux.
