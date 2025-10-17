# Sprint: SB-MK-ANSI-PARSER-P1 — Minimal ANSI Parser Transform (P1)

Owner: Susan
Status: Planned
Scope: New transform module + unit/integration tests + docs (no kernel changes)

Goals

- Implement a minimal VT100/xterm subset parser that converts raw ANSI byte streams into a simple structured terminal state for downstream consumers.

Deliverables

- Transform module: `src/transforms/AnsiParser.ts`
  - Input: `raw-ansi` (Buffer/string)
  - Output: `terminal-state` (JSON: text buffer, cursor {x,y}, attrs, events)
  - Register capabilities: accepts: [raw-ansi], produces: [terminal-state]

Tasks

- T6401 — Parser core (P1 subset)
  - Handle: printable chars, LF/CR, TAB, BS, SGR (colors + reset), CUP, CUU/CUD/CUF/CUB, ED/EL.
  - Internal model: fixed cols/rows with simple scrollback; clamp + wrap behavior.

- T6402 — Unit tests (deterministic)
  - File: `tests/parsers/ansiParser.spec.ts`
  - Cases: regular text, newline/wrap, cursor moves, ED/EL, SGR on/off, backspace, tabs.

- T6403 — Integration wire-up
  - Topology: PTY → AnsiParser → ConsoleSink (and/or JSON sink).
  - Verify: Parser emits terminal-state; raw → screen remains unchanged (dual-path example).

- T6404 — Service registry + examples
  - Register capabilities and add a tiny example under `examples/` to pipe a sample ANSI log through the parser.

- T6405 — Docs (short)
  - Add `docs/rfcs/stream-kernel/ansi-parser.md`: scope, supported sequences, limitations, future P2/P3.

Success Criteria

- All new unit tests pass in threads lane.
- Integration demo runs locally; Laminar artifacts include parser cases.
- No kernel changes; transform is isolated and swappable.

Out of Scope (P1)

- Full xterm emulation, DEC private modes, advanced attributes, UTF-8 wide glyphs (note as P2/P3).
