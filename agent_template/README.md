# Agent Templates — amp + Workers

This folder defines how we collaborate with agents on the Xenomorph repo.

Roles
- amp (master): persistent coordinator. Reads tasks, plans waves, supervises workers, writes status.
- Workers (ephemeral): e.g., claude, gemini. They live only for their task, produce patches/logs, and exit.

Canonical Files
- amp tasks: `ampcode.md` (use agent_template/AMPCODE_TEMPLATE.md as the source-of-truth template). amp reads this, executes waves, and writes `ampcode.log`.
- amp oracle: `ampcode-oracle.msg` (optional gate). amp asks an oracle LLM for advice, writes the message here, and waits for the Architect’s approval.
- logs: keep `ampcode.log` at repo root; store worker logs under `reports/` (e.g., `reports/claude.log`, `reports/gemini.log`).
- patches: workers should emit unified diffs named `DIFF_<AGENT>_Txxxx_<slug>.patch` under `patches/` and also apply changes in-tree.

Waves & Tasks
- Use waves to group parallelizable tasks: each wave lists `tasks: [T1234, ...]`, `parallel: true|false`, `depends_on` when needed.
- Each task must include:
  - Title + brief “why”
  - Allowed Files (tight scope)
  - Forbidden Files (if any)
  - Steps (bullet, crisp, verifiable)
  - Verify Commands (go test/build; perf tools as needed)
  - Deliverables (code, tests, docs, patches)

Expected Outputs
- amp: updates `ampcode.log` with wave/task results (PASS/FAIL, timings, summaries). If using oracle, writes `ampcode-oracle.msg` before dispatch.
- workers: create code changes + `patches/DIFF_*.patch`, run Verify Commands, and write a concise log (stdout → `reports/<agent>.log`).

Conventions
- IDs: `Txxxx` for tasks, `Dxx` for design docs/sprints, `Wave A/B/...` for grouping.
- Provenance: builds should embed version info where applicable (e.g., `-ldflags` for Go version strings), and perf runs should record seeds.
- Binaries: never commit compiled binaries or build caches. `.gitignore` should cover `*.pprof`, `trace.out`, and Go `.gocache`.
- Determinism: prefer seeded runs for reproducible ordering; don’t assert bitwise-equal timings.

Go/Perf Quick Commands
- Build (per module): `go build ./...`
- Test (all): `go test ./...`
- Perf bundle (example): `bash scripts/xpf-make-bundle.sh /tmp/xr real_report-big.scm`
- Profiler report: `tools/xeno-prof/xeno-prof --bundle /tmp/xr`

Guardrails
- New features require tests and docs. Do not degrade first-time user experience.
- Keep changes minimal, cohesive, and reversible.
- If a wave is risky, require the oracle checkpoint and Architect approval before dispatch.

How to Use
1) Architect authors `ampcode.md` from `agent_template/AMPCODE_TEMPLATE.md`.
2) amp validates, obtains `ampcode-oracle.msg` if required, then dispatches waves.
3) Workers apply patches, run Verify Commands, and write logs. amp aggregates in `ampcode.log`.
4) Architect validates changes, then iteration continues.


Tooling
- Use tools/xeno-validate to lint agent files: `GOWORK=off go build ./tools/xeno-validate` then `./xeno-validate file.md`


Canonical Plan
- Prefer `ampcode.json` at repo root (pure JSON).
- `ampcode.md` is optional; if used, begin with a fenced ```json block containing the same plan.
- Validators: `tools/xeno-validate` parses either and emits a normalized plan.
Logging Standard
- Format: JSON Lines (one JSON object per line).
- Files: write to `reports/<agent>.log.jsonl` (e.g., `reports/claude.log.jsonl`).
- Required keys per entry:
  - `ts` (RFC3339 UTC), `agent`, `taskId`, `waveId` (optional), `event` (e.g., step|cmd|result), `level` (info|warn|error), `message`.
  - `exception` (boolean) and `error` (object) when an exception occurs; include `type`, `detail`, optional `stack`.
- Example:
```json
{"ts":"2025-10-09T15:40:00Z","agent":"claude","taskId":"T3001","event":"cmd","level":"info","message":"go test ./xenolang/...","exception":false}
{"ts":"2025-10-09T15:41:02Z","agent":"claude","taskId":"T3001","event":"result","level":"error","message":"tests failed","exception":true,"error":{"type":"TestFailure","detail":"2 failing"}}
```
- Discovery: scan exceptions via `jq 'select(.exception==true)' reports/*.log.jsonl` or the `xeno-logscan` tool.
