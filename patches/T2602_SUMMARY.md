# T2602: Flake Runner - N Reruns with Same Seed

## Implementation Summary

Added flake detection capability to `laminar-run.ts` to identify unstable tests by running them multiple times with the same seed.

## Changes Made

### scripts/laminar-run.ts
- Added `StabilityResult` type to track test stability metrics
- Added `runSilent()` function to run tests without output (after first run)
- Added `runFlakeDetection()` function that:
  - Runs tests N times (default 5) with fixed seed (42)
  - Tracks pass/fail counts per test location
  - Calculates stability scores (0-100%)
  - Reports flaky tests, always-fail tests, and stable tests
  - Saves detailed JSON report to `reports/stability-report.json`
  - Exits with error code if flaky or failing tests found
- Updated `main()` to handle `--flake-detect` or `--flake` flags with optional N parameter

## Usage

```bash
# Default: 5 runs per test
npm run laminar:run -- --flake-detect

# Custom number of runs
npm run laminar:run -- --flake 10

# Short form
npm run laminar:run -- --flake 3
```

## Output

The flake detection produces:
1. Console output showing:
   - Progress of each run
   - Flaky tests with stability percentage
   - Always-failing tests
   - Summary counts
2. JSON report saved to `reports/stability-report.json` containing:
   - Seed used
   - Number of reruns
   - Timestamp
   - Detailed results for each test

## Features Delivered

✅ `--flake-detect` flag (also accepts `--flake`)  
✅ N reruns with identical seed (default 5, configurable)  
✅ Stability score calculation (% successful runs)  
✅ Reports flaky tests (stability < 100%)  
✅ Stability scores in summary output  
✅ Normal `npm run laminar:run` still works  
✅ Detailed JSON report for further analysis

## Example Output

```
=== FLAKE DETECTION MODE (5 runs per test) ===

Run 1/5 (seed: 42)...
[test output]

Run 2/5 (seed: 42)...
[silent]

=== STABILITY REPORT ===

FLAKY TESTS:
  60% stable - tests/feature.spec.ts:45 (3/5 passed)
  80% stable - tests/timing.spec.ts:12 (4/5 passed)

ALWAYS FAIL:
  tests/broken.spec.ts:8 (0/5 passed)

SUMMARY: 142 stable, 2 flaky, 1 always fail

Detailed report saved to reports/stability-report.json
```

## Files Modified

- `scripts/laminar-run.ts` - Added flake detection logic

## Exit Behavior

- Exits with code 0 if all tests are stable (100% pass rate)
- Exits with code 1 if any flaky or always-failing tests detected
- This allows CI integration to fail on flaky tests
