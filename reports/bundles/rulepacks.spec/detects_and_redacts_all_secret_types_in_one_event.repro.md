# Reproduction Bundle: detects and redacts all secret types in one event

**Generated:** 2025-10-12T20:17:58.293Z
**Status:** FAIL
**Duration:** 5ms
**Test File:** /srv/repos0/mkolbol/tests/digest/rulepacks.spec.ts

## Environment

- **Seed:** none
- **Node:** v24.9.0
- **Platform:** linux x64

## Failure Summary

**Error:**
```
expected +0 to be 6 // Object.is equality
```

**Error Events:** 2

- **test.error** (2025-10-12T20:10:47.841Z)
  - expected +0 to be 6 // Object.is equality
- **case.end** (2025-10-12T20:10:47.842Z)

## Reproduction Commands

**Run test:**
```bash
vitest run --reporter=verbose --pool=threads "/srv/repos0/mkolbol/tests/digest/rulepacks.spec.ts" -t "detects and redacts all secret types in one event"
```

**View logs:**
```bash
npm run logq -- reports/rulepacks.spec/detects_and_redacts_all_secret_types_in_one_event.jsonl
```

## Context Events

**Total context events:** 4

_See JSON bundle for full event details_
