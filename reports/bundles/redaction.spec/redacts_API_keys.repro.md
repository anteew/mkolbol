# Reproduction Bundle: redacts API keys

**Generated:** 2025-10-12T20:18:06.206Z
**Status:** FAIL
**Duration:** 2ms
**Test File:** /srv/repos0/mkolbol/tests/digest/redaction.spec.ts

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

- **test.error** (2025-10-12T20:10:47.741Z)
  - expected 0 to be greater than 0
- **case.end** (2025-10-12T20:10:47.742Z)

## Reproduction Commands

**Run test:**
```bash
vitest run --reporter=verbose --pool=threads "/srv/repos0/mkolbol/tests/digest/redaction.spec.ts" -t "redacts API keys"
```

**View logs:**
```bash
npm run logq -- reports/redaction.spec/redacts_API_keys.jsonl
```

## Context Events

**Total context events:** 4

_See JSON bundle for full event details_
