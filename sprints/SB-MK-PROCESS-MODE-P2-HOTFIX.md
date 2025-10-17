Sprint SB-MK-PROCESS-MODE-P2-HOTFIX (P0)

Goal

- Stabilize the few failing specs after Process‑mode P2 by tightening shutdown semantics, avoiding unnecessary drains for in‑proc modules, and fixing a spec API usage. Keep the kernel untouched.

Constraints

- Do not change kernel semantics. Focus on Executor/adapters/tests.
- Keep lanes split: threads (test:ci) excludes PTY/process; forks (test:pty) runs them with MK_PROCESS_EXPERIMENTAL=1.

T5001 — Executor: skip drain for in‑proc; optional test override

- Outcome: `executor.down()` no longer spends 3s per in‑proc node; threads‑lane executor specs finish under 5s without raising their timeouts. Also accept `MK_EXECUTOR_DRAIN_MS` env to shorten drains in tests.
- DoD:
  - Change `src/executor/Executor.ts` in `gracefulShutdown()` and `cutover()`:
    - Only wait `drainTimeout` when `instance.worker` or `instance.process` is present.
    - Read optional `process.env.MK_EXECUTOR_DRAIN_MS` once (number) and use it to override `drainTimeout` for those cases.
  - Do not alter public kernel APIs.
  - `tests/executor/executor.spec.ts` — both cases “should instantiate modules and register with hostess” and “should wire connections via StateManager” pass in threads lane without increasing per‑test timeout.

T5002 — UnixControlAdapter: reliable shutdown flush

- Outcome: Publishing `shutdown` reliably reaches the peer before close; flaky assertions disappear.
- DoD:
  - `src/transport/unix/UnixControlAdapter.ts`:
    - In `shutdown()`: `socket.write(payload, cb)` then `socket.end()` in the callback; remove `destroy()` in the normal path.
    - In `close()`: prefer `end()` over `destroy()` when possible; clear timers; stop heartbeats; close server cleanly.
  - Keep heartbeat/publish semantics unchanged.
  - `tests/integration/processUnix.spec.ts`:
    - If still marginal, increase the wait after `shutdown()` from 150ms → 250ms.
  - The two tests “should handle graceful shutdown sequence” and “should coordinate teardown of pipe and control adapters” pass consistently in forks lane.

T5003 — Spec fix: StateManager API

- Outcome: Process‑mode integration spec uses the correct API.
- DoD:
  - Update `tests/integration/processMode.spec.ts` to use `stateManager.getTopology()` instead of `getState()` and adapt assertions (access `nodes` from topology result).
  - Ensure the spec passes with `MK_PROCESS_EXPERIMENTAL=1`.

T5004 — Sanity docs note (optional)

- Outcome: Brief note documents drain behavior and the `MK_EXECUTOR_DRAIN_MS` override for tests.
- DoD: Append a small subsection under “Process Mode” in `README.md` describing drain behavior (in‑proc vs worker/process) and the env override, targeted at test writers.

Verification (run locally)

- Build: `npm ci && npm run build`
- Threads lane: `npm run test:ci` — zero failures
- Forks lane: `MK_PROCESS_EXPERIMENTAL=1 npm run test:pty` — zero failures
- Artifacts to check:
  - `reports/summary.jsonl`
  - `reports/executor.spec/*.jsonl` for the two formerly timing‑out tests
  - `reports/processUnix.spec/*.jsonl` for shutdown tests
  - `reports/processMode.spec/should_spawn_and_manage_process_lifecycle.jsonl`

Reporting

- Update `ampcode.log` with PASS/FAIL per task, file diffs, and the verification commands above. Note that VEGA handles git (do not branch/commit/push).
