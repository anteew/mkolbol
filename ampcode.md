Sprint SB-MK-WORKER-PIPE-P1 (P1)

Goal
- Implement a proper Worker data pipe adapter so worker-mode nodes have a real Duplex transport with backpressure and error propagation, then wire Executor 'worker' runMode to use it end‑to‑end with tests. Keep the kernel unchanged.

Constraints
- No kernel changes. Focus on `src/transport/worker/*`, `Executor` wiring, and tests.
- Maintain lane split; worker tests run in threads lane (unit) and forks lane (integration) as needed.

T5301 — WorkerPipeAdapter: full Duplex
- Outcome: `src/transport/worker/WorkerPipeAdapter.ts` implements Duplex over `MessagePort` with backpressure, pause/resume, end/close, and error propagation.
- DoD:
  - Implement `_read/_write/_final/_destroy`, buffering when paused, `drain` handling.
  - Mirror behavior of UnixPipeAdapter tests (where applicable) for parity.

T5302 — Executor wiring for worker-mode
- Outcome: Executor 'worker' runMode uses WorkerPipeAdapter for input/output pipes instead of ad‑hoc port wiring.
- DoD:
  - Update `src/executor/Executor.ts` in `instantiateWorkerNode` to construct pipes via WorkerPipeAdapter (both directions), preserving objectMode.

T5303 — Unit tests (threads lane)
- Outcome: Deterministic unit tests for WorkerPipeAdapter covering backpressure, bidirectional flow, and teardown.
- DoD:
  - New `tests/worker/workerPipe.spec.ts` (threads lane) with synthetic data cases.

T5304 — Integration test (forks lane)
- Outcome: Integration using Executor 'worker' runMode (Timer → Uppercase → Console) to validate end‑to‑end flow on WorkerPipeAdapter.
- DoD:
  - New `tests/integration/workerMode.spec.ts` gated if necessary, added to appropriate lane.

T5305 — Docs note
- Outcome: Brief section documenting worker data pipe behavior and how it compares to process-mode Unix pipes.
- DoD:
  - Append a short subsection to `docs/rfcs/stream-kernel/02-core-architecture.md` or add `docs/rfcs/stream-kernel/worker-mode.md`.

Verification (run locally)
- Build: `npm ci && npm run build`
- Threads: `npm run test:ci` — worker unit tests pass
- Forks: `npm run test:pty` — worker integration spec passes
- Artifacts: `reports/summary.jsonl`, relevant per‑case logs

Reporting
- Update `ampcode.log` with PASS/FAIL per task, file diffs, and verification commands. Do not branch/commit/push (VEGA handles git).
