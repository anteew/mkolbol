# Reproduction Bundle: handles nested secrets in complex objects

**Generated:** 2025-10-12T20:17:58.293Z
**Status:** FAIL
**Duration:** 1ms
**Test File:** /srv/repos0/mkolbol/tests/digest/rulepacks.spec.ts

## Environment

- **Seed:** none
- **Node:** v24.9.0
- **Platform:** linux x64

## Failure Summary

**Error:**
```
expected +0 to be 4 // Object.is equality
```

**Error Events:** 2

- **test.error** (2025-10-12T20:10:47.842Z)
  - expected +0 to be 4 // Object.is equality
- **case.end** (2025-10-12T20:10:47.843Z)

## Reproduction Commands

**Run test:**
```bash
vitest run --reporter=verbose --pool=threads "/srv/repos0/mkolbol/tests/digest/rulepacks.spec.ts" -t "handles nested secrets in complex objects"
```

**View logs:**
```bash
npm run logq -- reports/rulepacks.spec/handles_nested_secrets_in_complex_objects.jsonl
```

## Context Events

**Total context events:** 4

_See JSON bundle for full event details_
