# Reproduction Bundle: should have matching test count between index and summary

**Generated:** 2025-10-12T20:21:15.247Z
**Status:** FAIL
**Duration:** 9ms
**Test File:** /srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts

## Environment

- **Seed:** none
- **Node:** v24.9.0
- **Platform:** linux x64

## Failure Summary

**Error:**
```
expected 1 to be greater than or equal to 48
```

**Error Events:** 2

- **test.error** (2025-10-12T19:27:54.576Z)
  - expected 1 to be greater than or equal to 48
- **case.end** (2025-10-12T19:27:54.577Z)

## Reproduction Commands

**Run test:**
```bash
vitest run --reporter=verbose --pool=threads "/srv/repos0/mkolbol/tests/laminar/coreReporter.spec.ts" -t "should have matching test count between index and summary"
```

**View logs:**
```bash
npm run logq -- reports/coreReporter.spec/should_have_matching_test_count_between_index_and_summary.jsonl
```

**Digest file:**
`reports/coreReporter.spec/should_have_matching_test_count_between_index_and_summary.digest.md`

## Context Events

**Total context events:** 4

_See JSON bundle for full event details_
