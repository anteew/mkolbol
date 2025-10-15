Sprint SB-MK-PROCESS-MODE-ENFORCE-P1 (Make process-mode required in CI)

Goal
- Promote process-mode from monitored to required in CI by hardening health checks/timeouts and stabilizing the forks lane.

Constraints
- No kernel changes. Scope to Executor process-mode, Unix adapters, tests, and CI workflow.

T7101 — Tests: stabilize process-mode spec
- Outcome: `tests/integration/processUnix.spec.ts` uses explicit withTimeout/heartbeat tolerances and reliable teardown; eliminate flake under load.

T7102 — Executor: heartbeat/cutover tuning
- Outcome: `src/executor/Executor.ts` adjusts heartbeat grace (missed-N policy) and cutover drain timeout; emits precise diagnostics on timeout.

T7103 — Unix adapters: backpressure + error propagation
- Outcome: `src/transport/unix/UnixPipeAdapter.ts` and `UnixControlAdapter.ts` confirm Duplex `_read/_write` backpressure and forward `error`/`close` consistently.

T7104 — CI: make forks lane strict
- Outcome: `.github/workflows/tests.yml` forks lane becomes required (remove `continue-on-error`); keep process-mode enforcement as a named, required job.

T7105 — Docs & artifacts
- Outcome: README/CI notes updated to reflect enforcement; Laminar artifacts + raw logs remain uploaded for ROI analysis.

Verification
- Threads: `npm run test:ci` (green; digest suite included)
- Forks: `MK_PROCESS_EXPERIMENTAL=1 npm run test:pty` green locally; CI forks lane required and green in ≥3 consecutive runs

Acceptance
- CI on PRs/main requires forks lane (process-mode) and passes without retries.

Reporting
- Update `ampcode.log` with PASS/FAIL per task. VEGA will handle PR once green window is observed.
