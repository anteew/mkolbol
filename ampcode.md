Sprint SB-MK-ANSI-PARSER-P2 (Fidelity + UTF‑8 + Perf)

Goal
- Improve parser fidelity (UTF‑8/wide chars and more control sequences), add scrollback/snapshots, and reduce allocations.

Constraints
- No kernel changes. Keep changes scoped to parser + tests + docs.

T6451 — UTF‑8 & Wide Characters
- Outcome: multi‑byte handling + correct wrapping/indexing.

T6452 — Additional Sequences
- Outcome: DECSET/DECRST subset, RIS, OSC consume.

T6453 — Scrollback & Snapshots
- Outcome: configurable scrollback and snapshot/export helpers.

T6454 — Performance Pass
- Outcome: microbench shows reduced allocations/latency vs baseline.

T6455 — Tests
- Outcome: expanded tests for UTF‑8, DECSET/DECRST, RIS, scrollback.

T6456 — Docs
- Outcome: updated ansi-parser.md with P2 coverage.

Verification (run locally)
- Build: `npm ci && npm run build`
- Threads: `npm run test:ci`
- Artifacts: Laminar reports reflect expanded parser tests

Reporting
- Update `ampcode.log` with PASS/FAIL per task. Do not branch/commit/push — VEGA handles git.
