# CI Testing Guide

This document describes the CI testing strategy, test lanes, gates, and run instructions for the mkolbol project.

## Overview

The project uses a dual-lane testing strategy to handle different execution contexts:

- **Threads lane** - Fast, parallel test execution for most tests
- **Forks lane** - Isolated process execution for PTY and process-mode tests

Tests are gated with environment flags to control experimental features:

- `MK_PROCESS_EXPERIMENTAL` - Unix process adapters (PTY, pipes, control)
- `MK_WORKER_EXPERIMENTAL` - Worker thread modules (not currently enabled in CI)

## Test Lanes

### Threads Lane

**Purpose:** Run unit and integration tests in parallel using worker threads.

**Use case:** Fast feedback for pure logic, kernel operations, and non-PTY tests.

**Pool:** `--pool=threads` (vitest tinypool worker threads)

**Excluded tests:**
- `ptyServerWrapper.spec.ts` - Requires PTY isolation
- `multiModalOutput.spec.ts` - Requires PTY
- `endpointsList.spec.ts` - Requires process spawning
- `processMode.spec.ts` - Requires process isolation

**Run command:**
```bash
npm run test:ci
```

**Direct vitest command:**
```bash
npx vitest run \
  --pool=threads \
  --exclude='**/{ptyServerWrapper,multiModalOutput,endpointsList,processMode}.spec.ts' \
  --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js
```

**Characteristics:**
- Fast execution (parallel workers)
- Shared process space (lighter weight)
- Safe for pure functions, transforms, and kernel logic
- **Caveat:** Tinypool concurrency issues on Node 20/24 require `--pool=threads` instead of default

### Forks Lane

**Purpose:** Run PTY and process-mode tests in isolated child processes.

**Use case:** Tests that spawn processes, use PTY, or require isolation from other tests.

**Pool:** `--pool=forks --poolOptions.forks.singleFork=true`

**Included tests:**
- `tests/wrappers/ptyServerWrapper.spec.ts` - PTY wrapper lifecycle
- `tests/integration/multiModalOutput.spec.ts` - PTY output parsing
- `tests/integration/endpointsList.spec.ts` - Endpoint registration
- `tests/integration/processMode.spec.ts` - Process spawning (basic)
- `tests/integration/processUnix.spec.ts` - Unix adapters (gated)
- `tests/integration/workerMode.spec.ts` - Worker threads (gated)

**Run command:**
```bash
npm run test:pty
```

**Direct vitest command:**
```bash
npx vitest run \
  --pool=forks \
  --poolOptions.forks.singleFork=true \
  tests/wrappers/ptyServerWrapper.spec.ts \
  tests/integration/multiModalOutput.spec.ts \
  tests/integration/endpointsList.spec.ts \
  tests/integration/processMode.spec.ts \
  tests/integration/processUnix.spec.ts \
  tests/integration/workerMode.spec.ts \
  --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js
```

**Characteristics:**
- Isolated process per test suite
- Single fork mode (`singleFork=true`) prevents concurrency issues
- Required for PTY (node-pty) which needs real process lifecycle
- Slower than threads lane but more reliable for integration tests

## Test Gates

### MK_PROCESS_EXPERIMENTAL

**Status:** ✅ **REQUIRED for CI** (enforced in forks lane)

**Purpose:** Enable Unix process adapter tests (pipes, PTY control, teardown).

**Gated tests:**
- `tests/integration/processUnix.spec.ts`
  - `UnixPipeAdapter` - stdio/stdout/stderr pipe lifecycle
  - `UnixControlAdapter` - PTY control (resize, signal)
  - Combined adapter teardown scenarios
- `tests/transport/adapterParity.spec.ts`
  - Pause/resume behavior
  - End/close behavior
  - Error timing
  - Comparable scenarios

**Usage:**
```bash
# Run forks lane with process-mode (REQUIRED)
npm run test:pty

# Direct vitest (processUnix only)
MK_PROCESS_EXPERIMENTAL=1 npx vitest run \
  --pool=forks \
  --poolOptions.forks.singleFork=true \
  tests/integration/processUnix.spec.ts
```

**Implementation:**
```typescript
// Tests skip if gate is not set
describe.skipIf(!process.env.MK_PROCESS_EXPERIMENTAL)('UnixPipeAdapter', () => {
  // ... test cases
});
```

**CI behavior:**
- Forks lane **REQUIRES** `MK_PROCESS_EXPERIMENTAL=1` (no longer optional)
- Process-mode tests run in main forks lane (not experimental step)
- Ensures adapter parity and PTY control coverage

### MK_WORKER_EXPERIMENTAL

**Status:** ❌ **DISABLED in CI** (gated off, not yet production-ready)

**Purpose:** Gate worker thread module tests (not currently run in CI).

**Gated tests:**
- `tests/integration/workerMode.spec.ts`
  - Timer → Worker(Uppercase) → Console topology
  - Worker node lifecycle (up → run → down)
  - Mixed inproc and worker nodes
- `tests/integration/endpointsList.spec.ts`
  - Worker endpoint registration

**Usage (when ready):**
```bash
# Enable gate and run test
MK_WORKER_EXPERIMENTAL=1 npx vitest run \
  tests/integration/workerMode.spec.ts
```

**Implementation:**
```typescript
// Tests skip if gate is not set
it.skipIf(!process.env.MK_WORKER_EXPERIMENTAL)('should execute Timer → Worker(Uppercase) → Console topology', async () => {
  // ... test logic
});
```

**Why disabled:** Worker-mode is experimental and not yet needed for P0 PTY metasurface product.

## GitHub Actions Workflow

Location: `.github/workflows/tests.yml`

### Job Matrix

**Strategy:**
- `fail-fast: false` (continue all matrix combinations even if one fails)
- Node versions: `[20, 24]`

### Steps

1. **Checkout + Setup**
   ```yaml
   - uses: actions/checkout@v4
   - uses: actions/setup-node@v4
   - run: npm ci
   - run: npm run build
   ```

2. **Threads lane** (continue-on-error: true)
   ```bash
   npx vitest run \
     --pool=threads \
     --exclude='**/{ptyServerWrapper,multiModalOutput,endpointsList,processMode,rulepacks}.spec.ts' \
     --reporter=default \
     --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js \
     > reports/threads_raw.log 2>&1
   ```

3. **Forks lane** (continue-on-error: true)
   ```bash
   npx vitest run \
     --pool=forks \
     --poolOptions.forks.singleFork=true \
     tests/wrappers/ptyServerWrapper.spec.ts \
     tests/integration/multiModalOutput.spec.ts \
     tests/integration/endpointsList.spec.ts \
     tests/integration/processMode.spec.ts \
     tests/integration/workerMode.spec.ts \
     --reporter=default \
     --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js \
     > reports/forks_raw.log 2>&1
   ```

4. **Process-mode experimental** (continue-on-error: true)
   ```bash
   MK_PROCESS_EXPERIMENTAL=1 npx vitest run \
     --pool=forks \
     --poolOptions.forks.singleFork=true \
     tests/integration/processUnix.spec.ts \
     --reporter=default \
     --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js
   ```

5. **Laminar summary/trends** (if: always, continue-on-error: true)
   ```bash
   npm run lam -- summary > reports/LAMINAR_SUMMARY.txt
   npm run lam -- trends --top 10 > reports/LAMINAR_TRENDS.txt
   ```

6. **Upload artifacts** (if: always)
   - Name: `laminar-reports-{node-version}`
   - Path: `reports/`
   - Retention: Default (typically 90 days)
   - **Contents:**
     - `summary.jsonl` - Structured test results (Laminar)
     - `index.json` - Test artifact manifest
     - `<suite>/<case>.jsonl` - Per-case event streams
     - `threads_raw.log` - Full output from threads lane
     - `forks_raw.log` - Full output from forks lane
     - `LAMINAR_SUMMARY.txt` - Human-readable summary
     - `LAMINAR_TRENDS.txt` - Top recurring signals

### Viewing CI Results

**GitHub Actions:**
1. Navigate to [Actions tab](https://github.com/anteew/mkolbol/actions)
2. Click on workflow run
3. Download artifacts: `laminar-reports-20` or `laminar-reports-24`

**Artifacts include:**
- `threads_raw.log` - Full output from threads lane
- `forks_raw.log` - Full output from forks lane
- `reports/summary.jsonl` - Structured test results
- `reports/index.json` - Test artifact manifest
- `reports/LAMINAR_SUMMARY.txt` - Human-readable summary
- `reports/LAMINAR_TRENDS.txt` - Top recurring signals

## Local Testing Commands

### Quick commands

```bash
# Full test suite (default, uses forks)
npm test

# Threads lane only
npm run test:ci

# Forks lane only (without experimental gate)
npm run test:pty

# Forks lane with process-mode gate
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty

# Watch mode (for development)
npm run test:watch
```

### With Laminar summaries

```bash
# Threads + generate summary/trends
npm run test:ci:lam

# Forks + generate summary/trends (with MK_PROCESS_EXPERIMENTAL)
npm run test:pty:lam
```

### Dogfooding scripts

```bash
# Run threads lane dogfooding (with Laminar reporting)
npm run lam:dogfood:ci

# Run forks lane dogfooding (with Laminar reporting and MK_PROCESS_EXPERIMENTAL)
npm run lam:dogfood:pty
```

**Dogfooding scripts location:**
- `scripts/dogfood-ci.ts` - Threads lane
- `scripts/dogfood-pty.ts` - Forks lane (with MK_PROCESS_EXPERIMENTAL)

### Run specific tests

```bash
# Run single test file (threads)
npx vitest run tests/kernel.spec.ts

# Run single test file (forks, isolated)
npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/integration/processMode.spec.ts

# Run with test name filter
npx vitest run -t "connect moves data"

# Run with file and name filter
npx vitest run tests/kernel.spec.ts -t "connect moves data"
```

## Troubleshooting

### Common Issues

**1. PTY tests fail in threads lane**

**Symptom:** `ptyServerWrapper.spec.ts` fails with isolation or concurrency errors.

**Solution:** PTY tests require process isolation. Use forks lane:
```bash
npm run test:pty
```

**2. processUnix tests are skipped**

**Symptom:** Tests in `processUnix.spec.ts` show as skipped.

**Solution:** Process-mode is now **required**. Use `npm run test:pty` (sets `MK_PROCESS_EXPERIMENTAL=1` automatically):
```bash
npm run test:pty
```

**3. Tinypool concurrency errors on Node 20/24**

**Symptom:** `Maximum call stack size exceeded` or worker pool errors.

**Solution:** Use `--pool=threads` explicitly (already in `test:ci` script):
```bash
npx vitest run --pool=threads
```

**4. Tests timeout in CI but pass locally**

**Symptom:** Tests timeout in GitHub Actions but complete locally.

**Solution:** CI uses `continue-on-error: true` for lanes to prevent build failures. Check:
- Artifact logs: `reports/threads_raw.log` or `reports/forks_raw.log`
- Increase timeout in test file if needed:
  ```typescript
  it('slow test', async () => {
    // ...
  }, 30000); // 30 second timeout
  ```

**5. Worker mode tests are skipped**

**Symptom:** Tests in `workerMode.spec.ts` show as skipped.

**Solution:** Worker mode is gated off in CI (not yet production-ready). To run locally:
```bash
MK_WORKER_EXPERIMENTAL=1 npm run test:pty
```

**6. Missing reporter artifacts**

**Symptom:** `reports/summary.jsonl` or case files are empty or missing.

**Solution:** Ensure Laminar reporter is installed:
```bash
npm ci  # Clean install
npm run build
npm run test:ci  # Should generate reports/
```

### Debug Techniques

**Enable debug output:**
```bash
# All debug output
DEBUG=1 npm run test:ci

# Specific modules
MK_DEBUG_MODULES=kernel,pipes npm run test:ci

# Debug level
MK_DEBUG_LEVEL=trace npm run test:ci
```

**Laminar debug mode:**
```bash
# Run tests with Laminar debug logging
LAMINAR_DEBUG=1 npm run test:ci
```

**Check test event logs:**
```bash
# View structured events for a specific test
npm run logq -- case=kernel.spec/connect reports/kernel.spec/*.jsonl

# Query errors only
npm run logq -- lvl=error reports/**/*.jsonl

# Show context around correlation ID
npm run logq -- --around corr=abc123 --window 5 reports/**/*.jsonl
```

**Generate repro commands:**
```bash
# List all failures with reproduction commands
npm run repro

# Generate repro bundle for specific test
npm run lam -- repro --bundle --case kernel.spec/connect_moves_data_1_1
```

## Performance Guidelines

### Test Execution Times (approximate)

| Lane | Test Count | Duration | Pool |
|------|-----------|----------|------|
| Threads | ~30-40 tests | ~5-10s | threads (parallel) |
| Forks (no gates) | ~10-15 tests | ~10-15s | forks (isolated) |
| Forks (with MK_PROCESS_EXPERIMENTAL) | ~15-20 tests | ~15-20s | forks (isolated) |

### Optimization Tips

**1. Keep threads lane fast**
- Avoid PTY, process spawning, or heavy I/O in threaded tests
- Use mocks for external dependencies
- Keep tests focused and isolated

**2. Use forks lane for integration**
- Real process spawning (node-pty)
- Full lifecycle tests (up → run → down)
- Tests that modify global state

**3. Gate experimental features**
- Use environment flags for unstable features
- Skip expensive tests by default (opt-in with gate)
- Keep CI builds fast and reliable

**4. Leverage continue-on-error**
- CI lanes use `continue-on-error: true` to prevent flake-induced build failures
- Review artifacts to catch real issues
- Use Laminar summaries to track trends

## Next Steps

**For contributors:**
- Run `npm run test:ci` before submitting PRs (threads lane)
- Run `npm run test:pty` for PTY-related changes (forks lane)
- Check `reports/summary.jsonl` for test results
- Use `npm run repro` to debug failures

**For CI/CD:**
- Both lanes run in GitHub Actions on Node 20 and 24
- Artifacts uploaded for each run (30-day retention)
- Laminar summaries generated automatically

**For AI agents:**
- Test artifacts in `reports/` directory
- Use `npm run lam -- logq` to query logs
- Use `npm run lam -- digest` to analyze failures
- See `docs/testing/laminar-integration.md` for MCP integration

## References

- [Laminar Integration Guide](./laminar-integration.md) - Deep dive into Laminar reporter and MCP
- [GitHub Actions Workflow](../../.github/workflows/tests.yml) - CI configuration
- [package.json](../../package.json) - npm scripts and test commands
- [vitest.config.ts](../../vitest.config.ts) - Vitest configuration

## DevEx Resources

For early adopters building custom servers:

- [Wiring and Testing Guide](../devex/wiring-and-tests.md) - How to wire your server using config files and write acceptance tests
- [DevEx Acceptance Tests](../../tests/devex/README.md) - Copy-pasteable test patterns for external projects
- [First Server Tutorial](../devex/first-server-tutorial.md) - Build your first custom module
