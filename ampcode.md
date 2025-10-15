Sprint SB-MK-DIGEST-GENERATOR-P1 (Minimal Digest Generator)

Goal
- Implement a minimal digest generator and rulepacks so the digest tests run in the threads lane without exclusions.

Constraints
- New code under `src/digest/*`; no kernel changes.

T6601 — Types & interfaces
- Outcome: `src/digest/types.ts` defines `DigestEvent`, `DigestConfig`, `DigestRule`, `DigestOutput`.

T6602 — Minimal generator
- Outcome: `src/digest/generator.ts` with `DigestGenerator.generateDigest(...)` reading JSONL and applying include/exclude rules.

T6603 — Rulepacks
- Outcome: `src/digest/rulepacks/node-defaults.ts` with a small useful default set.

T6604 — Redaction stub
- Outcome: simple regex‑based redaction for common secrets; pluggable.

T6605 — Tests
- Outcome: `tests/digest/rulepacks.spec.ts` passes; threads lane no longer excludes digest.

Verification
- Build: `npm ci && npm run build`
- Threads: `npm run test:ci` includes digest suite and passes

Reporting
- Update `ampcode.log` with PASS/FAIL per task. Do not branch/commit/push — VEGA handles git.
