Sprint SB-LAM-INTEGRATION-P1 (Intermediate)

Goal
- Deeply integrate Laminar into our testing stack (threads + forks lanes), generate summaries/trends as CI artifacts, and make dogfooding trivial for agents.

Constraints
- No kernel changes. Keep scope to scripts, CI, and docs.
- Keep worker-mode integration tests gated (MK_WORKER_EXPERIMENTAL off by default in CI) until a later hardening sprint.

T6001 — CI workflow for Laminar artifacts
- Outcome: `.github/workflows/tests.yml` runs both lanes, then emits `reports/LAMINAR_SUMMARY.txt` and `reports/LAMINAR_TRENDS.txt` and uploads `reports/`.

T6002 — Local convenience scripts
- Outcome: `npm run test:ci:lam` and `npm run test:pty:lam` run lanes and produce summaries/trends locally.

T6003 — Docs update
- Outcome: `docs/testing/laminar-integration.md` expanded with dogfooding flow and artifact notes.

T6004 — README pointers
- Outcome: Short “CI & Testing” section pointing to Laminar integration and dogfooding commands.

T6005 — Verify artifacts
- Outcome: Run locally to produce `reports/LAMINAR_*.txt`; confirm CI uploads on PR.

Verification (run locally)
- Build: `npm ci && npm run build`
- Threads: `npm run test:ci` (or `npm run test:ci:lam` for artifacts)
- Forks: `MK_PROCESS_EXPERIMENTAL=1 npm run test:pty` (or `npm run test:pty:lam` for artifacts)
- Artifacts: `reports/summary.jsonl`, `reports/index.json`, `reports/LAMINAR_*.txt`

Reporting
- Update `ampcode.log` with PASS/FAIL per task. Do not branch/commit/push — VEGA handles git.
