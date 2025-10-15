# Sprint: SB-MK-CI-STABILIZE-P1 — Make CI Strict & Stable

Owner: Susan
Status: Planned
Scope: CI config + reporter exit semantics + test gating (no kernel changes)

Goals
- Eliminate spurious exits and remove best‑effort guards. Make both lanes strict and keep process‑mode experimental only until hardening completes.

Tasks
- T6501 — Vitest/Laminar exit semantics
  - Reproduce the exit‑code quirk; fix by wrapping Laminar reporter so `process.exitCode` matches pass/fail when used as sole reporter. Add unit for wrapper.

- T6502 — Threads lane strict
  - Re-enable strict threads job (remove `continue-on-error`). Keep digest suite decision: either add a minimal `src/digest/generator.ts` shim or permanently exclude digest specs and document rationale.

- T6503 — Forks lane strict
  - Remove `continue-on-error` and run non‑experimental forks specs. Ensure stable output without stray interactive sequences.

- T6504 — Process‑mode enforcement step
  - Keep `tests/integration/processUnix.spec.ts` as a separate job; add health retries and longer timeouts. When green across 5 CI runs, flip it to required.

- T6505 — Artifacts & raw logs
  - Keep Laminar artifacts and *_raw.log capture. Add a small `reports/README.txt` describing contents for consumers.

- T6506 — Docs
  - Add `docs/testing/ci.md` summarizing lanes, gates, and how to run locally.

Success Criteria
- Both lanes pass without `continue-on-error` on PRs. Process‑mode experimental step passes consistently and is ready to be made required.

