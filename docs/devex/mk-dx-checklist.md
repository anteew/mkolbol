# MK Dev Orchestrator — DX Review Checklist (v0)

Use this checklist on every mk PR that changes CLI output, flags, errors, or docs.

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

## CI & Artifacts
- [ ] Laminar PR comment still aggregates.
- [ ] History cache keys remain stable.
- [ ] Reports written to `reports/` deterministically.

