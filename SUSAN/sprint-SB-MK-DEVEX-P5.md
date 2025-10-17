# Sprint Log — SB-MK-DEVEX-P5

- **Date:** 2025-10-16
- **Tasks:** T9501–T9505 (mkctl ergonomics + ANSI Parser polish)

## Highlights

- Added exit-code mapping, signal-aware shutdown, and hint-rich error reporting to `mkctl`.
- Expanded CLI test suite (duration parsing, error hints, runtime failure, SIGINT flow).
- Introduced `examples/ansi-parser-p3.ts` plus updated RFC docs/README for color, resize, and DEC mode demos.
- Removed stale `AnsiParser.ts.backup` file; ensured performance guard remains green.

## Verification

- `npm run build`
- `npx vitest run --reporter=default tests/cli/mkctlRun.spec.ts`
- `npx vitest run --reporter=default tests/transforms/ansiParser.*.spec.ts`
- `npx tsx examples/ansi-parser-p3.ts`

## Notes

- README now documents mkctl exit codes and links to the new ANSI parser demo.
- Friendly error hints cover missing files, YAML/JSON syntax, validation failures, runtime crashes, and CTRL+C interrupts.
