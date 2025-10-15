Sprint SB-MK-ANSI-PARSER-P1 (Minimal ANSI Parser Transform)

Goal
- Implement a minimal VT100/xterm subset parser that converts raw ANSI into a structured terminal state for downstream transforms/outputs.

Constraints
- No kernel changes. New module lives under `src/transforms/` with its own tests.

T6401 — Parser core (P1 subset)
- Outcome: `src/transforms/AnsiParser.ts` handles printable, LF/CR, TAB, BS, SGR, CUP, CUU/CUD/CUF/CUB, ED/EL.

T6402 — Unit tests
- Outcome: `tests/parsers/ansiParser.spec.ts` covers core sequences deterministically.

T6403 — Integration wire-up
- Outcome: Example topology PTY → AnsiParser → ConsoleSink (and/or JSON sink); dual-path demo.

T6404 — Registry + example
- Outcome: Register capabilities and add a tiny runnable example.

T6405 — Docs
- Outcome: `docs/rfcs/stream-kernel/ansi-parser.md` outlining scope and P2 roadmap.

Verification (run locally)
- Build: `npm ci && npm run build`
- Threads: `npm run test:ci`
- Artifacts: Laminar reports for parser test cases

Reporting
- Update `ampcode.log` with PASS/FAIL per task. Do not branch/commit/push — VEGA handles git.
