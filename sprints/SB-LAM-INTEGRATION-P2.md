# Sprint: SB-LAM-INTEGRATION-P2 — Dogfooding + Feedback Loop

Owner: Susan  
Status: Planned  
Scope: Scripts + PM feedback (no kernel changes)

Goals

- Run the full test workflow through Laminar and produce actionable feedback artifacts for the Laminar repo.

Tasks

- T6101 — Run dogfood (threads lane)
  - Command: `npm run lam:dogfood:ci`
  - Output: `reports/LAMINAR_*.txt`, `project-manager/laminar-feedback/latest.md`

- T6102 — Run dogfood (forks lane, process-mode gated)
  - Command: `MK_PROCESS_EXPERIMENTAL=1 npm run lam:dogfood:pty`
  - Output: refresh feedback files

- T6103 — Curate feature requests
  - Read `project-manager/laminar-feedback/latest.md` and draft top 5 feature requests in `project-manager/laminar-feedback/feature-requests.md` (bullets, links to artifacts).

- T6104 — Log + handoff
  - Update `ampcode.log` with what you ran and paste the feature request bullets.

Non-Goals

- Changing Laminar behavior; this is consumption + feedback only.

Success Criteria

- Feedback artifacts exist and are useful for the Laminar implementer to pick up.
