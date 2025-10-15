# Sprint: SB-MK-DIGEST-GENERATOR-P1 — Minimal Digest Generator + Rulepacks

Owner: Susan
Status: Planned
Scope: Implement minimal digest generator to re‑enable digest tests; add basic rulepacks and redaction stub (no kernel changes)

Goals
- Provide `src/digest/generator.ts` with a minimal but typed `DigestGenerator` that reads JSONL logs, applies include/exclude rules, and emits a digest suitable for the existing digest tests.

Tasks
- T6601 — Types & Interfaces
  - Define `DigestEvent`, `DigestConfig`, `DigestRule`, `DigestOutput` in `src/digest/types.ts`.

- T6602 — Minimal Generator
  - Implement `DigestGenerator` with `generateDigest(caseName, outcome, endTs, location, artifactPath)` that:
    - Reads JSONL from `artifactPath`.
    - Applies ordered rules: `match` (object subset), actions: `include`/`exclude`.
    - Produces `DigestOutput` with selected events, basic metadata, and counts.

- T6603 — Rulepacks (node-defaults)
  - Ship `src/digest/rulepacks/node-defaults.ts` with a small set of useful defaults (errors, asserts, stack-like messages). Allow `rules: [...]` override/extend.

- T6604 — Redaction stub
  - Add a simple redaction function (regex‑based) to mask obvious tokens (e.g., sk_*, ghp_*, JWT‑like) to satisfy tests that expect redaction; keep pluggable.

- T6605 — Tests
  - Ensure `tests/digest/rulepacks.spec.ts` passes with the new generator. If tests require additional fields, extend `DigestOutput` minimally to satisfy assertions.

Success Criteria
- `npm run test:ci` passes digest suite without excluding it.
- Generator is small, typed, and documented; no kernel changes.

