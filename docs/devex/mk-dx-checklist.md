# MK Dev Orchestrator — DX Review Checklist (v1.0)

**Status**: Finalized | **Last Updated**: 2025-10-17 | **Phase**: Local Node v1.0

Use this checklist on every PR that changes CLI output, flags, errors, or docs. Enforced by `mk-dx-style.md` snapshot tests.

## Quick Pass
- [ ] TTFR still ≤ 60s on fresh clone (Hello preset).
- [ ] `mk run --dry-run` still < 400ms on example.
- [ ] No unexplained new flags; help updated.

## Help & Discoverability
- [ ] `mk --help` sections present and ordered.
- [ ] Each new flag has an example.
- [ ] Did‑you‑mean suggestions trigger for common typos.

## Errors & Microcopy
- [ ] Errors follow 3‑line pattern (status, fix, docs+code+rerun).
- [ ] Exit codes mapped and documented.
- [ ] `--json` payload includes { code, message, remediation, details, docs, hint }.

## Accessibility
- [ ] `--no-ansi` looks clean; tokens readable.
- [ ] ASCII graph path tested.
- [ ] No red/green dependency.

## Prompt
- [ ] `mk prompt print` emits correct snippet.
- [ ] `mk prompt off` restores prior prompt.
- [ ] `.mk/state/prompt.json` updates predictably.

## Docs
- [ ] DX style guide rules followed.
- [ ] New docs link to stable anchors.
- [ ] Examples are copy‑paste runnable.

## Snapshot Tests
- [ ] Help text snapshot (mkdxHelp.spec.ts) passes without unintended changes.
- [ ] Error output snapshot (mkdxErrors.spec.ts) passes with all error codes validated.
- [ ] Run `npm run test:ci -- tests/cli/mkdx*.spec.ts` to verify snapshots.
- [ ] Any approved snapshot changes are documented in PR description.

## CI & Artifacts
- [ ] Laminar PR comment still aggregates.
- [ ] History cache keys remain stable.
- [ ] Reports written to `reports/` deterministically.

---

## Reference

For implementation guidance, see **[mk-dx-style.md](./mk-dx-style.md#snapshot-testing-scaffolds)** — Snapshot Testing Scaffolds section.

**Snapshot Test Files**:
- `tests/cli/mkdxHelp.spec.ts` — Help output consistency (scaffold mode)
- `tests/cli/mkdxErrors.spec.ts` — Error format consistency (active)

