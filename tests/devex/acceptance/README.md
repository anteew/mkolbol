# Acceptance Test Suite

This directory contains a **minimal, copy-friendly acceptance test suite** for external adopters to validate their custom server implementations against the mkolbol framework.

## Purpose

These tests are designed to be:
- **Copy-pasteable**: Easy to adapt for external projects
- **Minimal**: No deep kernel dependencies
- **Self-contained**: Each test stands alone
- **Deterministic**: Reliable results every time
- **Fast**: Complete in under 10 seconds

## What This Suite Validates

### Core Integration Points
1. **Hostess Registration** - Server endpoints register correctly
2. **Stream I/O** - Data flows through input/output pipes
3. **Backpressure** - Stream backpressure is handled properly
4. **Process Lifecycle** - Processes spawn and terminate cleanly (forks lane only)

### Target Audience
- Early adopters building custom servers
- Third-party integrators validating implementations
- CI/CD pipelines for continuous validation

## Test Files

### `hostess.spec.ts`
**Lane:** Threads
**Purpose:** Validate Hostess endpoint registration and metadata

**Tests:**
- Endpoint is registered after server spawn
- Endpoint has required metadata fields (type, coordinates)
- Endpoint capabilities are declared correctly
- Endpoint is discoverable by capability query

**Run:**
```bash
npx vitest run tests/devex/acceptance/hostess.spec.ts
```

### `streams.spec.ts`
**Lane:** Threads
**Purpose:** Validate stream I/O and backpressure handling

**Tests:**
- Input → Output roundtrip works correctly
- Multiple messages flow sequentially
- Backpressure triggers drain events
- Error propagation through pipes

**Run:**
```bash
npx vitest run tests/devex/acceptance/streams.spec.ts
```

### `process-mode.spec.ts`
**Lane:** Forks (REQUIRED)
**Purpose:** Validate process spawning and lifecycle management

**Tests:**
- Process spawns successfully
- Process lifecycle (up → down) works
- Signal handling (SIGTERM) is graceful
- Process cleanup is complete

**Gated:** Requires `MK_DEVEX_PROCESS_MODE=1` environment variable

**Run:**
```bash
MK_DEVEX_PROCESS_MODE=1 npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/devex/acceptance/process-mode.spec.ts
```

## Test Lane Guide

### Threads Lane
- **Use for:** In-process modules (inproc, worker)
- **Tests:** `hostess.spec.ts`, `streams.spec.ts`
- **Command:** `npx vitest run tests/devex/acceptance/hostess.spec.ts`

### Forks Lane
- **Use for:** External processes, PTY servers, system calls
- **Tests:** `process-mode.spec.ts`
- **Command:** `npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/devex/acceptance/process-mode.spec.ts`
- **Why singleFork:** Prevents race conditions with process spawning

## Running Tests

### Run Entire Acceptance Suite

**Threads lane tests:**
```bash
npx vitest run tests/devex/acceptance/hostess.spec.ts tests/devex/acceptance/streams.spec.ts
```

**Forks lane tests:**
```bash
MK_DEVEX_PROCESS_MODE=1 npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/devex/acceptance/process-mode.spec.ts
```

**All tests (threads + forks):**
```bash
# Threads first
npx vitest run tests/devex/acceptance/hostess.spec.ts tests/devex/acceptance/streams.spec.ts

# Then forks
MK_DEVEX_PROCESS_MODE=1 npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/devex/acceptance/process-mode.spec.ts
```

### Run Specific Test

```bash
# Single test by name
npx vitest run tests/devex/acceptance/hostess.spec.ts -t "should register endpoint"

# Watch mode for development
npx vitest tests/devex/acceptance/streams.spec.ts
```

## Adapting for External Projects

### Step 1: Copy Tests to Your Project

```bash
# In your project root
mkdir -p tests/acceptance
cp -r node_modules/mkolbol/tests/devex/acceptance/* tests/acceptance/
```

### Step 2: Transform Imports

**Internal mkolbol imports (before):**
```typescript
import { Kernel } from '../../../src/kernel/Kernel.js';
import { Hostess } from '../../../src/hostess/Hostess.js';
import { StateManager } from '../../../src/state/StateManager.js';
```

**External adopter imports (after):**
```typescript
import { Kernel, Hostess, StateManager, Executor } from 'mkolbol';
```

**Your custom server import:**
```typescript
// Add this line
import { YourServerWrapper } from '../src/modules/YourServerWrapper.js';
```

### Step 3: Update Test Data

Customize test inputs/outputs for your server's behavior:

**Example: Echo Server**
```typescript
const testInput = 'hello\n';
wrapper.inputPipe.write(testInput);
wrapper.inputPipe.end();

const output = await outputPromise;
expect(output).toBe('[ECHO] hello\n'); // Add your prefix
```

**Example: Uppercase Server**
```typescript
const testInput = 'hello\n';
wrapper.inputPipe.write(testInput);
wrapper.inputPipe.end();

const output = await outputPromise;
expect(output).toBe('HELLO\n'); // Transform applied
```

### Step 4: Configure package.json

```json
{
  "scripts": {
    "test:acceptance": "npm run test:acceptance:threads && npm run test:acceptance:forks",
    "test:acceptance:threads": "vitest run tests/acceptance/hostess.spec.ts tests/acceptance/streams.spec.ts",
    "test:acceptance:forks": "MK_DEVEX_PROCESS_MODE=1 vitest run --pool=forks --poolOptions.forks.singleFork=true tests/acceptance/process-mode.spec.ts"
  }
}
```

## Expected Test Artifacts (Laminar)

If you enable Laminar test observability, tests will generate artifacts under `reports/`:

### JSONL Reports (per test case)
```
reports/hostess.spec/should_register_endpoint_with_metadata.jsonl
reports/streams.spec/should_handle_input_output_roundtrip.jsonl
reports/process-mode.spec/should_spawn_process_successfully.jsonl
```

### Summary Report
```
reports/summary.jsonl
```

Contains aggregated test results, timing, and failure counts.

### Digest Files (on failure)
```
reports/digest-YYYY-MM-DD-HHMMSS.json
```

Contains detailed failure diagnostics for failed test cases.

### How to Enable Laminar

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['./node_modules/mkolbol/dist/test/reporter/jsonlReporter.js']
  }
});
```

**Run with Laminar:**
```bash
npx vitest run tests/acceptance/
```

**View results:**
```bash
cat reports/summary.jsonl | jq .
```

## What Each Spec Validates

### Hostess Spec

**Critical Path:** Server → Hostess → Discovery

**Validates:**
1. Server calls `hostess.registerEndpoint()` during spawn
2. Endpoint contains `type`, `coordinates`, and `metadata`
3. Endpoint is retrievable via `hostess.listEndpoints()`
4. Endpoint matches capability queries

**Failure Signals:**
- Endpoint not found → Registration missing
- Wrong type → Incorrect endpoint configuration
- Missing metadata → Incomplete manifest

### Streams Spec

**Critical Path:** Write → Pipe → Read

**Validates:**
1. Data written to `inputPipe` arrives at server stdin
2. Data from server stdout arrives at `outputPipe`
3. Backpressure (write returns false) triggers drain events
4. Pipe errors propagate to event handlers

**Failure Signals:**
- Timeout on read → Server not writing to stdout
- Data mismatch → Incorrect transformation
- No drain events → Backpressure not respected
- Missing error event → Error handling broken

### Process-Mode Spec

**Critical Path:** Spawn → Run → Terminate

**Validates:**
1. `wrapper.spawn()` creates child process with valid PID
2. `wrapper.isRunning()` returns correct status
3. `wrapper.shutdown()` sends SIGTERM and waits for exit
4. Process cleanup leaves no zombies

**Failure Signals:**
- Spawn timeout → Command not found or hangs
- PID = 0 → Fork failed
- Shutdown timeout → SIGTERM not handled
- Zombie process → Missing wait/cleanup

## Success Criteria

A third-party server **passes** the acceptance suite if:

1. All tests in `hostess.spec.ts` pass (threads lane)
2. All tests in `streams.spec.ts` pass (threads lane)
3. All tests in `process-mode.spec.ts` pass (forks lane, if applicable)
4. No process leaks or timeouts
5. Tests complete in < 10 seconds total

## Troubleshooting

### Test hangs indefinitely

**Cause:** Missing `end()` call or process leak

**Fix:**
```typescript
// Always end the input pipe
wrapper.inputPipe.write(data);
wrapper.inputPipe.end(); // <-- Required

// Always clean up in afterEach
afterEach(async () => {
  if (wrapper?.isRunning()) {
    await wrapper.shutdown();
  }
});
```

### Endpoint not found

**Cause:** Querying before spawn completes

**Fix:**
```typescript
// Ensure await
await wrapper.spawn();

// Then query
const endpoints = hostess.listEndpoints();
```

### Data doesn't flow

**Cause:** Server script not flushing output

**Fix:**
```python
# Python servers must flush stdout
print(output, flush=True)
# OR
sys.stdout.flush()
```

```javascript
// Node.js servers auto-flush, but ensure:
process.stdout.write(output);
```

### Process-mode test fails

**Cause:** Running in threads lane instead of forks lane

**Fix:**
```bash
# Wrong
npx vitest run tests/acceptance/process-mode.spec.ts

# Correct
MK_DEVEX_PROCESS_MODE=1 npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/acceptance/process-mode.spec.ts
```

### CI failures

**Cause:** CI is slower; fixed timeouts are too aggressive

**Fix:** Use event-driven waiting instead of `setTimeout`:
```typescript
// Bad
await new Promise(resolve => setTimeout(resolve, 500));

// Good
await new Promise<void>(resolve => {
  wrapper.outputPipe.once('data', resolve);
});
```

## CI Integration Example

**GitHub Actions:**

```yaml
name: Acceptance Tests

on: [push, pull_request]

jobs:
  acceptance-threads:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Run threads lane tests
        run: npx vitest run tests/acceptance/hostess.spec.ts tests/acceptance/streams.spec.ts

  acceptance-forks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Run forks lane tests
        env:
          MK_DEVEX_PROCESS_MODE: 1
        run: npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/acceptance/process-mode.spec.ts
```

## Next Steps

After passing the acceptance suite:

1. **Add custom tests** - Extend with server-specific behaviors
2. **Enable Laminar** - Get test observability and diagnostics
3. **Integrate with CI** - Automate on every commit
4. **Monitor trends** - Track test stability over time

## Additional Resources

- [DevEx Early Adopter Guide](../../../docs/devex/early-adopter-guide.md)
- [First Server Tutorial](../../../docs/devex/first-server-tutorial.md)
- [Wiring and Tests Guide](../../../docs/devex/wiring-and-tests.md)
- [CI Testing Guide](../../../docs/testing/ci.md)

## Support

Questions or issues?
- [GitHub Issues](https://github.com/anteew/mkolbol/issues)
- [Discussions](https://github.com/anteew/mkolbol/discussions)

---

**Ready to validate?** Copy these tests to your project, adapt the imports, and run the suite. These tests are designed to fail meaningfully when wiring is incorrect, giving you fast feedback during development.
