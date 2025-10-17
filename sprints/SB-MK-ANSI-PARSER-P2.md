# Sprint: SB-MK-ANSI-PARSER-P2 — Parser Fidelity, UTF‑8, and Performance

Owner: Susan
Status: Planned
Scope: Parser enhancements + tests + docs (no kernel changes)

Goals

- Improve ANSI Parser fidelity (UTF‑8/wide chars, additional CSI/OSC handling), reduce allocations, and add scrollback + snapshot/export hooks.

Tasks

- T6451 — UTF‑8 & Wide Characters
  - Properly handle multi‑byte UTF‑8 and wide glyphs; update buffer indexing and wrapping logic.

- T6452 — Additional Sequences (P2)
  - Support DECSET/DECRST (subset: 25 cursor, 7 wrap), CSI SGR reset edge cases, RIS (full reset), and OSC title (ignored but consumed).

- T6453 — Scrollback & Snapshots
  - Add configurable scrollback and snapshot/export helpers for terminal state.

- T6454 — Performance Pass
  - Reduce allocations in hot paths; microbench harness with baseline vs improved numbers (budget: keep simple).

- T6455 — Tests
  - Expand tests in `tests/parsers/ansiParser.spec.ts` for UTF‑8/wide chars, DECSET/DECRST, RIS, and scrollback.

- T6456 — Docs
  - Update `docs/rfcs/stream-kernel/ansi-parser.md` with P2 coverage and perf notes.

Success Criteria

- New tests pass in threads lane; perf harness shows improvement over baseline.
- Parser remains API‑compatible; no kernel changes.
