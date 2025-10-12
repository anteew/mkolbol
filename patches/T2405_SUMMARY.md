# T2405: Digest Recognition for Ingested Go Failures - COMPLETE

## Status: ✅ VERIFIED

The digest generator **already works correctly** with ingested Go test data. No changes to the generator logic were needed - the existing rules handle Go events transparently.

## What Was Verified

1. **Event Recognition**: The default digest rules match Go test failures:
   - Rule matching `lvl: 'error'` catches Go `test.fail` events (which have `lvl: 'error'`)
   - Rule matching `evt` containing 'fail' catches `test.fail` events

2. **Suspect Scoring**: All suspect scoring mechanisms work correctly:
   - Error-level events get scored (Go test.fail has lvl='error')
   - Failure event detection works (evt='test.fail' includes 'fail')
   - Proximity scoring works for surrounding events
   - Correlation scoring works if events have corr field

3. **End-to-End Verification**: Successfully tested with actual Go fixture data:
   ```bash
   # Ingested Go test data with 1 failure (TestDivide)
   # Generated digest successfully:
   # - Identified test.fail event as top suspect (score: 80.0)
   # - Included error-level event in digest
   # - Generated both JSON and Markdown outputs
   ```

## Changes Made

### Documentation
- Added JSDoc comment to `DEFAULT_CONFIG` in `src/digest/generator.ts` explaining compatibility with ingested test data

### Test Coverage
- Added `tests/digest/digest.spec.ts` suite: "Go test ingestion compatibility"
  - Test 1: Verifies full end-to-end processing of Go test failures
  - Test 2: Verifies rule matching for Go test.fail events

## How It Works

The digest system is format-agnostic and works with any event structure that follows the Laminar event schema:

```typescript
interface DigestEvent {
  ts: number;      // Timestamp
  lvl: string;     // Level: 'info', 'error', etc.
  case: string;    // Test case name
  evt: string;     // Event type
  phase?: string;  // Optional phase
  payload?: any;   // Optional payload
}
```

Go ingestion produces events that match this schema:
- `test.fail` events have `lvl: 'error'` → caught by error-level rule
- `test.fail` events have `evt` containing 'fail' → caught by failure pattern rule
- All other fields (ts, case, phase, payload) work naturally with digest generator

## Verification Commands

```bash
npm run lam -- digest || true  # Processes any failures in reports/summary.jsonl
```

## Files Modified

- `src/digest/generator.ts` - Added documentation comment
- `tests/digest/digest.spec.ts` - Added Go compatibility tests
- `patches/DIFF_T2405_digest-go-recognition.patch` - Git patch

## Success Criteria Met

✅ Digest generator recognizes ingested Go test failures  
✅ Process Go-originated events in reports/ directory  
✅ Generate digests for Go test failures  
✅ Suspect scoring works for Go events  
✅ No special handling needed - works transparently  
✅ `npm run lam -- digest || true` works with ingested data

## Key Insight

The digest generator's design is already format-agnostic. As long as ingested data conforms to the Laminar event schema (ts, lvl, case, evt), all digest features work automatically. This demonstrates excellent architectural design - the plumbing was already in place.
