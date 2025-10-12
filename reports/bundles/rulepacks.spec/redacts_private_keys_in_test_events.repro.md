# Reproduction Bundle: redacts private keys in test events

**Generated:** 2025-10-12T20:17:58.291Z
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
expected 0 to be greater than 0
```

**Error Events:** 2

- **test.error** (2025-10-12T20:10:47.841Z)
  - expected 0 to be greater than 0
- **case.end** (2025-10-12T20:10:47.842Z)

## Reproduction Commands

**Run test:**
```bash
vitest run --reporter=verbose --pool=threads "/srv/repos0/mkolbol/tests/digest/rulepacks.spec.ts" -t "redacts private keys in test events"
```

**View logs:**
```bash
npm run logq -- reports/rulepacks.spec/redacts_private_keys_in_test_events.jsonl
```

## Context Events

**Total context events:** 4

_See JSON bundle for full event details_
