# Process Mode CI Enforcement Plan

## Overview

Process mode tests validate Unix domain socket adapters (`UnixPipeAdapter`, `UnixControlAdapter`) under load conditions. These tests are currently **gated** behind `MK_PROCESS_EXPERIMENTAL=1` to allow stabilization before becoming required in CI.

## Current Status

**Phase**: Stability hardening (T6504)  
**Gate**: `describe.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)`  
**Location**: `tests/integration/processUnix.spec.ts`

### Recent Improvements (T6504)

1. **Timeout Hardening**
   - Increased test timeout: 15s → 20s
   - Connection timeout: 5s with explicit timeout wrapper
   - Timeout wrapper with descriptive error messages

2. **Retry Logic**
   - Connection retries: up to 3 attempts with exponential backoff
   - Handles transient socket creation/binding failures
   - Applied to all `listen()` and `connect()` operations

3. **Test Stability Features**
   - Explicit timeout wrapping with `withTimeout()` helper
   - Retry helper with configurable attempts and delay
   - Extended setup delays for control adapter tests (50ms → 100ms)

## Test Coverage

### UnixPipeAdapter
- ✅ Heavy writes with backpressure (800KB, 100 chunks)
- ✅ Bidirectional heavy writes (50 chunks × 4KB per direction)
- ✅ Graceful teardown during writes
- ✅ Write error propagation

### UnixControlAdapter
- ✅ Heartbeat timeout detection (2.5s window)
- ✅ Heartbeat recovery after disruption
- ✅ Graceful shutdown sequence
- ✅ Pub/sub under load (100 messages across 3 topics)
- ✅ Teardown with pending messages
- ✅ Subscription error handling

### Combined Scenarios
- ✅ Coordinated teardown of pipe + control adapters

## Enforcement Roadmap

### Phase 1: Stability Observation (Current)
**Duration**: 2-4 weeks  
**Goal**: Collect reliability data with new timeout/retry logic

- Run tests manually with `MK_PROCESS_EXPERIMENTAL=1`
- Monitor for flakes in local dev and any CI runs
- Track pass rate and failure patterns

**Success Criteria**:
- 95%+ pass rate over 50+ runs
- No timeout-related failures with new limits
- No socket binding race conditions

### Phase 2: Soft Enforcement
**Duration**: 2 weeks  
**Goal**: Enable in CI but allow failures

- Add optional CI job: `test:process-mode` (allowed to fail)
- Run on every PR to gather data
- Alert team on failures but don't block merges

**Configuration**:
```yaml
# .github/workflows/ci.yml (example)
process-mode-tests:
  runs-on: ubuntu-latest
  continue-on-error: true  # Soft fail
  env:
    MK_PROCESS_EXPERIMENTAL: 1
  steps:
    - run: npm run test:integration -- processUnix.spec.ts
```

**Success Criteria**:
- 98%+ pass rate in CI over 100+ runs
- No environment-specific failures
- Clear failure patterns (if any) are documented

### Phase 3: Hard Enforcement
**Duration**: Permanent  
**Goal**: Make process-mode tests required

- Remove `describe.skipIf()` gate or make default
- Change CI job to `continue-on-error: false`
- Add to required status checks
- Update AGENTS.md with new required env var

**Implementation**:
```typescript
// Option A: Remove gate entirely
describe('Process Mode: Unix Adapters under Load', () => {
  // Tests always run
});

// Option B: Make default enabled, allow opt-out
const skipProcessTests = process.env.MK_SKIP_PROCESS_TESTS === '1';
describe.skipIf(skipProcessTests)('Process Mode...', () => {
  // ...
});
```

### Phase 4: Expansion
**Goal**: Add more process-mode scenarios

- Multi-client scenarios (fan-out)
- Reconnection and retry logic tests
- Protocol version negotiation
- Performance regression benchmarks

## Monitoring & Debugging

### Local Testing
```bash
# Run process-mode tests
MK_PROCESS_EXPERIMENTAL=1 npm test -- processUnix.spec.ts

# Run with verbose output
MK_PROCESS_EXPERIMENTAL=1 npm test -- processUnix.spec.ts --reporter=verbose

# Run single test for debugging
MK_PROCESS_EXPERIMENTAL=1 npm test -- processUnix.spec.ts -t "should handle heavy writes"
```

### Debugging Failures

**Timeout Failures**:
- Check system load: `top` or `htop`
- Verify tmpdir access: `ls -la /tmp/mkolbol-test-*`
- Increase timeout temporarily to isolate issue

**Connection Failures**:
- Check socket cleanup: `lsof | grep mkolbol-test`
- Verify no orphaned processes: `ps aux | grep node`
- Check ulimit: `ulimit -n` (should be ≥1024)

**Data Integrity Failures**:
- Enable verbose logging in adapters
- Check for partial writes or corruption
- Verify buffer sizes match expectations

## Rollback Plan

If Phase 3 fails or shows instability:

1. **Immediate**: Revert to `describe.skipIf()` gate
2. **Investigate**: Collect failure logs and environment details
3. **Fix**: Address root cause (timeout, retry, or test logic)
4. **Iterate**: Return to Phase 1 with improved stability

## Related Documentation

- [Laminar Integration](./laminar-integration.md) - Test reporting setup
- `AGENTS.md` - Environment variables and test commands
- `tests/integration/processUnix.spec.ts` - Test implementation

## Success Metrics

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| Pass Rate | 95% | 98% | 99.5% |
| Timeouts | <2% | <0.5% | <0.1% |
| Retries | Any | ≤2 avg | ≤1 avg |
| CI Runs | Manual | 100+ | All PRs |

## Contact

For questions or issues with process-mode tests:
- Review this document and test implementation
- Check recent CI logs for patterns
- File issue with tag `area:process-mode` and logs attached
