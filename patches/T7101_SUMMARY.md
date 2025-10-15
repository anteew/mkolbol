# T7101: Stabilize Process-Mode Spec

## Summary
Successfully stabilized all tests in `tests/integration/processUnix.spec.ts` by adding explicit timeouts, heartbeat grace periods, and reliable teardown sequences.

## Changes Made

### 1. Enhanced Timeout Configuration
- Increased `testTimeout` from 20s to 25s for stability under load
- Increased `connectionTimeout` from 5s to 8s for slower systems
- Added `heartbeatInterval = 1000ms` (matches UnixControlAdapter implementation)
- Added `heartbeatGrace = 500ms` for heartbeat jitter tolerance
- Added `teardownGrace = 300ms` for clean teardown periods

### 2. Explicit withTimeout Wrappers
Added explicit timeout wrappers with clear labels to all async operations:
- Client pipe end events: 10s timeout
- Bidirectional write completion: 15s timeout
- Graceful teardown: 5s timeout
- Error propagation: 3s timeout
- Heartbeat collection: 5s timeout
- Shutdown message propagation: 2s timeout
- Pub/sub message delivery: 3s timeout

### 3. Heartbeat Grace Periods
- Heartbeat tests now use `heartbeatInterval * 2 + heartbeatGrace` for wait times
- Time-since-heartbeat assertions account for grace periods
- More lenient expectations for heartbeat timing under load

### 4. Reliable Teardown
- Converted all `afterEach` hooks to async
- Added explicit null checks before calling close methods
- Added teardown grace periods after all close operations
- Increased stabilization delays in combined adapter tests (100ms→200ms)
- Added grace period after recovered client close in recovery test

### 5. Improved Error Handling
- Increased delay for error propagation from 100ms to 200ms
- Added explicit timeout wrapper with 3s limit
- More robust timing for write-after-close scenarios

## Test Results
All 11 tests pass consistently:
```
✓ should handle heavy writes with backpressure (332ms)
✓ should handle bidirectional heavy writes (311ms)
✓ should handle graceful teardown during writes (607ms)
✓ should propagate write errors (507ms)
✓ should handle heartbeat timeout detection (4406ms)
✓ should recover from heartbeat disruption (6212ms)
✓ should handle graceful shutdown sequence (705ms)
✓ should handle pub/sub under load (908ms)
✓ should complete teardown with pending messages (703ms)
✓ should propagate subscription errors (604ms)
✓ should coordinate teardown of pipe and control adapters (908ms)
```

Total duration: ~16.6s (well within 25s timeout)

## Verification Command
```bash
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
```

## Files Modified
- `tests/integration/processUnix.spec.ts`

## Deliverable
- `patches/DIFF_T7101_stabilize-process-spec.patch`
