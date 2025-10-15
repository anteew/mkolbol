# T6502 Digest Tests Decision

## Context
The `tests/digest/rulepacks.spec.ts` file exists but tests a feature that hasn't been implemented yet (DigestGenerator module in `src/digest/generator`).

## Decision
**EXCLUDE** digest tests from the threads lane.

## Rationale
1. The DigestGenerator module doesn't exist: `Failed to load url ../../src/digest/generator`
2. The test file appears to be a specification/blueprint for a future feature
3. Including it would cause immediate build failures
4. The test suite should only include tests for implemented features

## Implementation
- Kept `rulepacks` in the exclude pattern: `--exclude='**/{ptyServerWrapper,multiModalOutput,endpointsList,processMode,rulepacks}.spec.ts'`
- This exclusion remains in effect until the DigestGenerator feature is implemented

## Next Steps
When DigestGenerator is implemented:
1. Remove `rulepacks` from the exclude pattern
2. Verify tests pass in threads pool
3. Update this decision document
