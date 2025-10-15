# Sprint: SB-MK-PROCESS-IO-P3 — Process‑mode I/O Hardening & Parity

Owner: Susan
Status: Planned
Scope: Executor(process), Unix adapters, tests, docs (no kernel changes)

Goals
- Provide a real process‑mode data path using Unix domain sockets with backpressure and error propagation, achieving parity with WorkerPipeAdapter behavior.

Tasks
- T6301 — UnixPipeAdapter: real Duplex over Unix domain sockets
  - Implement `_read/_write/_final/_destroy`, backpressure (pause/resume), end/close, error propagation.
  - File: `src/transport/unix/UnixPipeAdapter.ts` (currently stubs)

- T6302 — UnixControlAdapter: heartbeats + pub/sub
  - Topic-based publish/subscribe (`control.*`), periodic heartbeats, graceful shutdown.
  - File: `src/transport/unix/UnixControlAdapter.ts` (fill stubs)

- T6303 — Executor(process): wire adapters + cutover
  - In `Executor.instantiateProcessNode`: spawn child, attach UnixPipeAdapter for input/output, UnixControlAdapter for control.
  - Add blue/green cutover (drain → switch → teardown) and health checks (heartbeat timeouts).
  - File: `src/executor/Executor.ts`

- T6304 — Tests: process Unix integration (gated)
  - Add/extend `tests/integration/processUnix.spec.ts`:
    - heavy writes under load (backpressure),
    - error propagation (child crash mid-stream),
    - teardown ordering (no data loss),
    - heartbeat timeout recovery.
  - Gate with `MK_PROCESS_EXPERIMENTAL=1` initially.

- T6305 — Parity checks vs Worker
  - Add targeted tests comparing WorkerPipeAdapter vs UnixPipeAdapter semantics for pause/resume, end/close, and error timing.

- T6306 — Docs
  - Update `docs/rfcs/stream-kernel/02-core-architecture.md` and/or add `docs/rfcs/stream-kernel/process-mode.md` with adapter behavior and cutover notes.

Success Criteria
- `processUnix.spec.ts` passes with `MK_PROCESS_EXPERIMENTAL=1`.
- Backpressure and error propagation match WorkerPipeAdapter semantics.
- Executor process cutover drains data without loss.

Out of Scope
- Kernel changes (keep core inert).
- Ungating worker-mode tests (handled separately when stable).

