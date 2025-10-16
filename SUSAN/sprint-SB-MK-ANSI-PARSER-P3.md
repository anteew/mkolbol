# Sprint Log — SB-MK-ANSI-PARSER-P3

- **Date:** 2025-10-18
- **Tasks:** T9001–T9005 (ANSI parser P3 upgrades)

## Highlights
- Added precomputed 256-color palette and truecolor hex helpers to `AnsiParser`, including caching for RGB conversions.
- Implemented resize management with `cols`/`rows` options, `resize()` API, CSI 8;rows;cols t handling, and cursor clamping.
- Tracked minimal DEC private modes (DECAWM, DECSCNM) with new state flags and auto-wrap behavior.
- Wrote targeted Vitest suites for colors, resize invariants, DEC modes, and lightweight performance guards (palette + truecolor loops).
- Updated `docs/rfcs/stream-kernel/ansi-parser.md` to document the new behaviors and state fields.

## Verification
- `npx vitest run --reporter=default tests/transforms/ansiParser.*.spec.ts`
- Manual inspection of generated patch files under `patches/DIFF_T900[1-5]_*.patch`

## Notes
- Performance guard thresholds set to 75ms to avoid flakiness while still flagging regressions.
- State snapshots now include `autoWrap` and `screenInverse`; downstream consumers may need to read these flags when rendering.
