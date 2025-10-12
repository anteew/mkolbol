Sprint A — mkolbol alignment (P0)

T100 — Docs alignment
- Outcome: README reflects current status (early implementation + demos), fixed links to archived MCP RFC.
- DoD: README updated; link to archived/mcp-kernel/KERNEL_RFC.md fixed; quick “experimental” note under Installation.

T110 — Unify capability types
- Outcome: one source of truth for capability/capability query types across `src/types.ts` and `src/types/stream.ts`.
- DoD: types de-duplicated; imports updated; tests green.

T120 — Example coverage
- Outcome: each example has a minimal assertion-based test or a golden transcript where applicable.
- DoD: new/updated tests in tests/integration; CI runs green locally.

T130 — Hostess + wrappers docs
- Outcome: short doc or README section explaining Hostess, ExternalServerWrapper, and PTYServerWrapper with a runnable demo.
- DoD: docs added; `pnpm run dev:pty-wrapper` instructions verified.

T140 — Package surface
- Outcome: explicit exports for kernel, types, and key modules; note that APIs are experimental.
- DoD: index exports verified in dist; README lists what’s exported.

Notes
- Keep diffs small; prefer tests + docs to invasive changes.
- Kernel remains tiny; push semantics into modules.

Sprint B — Control Plane + Isolation (P0→P1)

T150 — ControlBus adapters + Worker-mode (Phase 1)
- Outcome: message-based control works across worker isolates with stable envelope and topics. Pipe + control adapters for workers.
- DoD: ControlBusAdapter + PipeAdapter interfaces; worker-backed adapters (MessagePort); Executor runMode 'worker' with handshake; demo mixing inproc + worker servers.

T160 — Hostess control endpoints
- Outcome: Hostess guest book includes control endpoint metadata for each server (type + coordinates) so tools can discover how to talk to them.
- DoD: Executor registers control endpoint details; Hostess entries show control transport and topic/subject prefix.

T170 — Examples + docs refresh
- Outcome: Example config uses runMode (inproc + worker); README/VEGA docs explain control endpoints and run modes.
- DoD: Updated examples and a brief doc section; scripts verified.

T180 — Process-mode (Phase 2)
- Outcome: Unix/TCP adapters for control and pipes; Executor runMode 'process' with restart policy and blue/green cutover.
- DoD: minimal process adapter + demo; graceful cutover path proved.

T190 — Broker adapter (optional)
- Outcome: NATS (or MQTT) ControlBus adapter pluggable via config; inproc demos remain default.
- DoD: adapter + toggle; control frames unchanged.

Architect Review — SB-CTRL-ISOLATION-P1 (Phase 1)

Status: PASS

What landed
- ControlBus behind adapters (InProc, Worker) with stable frame schema.
- PipeAdapter in kernel (InProc, Worker) — kernel remains minimal.
- Executor runMode 'worker' with harness + hello handshake.
- Mixed-mode demo (inproc + worker) runs cleanly; Hostess registration intact.
- Basic adapter tests added (note: vitest runner may need single-thread config under Node 24).

Notes / follow-ups
- Tweak worker shutdown to exit code 0 on graceful stop (cosmetic).
- Optional: adjust ConsoleSink to JSON.stringify objects in demos.
- Next: Hostess control endpoints; then process-mode + blue/green.
