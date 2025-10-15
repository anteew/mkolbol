Sprint SB-LAM-INTEGRATION-P2 (Dogfooding)

Goal
- Run Laminar over full test workflow and generate curated feedback artifacts + feature requests for Laminar.

Constraints
- No kernel changes. Consumption + feedback only.
- Keep worker-mode integration tests gated by default.

T6101 — Run dogfood (threads lane)
- Outcome: `npm run lam:dogfood:ci` generates summaries/trends + feedback markdown.

T6102 — Run dogfood (forks lane, gated)
- Outcome: `MK_PROCESS_EXPERIMENTAL=1 npm run lam:dogfood:pty` appends/refreshes feedback.

T6103 — Curate feature requests
- Outcome: `project-manager/laminar-feedback/feature-requests.md` with top 5 items.

T6104 — Log + handoff
- Outcome: ampcode.log updated with run details and links.

Verification (run locally)
- Build: `npm ci && npm run build`
- Threads: `npm run lam:dogfood:ci`
- Forks: `MK_PROCESS_EXPERIMENTAL=1 npm run lam:dogfood:pty`
- Artifacts: `reports/summary.jsonl`, `reports/index.json`, `reports/LAMINAR_*.txt`, `project-manager/laminar-feedback/latest.md`

Reporting
- Update `ampcode.log` with PASS/FAIL per task. Do not branch/commit/push — VEGA handles git.
