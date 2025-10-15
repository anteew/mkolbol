# Sprint: SB-LAM-INTEGRATION-P1 — Deep Laminar Integration (Dogfooding)

Owner: VEGA  
Status: Planned  
Scope: CI + Docs + Scripts (no kernel changes)

Goals
- Ensure Laminar is first-class in our test stack and CI artifacts.
- Make it trivial for agents (and humans) to consume summaries/trends locally and in CI.

Tasks
- T6001 — CI: Add `tests.yml` to run threads/forks lanes and emit Laminar artifacts.
  - Outcome: `.github/workflows/tests.yml` runs test lanes, writes `reports/LAMINAR_*.txt`, uploads artifacts.
- T6002 — Scripts: Convenience runners for local dogfooding.
  - Outcome: `npm run test:ci:lam`, `npm run test:pty:lam` generate summaries/trends.
- T6003 — Docs: Expand Laminar integration guide with dogfooding flow.
  - Outcome: Update `docs/testing/laminar-integration.md` with commands and artifact notes.
- T6004 — Readme note: Link to integration doc.
  - Outcome: Short section with pointers (no wall-of-text).
- T6005 — Sanity: Run both lanes + verify artifacts.
  - Outcome: Reports present; CI artifacts visible on PR.

Non-Goals
- Worker-mode gate changes (keep MK_WORKER_EXPERIMENTAL off in CI for now).
- Kernel or semantics changes.

Success Criteria
- CI job uploads Laminar artifacts for Node 20 and 24.
- Local `npm run test:ci:lam` and `npm run test:pty:lam` produce `reports/LAMINAR_*.txt`.

