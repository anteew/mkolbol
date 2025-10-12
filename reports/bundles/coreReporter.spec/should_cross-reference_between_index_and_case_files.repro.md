# Reproduction Bundle: should cross-reference between index and case files

**Generated:** 2025-10-12T20:17:58.290Z
**Status:** FAIL
**Duration:** 4ms
**Test File:** /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts

## Environment

- **Seed:** none
- **Node:** v24.9.0
- **Platform:** linux x64

## Failure Summary

**Error:**
```
expected 1 to be 4 // Object.is equality
```

**Error Events:** 2

- **test.error** (2025-10-12T20:10:47.833Z)
  - expected 1 to be 4 // Object.is equality
- **case.end** (2025-10-12T20:10:47.834Z)

## Reproduction Commands

**Run test:**
```bash
vitest run --reporter=verbose --pool=threads "/srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts" -t "should cross-reference between index and case files"
```

**View logs:**
```bash
npm run logq -- reports/coreReporter.spec/should_cross-reference_between_index_and_case_files.jsonl
```

**Digest file:**
`reports/coreReporter.spec/should_cross-reference_between_index_and_case_files.digest.md`

## Context Events

**Total context events:** 4

_See JSON bundle for full event details_
