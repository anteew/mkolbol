Sprint SB-MK-CI-STABILIZE-P1 (Strict & Stable CI)

Goal
- Fix reporter exit behavior and remove best‑effort guards; make lanes strict and keep process‑mode as a separate enforcement step.

Constraints
- CI/test config only; no kernel changes.

T6501 — Reporter exit semantics fix
- Outcome: wrapper ensures exit code mirrors pass/fail when Laminar reporter is active.

T6502 — Threads lane strict
- Outcome: remove `continue-on-error`; finalize digest suite decision (shim or exclude + doc).

T6503 — Forks lane strict
- Outcome: remove `continue-on-error`; ensure stable behavior.

T6504 — Process‑mode enforcement step
- Outcome: harden processUnix spec (timeouts/retries); plan to make required after stability.

T6505 — Artifacts & raw logs
- Outcome: keep and document reports/*.txt and *_raw.log.

T6506 — Docs
- Outcome: docs/testing/ci.md capturing lanes/gates/run instructions.

Verification
- CI green with strict threads/forks; process‑mode experimental passes consistently.

Reporting
- Update `ampcode.log` with PASS/FAIL per task. Do not branch/commit/push — VEGA handles git.
