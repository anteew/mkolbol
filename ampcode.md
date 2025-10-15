Sprint SB-MK-PROCESS-IO-P3 (Process‑mode I/O Hardening)

Goal
- Implement real process‑mode I/O over Unix domain sockets with backpressure and error propagation; add health checks and blue/green cutover.

Constraints
- No kernel changes. Focus on `src/transport/unix/*`, `src/executor/Executor.ts`, and tests.
- Keep process-mode specs gated via `MK_PROCESS_EXPERIMENTAL=1` until stable.

T6301 — UnixPipeAdapter (Duplex over UDS)
- Outcome: `_read/_write/_final/_destroy`, pause/resume, end/close, error propagation.

T6302 — UnixControlAdapter (heartbeats + pub/sub)
- Outcome: `control.*` topics, periodic heartbeat, graceful shutdown.

T6303 — Executor(process) wiring + cutover
- Outcome: Spawn child + attach adapters; add drain→switch→teardown sequence and heartbeat timeouts.

T6304 — Integration tests (gated)
- Outcome: `tests/integration/processUnix.spec.ts` covers load, error propagation, teardown ordering, heartbeat recovery.

T6305 — Parity vs Worker
- Outcome: parity tests to align Unix vs Worker semantics (pause/resume, end/close, error timing).

T6306 — Docs
- Outcome: adapter and cutover notes in RFC docs.

Verification (run locally)
- Build: `npm ci && npm run build`
- Threads: `npm run test:ci`
- Forks: `MK_PROCESS_EXPERIMENTAL=1 npm run test:pty`
- Artifacts: Laminar reports in `reports/` (summary/index) + CI artifacts

Reporting
- Update `ampcode.log` with PASS/FAIL per task. Do not branch/commit/push — VEGA handles git.
