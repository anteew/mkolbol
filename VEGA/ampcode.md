Sprint A — mkolbol alignment (P0)

T100 — Docs alignment
- Outcome: README reflects current status (early implementation + demos), fixed links to archived MCP RFC.
- DoD: README updated; link to archived/mcp-kernel/KERNEL_RFC.md fixed; quick “experimental” note under Installation.

T110 — Unify capability types
- Outcome: one source of truth for capability/capability query types across `src/types.ts` and `src/types/stream.ts`.
- DoD: types de-duplicated; imports updated; tests green.

T120 — Example coverage
- Outcome: each example has a minimal assertion-based test or a golden transcript where applicable.
- DoD: new/updated tests in tests/integration; CI runs green locally.

T130 — Hostess + wrappers docs
- Outcome: short doc or README section explaining Hostess, ExternalServerWrapper, and PTYServerWrapper with a runnable demo.
- DoD: docs added; `pnpm run dev:pty-wrapper` instructions verified.

T140 — Package surface
- Outcome: explicit exports for kernel, types, and key modules; note that APIs are experimental.
- DoD: index exports verified in dist; README lists what’s exported.

Notes
- Keep diffs small; prefer tests + docs to invasive changes.
- Kernel remains tiny; push semantics into modules.
