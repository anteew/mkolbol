# Sprint: SB-MK-ROUTER-P2 - Router TTL & Heartbeats (Local Node v1.0)

**Sprint ID:** SB-MK-ROUTER-P2  
**Date:** 2025-10-16  
**Agent:** Susan (Master Agent & Developer Manager)  
**Status:** ✅ COMPLETE

## Goal

Add TTL/heartbeat to routing and live `mkctl endpoints --watch` for Local Node v1.0 (in-process Router only).

## Constraints

- Kernel unchanged; Router/Executor/CLI only
- Respect gate: `MK_LOCAL_NODE=1` (no network adapters/transports)
- Update loader/CLI to warn/reject network references when set

## Wave Structure

### Wave R2-A (Sequential)
- ✅ T2001: RoutingServer TTL + heartbeat
- ✅ T2002: Executor heartbeat announcements

### Wave R2-B (After R2-A)
- ✅ T2003: mkctl endpoints --watch + filters

### Final
- ✅ T2004: Gate: MK_LOCAL_NODE=1

## Task Completion Summary

### T2001: RoutingServer TTL + heartbeat ✅

**Files Modified:**
- `src/router/RoutingServer.ts`
- `tests/integration/router-inproc.spec.ts`

**Implementation:**
- Added `RoutingServerConfig` interface with `ttlMs` and `sweepIntervalMs`
- Added `startSweeper()`, `stopSweeper()`, and `sweep()` methods
- TTL default: 30 seconds, sweep interval: 10 seconds
- Stale endpoints automatically removed by sweeper
- Heartbeat (re-announce) keeps endpoints alive

**Tests Added:** 7 new tests
- Sweep removes stale endpoints
- Sweep keeps fresh endpoints  
- startSweeper automatically removes stale
- stopSweeper halts cleanup
- Multiple startSweeper calls safe
- Heartbeat keeps endpoint alive

**Deliverable:** `patches/DIFF_T2001_router-ttl.patch` (7.5KB)

**Verification:** ✅ All tests pass

---

### T2002: Executor heartbeat announcements ✅

**Files Modified:**
- `src/executor/Executor.ts`
- `tests/integration/router-announcements.spec.ts`

**Implementation:**
- Added `RouterHeartbeatConfig` interface with `enabled` and `intervalMs`
- Added `setRouterHeartbeatConfig()` method
- Added `startRouterHeartbeats()`, `stopRouterHeartbeats()`, `sendRouterHeartbeats()` methods
- Heartbeats disabled by default, configurable via API
- Heartbeats start on `up()`, stop on `down()`
- Re-announces all registered endpoints to RoutingServer

**Tests Added:** 3 new tests
- Sends periodic heartbeats when enabled
- Stops heartbeats on shutdown
- Does not send heartbeats when disabled

**Deliverable:** `patches/DIFF_T2002_executor-heartbeat.patch` (6.9KB)

**Verification:** ✅ All tests pass

---

### T2003: mkctl endpoints --watch + filters ✅

**Files Modified:**
- `scripts/mkctl.ts`
- `tests/cli/mkctlEndpoints.spec.ts`

**Implementation:**
- Added `--watch` flag for live monitoring (default 1s refresh)
- Added `--interval N` to customize refresh rate
- Added `--filter key=value` for filtering endpoints
- Supported filter keys: `type`, `id`, `coordinates`
- Watch mode responds to SIGINT/SIGTERM
- Clear screen on each refresh with timestamp

**Usage Examples:**
```bash
mkctl endpoints --watch
mkctl endpoints --watch --interval 2
mkctl endpoints --filter type=inproc
mkctl endpoints --watch --filter type=worker --interval 2
```

**Tests Added:** 3 new tests
- Filters endpoints by type
- Watch mode with SIGTERM
- Filters no results message

**Deliverable:** `patches/DIFF_T2003_mkctl-watch.patch` (9.9KB)

**Verification:** ✅ All tests pass

---

### T2004: Gate: MK_LOCAL_NODE=1 ✅

**Files Modified:**
- `src/config/loader.ts`
- `scripts/mkctl.ts`
- `docs/devex/quickstart.md`

**Files Created:**
- `tests/integration/local-node-gate.spec.ts`

**Implementation:**

**Loader:**
- Check `MK_LOCAL_NODE=1` environment variable
- Reject configs with `type=network` or `address` parameters
- Clear error message explaining Local Node mode restriction

**mkctl:**
- Display `[mkctl] Running in Local Node mode (MK_LOCAL_NODE=1): network features disabled.` when gate active

**Documentation:**
- Added "Local Node Mode (MK_LOCAL_NODE=1)" section to quickstart.md
- Explains what's enabled/disabled
- Clarifies when to use Local Node mode
- Documents future network support

**Tests Added:** 5 new tests
- Allows config without network features when MK_LOCAL_NODE=1
- Rejects config with type=network when MK_LOCAL_NODE=1
- Rejects config with address parameter when MK_LOCAL_NODE=1
- Allows config with network features when MK_LOCAL_NODE not set
- Allows config with network features when MK_LOCAL_NODE=0

**Deliverable:** `patches/DIFF_T2004_local-gate.patch` (16KB)

**Verification:** ✅ All tests pass

---

## Test Results

### Full CI Test Suite
```bash
npm run test:ci
```
**Result:** ✅ ALL TESTS PASS (Exit code: 0)

**Test Coverage:**
- 18 new tests added across all tasks
- All existing tests continue to pass
- Total test count: 380+ tests

## Deliverables

All patch files generated and verified:

1. ✅ `patches/DIFF_T2001_router-ttl.patch` (7.5KB)
2. ✅ `patches/DIFF_T2002_executor-heartbeat.patch` (6.9KB)
3. ✅ `patches/DIFF_T2003_mkctl-watch.patch` (9.9KB)
4. ✅ `patches/DIFF_T2004_local-gate.patch` (16KB)

## Key Features Implemented

### RoutingServer Enhancements
- ✅ TTL-based endpoint expiration
- ✅ Configurable sweep intervals
- ✅ Automatic stale endpoint cleanup
- ✅ Debug instrumentation for sweep operations

### Executor Enhancements
- ✅ Periodic heartbeat announcements to RoutingServer
- ✅ Configurable heartbeat intervals
- ✅ Automatic lifecycle management (start/stop with topology)
- ✅ Debug instrumentation for heartbeat operations

### mkctl CLI Enhancements
- ✅ Live watch mode for endpoints
- ✅ Configurable refresh intervals
- ✅ Endpoint filtering (type, id, coordinates)
- ✅ Signal handling (SIGINT/SIGTERM)

### Gate Enforcement
- ✅ MK_LOCAL_NODE=1 environment variable
- ✅ Config validation rejects network features
- ✅ Clear error messages
- ✅ Documentation of Local Node mode

## Architecture Notes

**Local Node v1.0 Scope:**
- In-process RoutingServer only
- No network transports
- No distributed routing
- Single-machine deployments

**Future (Network Mode):**
- Set `MK_LOCAL_NODE=0` or unset
- Enable network adapters
- Enable distributed routing
- Multi-machine topologies

## Verification Commands

```bash
# Build
npm run build

# Run CI tests
npm run test:ci

# Run specific test suites
npx vitest run tests/integration/router-inproc.spec.ts
npx vitest run tests/integration/router-announcements.spec.ts
npx vitest run tests/cli/mkctlEndpoints.spec.ts
npx vitest run tests/integration/local-node-gate.spec.ts
```

## Next Steps

For the next sprint (R2-C or similar), consider:
- Network transport adapters (when MK_LOCAL_NODE=0)
- Distributed routing protocol
- Multi-hop routing
- Service mesh discovery

## Notes

- All tasks completed according to spec
- No kernel changes (constraint respected)
- Router/Executor/CLI only (constraint respected)
- MK_LOCAL_NODE=1 gate enforced (constraint respected)
- All tests passing
- Documentation updated
- Ready for Vega review and merge
