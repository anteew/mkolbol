# DevEx Acceptance Tests

This directory contains **acceptance tests** for early adopters building custom servers on mkolbol. These tests demonstrate how to verify that your server:

1. Registers correctly with Hostess
2. Handles stream I/O (stdin/stdout) properly
3. Responds to backpressure correctly
4. Integrates cleanly into Executor topologies

## Purpose

These tests serve as **reference implementations** that you can copy into your own project to validate your custom server wrapper. They are designed to be:

- **Copy-pasteable**: Minimal dependencies on mkolbol internals
- **Deterministic**: No flaky timeouts or race conditions
- **Fast**: Complete in < 30 seconds total
- **Comprehensive**: Cover the critical integration points

## Test Files

### `server-acceptance.spec.ts`

**Description**: Skeleton acceptance tests for custom external servers.

**Coverage:**
- Hostess endpoint registration
- Stream I/O roundtrip (stdin → stdout)
- Backpressure handling (drain events)
- Lifecycle management (spawn → shutdown)
- Executor integration (full topology)

**How to use:**
1. Copy this file into your project's `tests/` directory
2. Replace `YourServerWrapper` with your actual wrapper class
3. Adjust imports to match your project structure
4. Customize test inputs/outputs for your server's behavior
5. Run with `npx vitest run tests/server-acceptance.spec.ts`

## Adapting for Your Project

### Step 1: Copy the Test File

```bash
# In your project root
mkdir -p tests
cp node_modules/mkolbol/tests/devex/server-acceptance.spec.ts tests/
```

### Step 2: Update Imports

Replace mkolbol internal paths with your local paths:

**Before (mkolbol internal):**
```typescript
import { Kernel } from '../../src/kernel/Kernel.js';
import { Hostess } from '../../src/hostess/Hostess.js';
import { YourServerWrapper } from '../../src/modules/YourServerWrapper.js';
```

**After (external adopter):**
```typescript
import { Kernel, Hostess, StateManager, Executor } from 'mkolbol';
import { YourServerWrapper } from '../src/modules/YourServerWrapper.js';
```

### Step 3: Customize Test Data

Update test inputs and expected outputs to match your server's behavior:

**Example: Echo server**
```typescript
const testInput = 'hello world\n';
const expectedOutput = '[ECHO] hello world\n';

wrapper.inputPipe.write(testInput);
const output = await outputPromise;
expect(output).toBe(expectedOutput);
```

**Example: Uppercase server**
```typescript
const testInput = 'hello world\n';
const expectedOutput = 'HELLO WORLD\n';

wrapper.inputPipe.write(testInput);
const output = await outputPromise;
expect(output).toBe(expectedOutput);
```

### Step 4: Adjust Endpoint Matching

Update endpoint search logic to match your server's coordinates:

**Before (generic):**
```typescript
const serverEndpoint = Array.from(endpoints.entries()).find(
  ([_, ep]) => ep.type === 'external' && ep.coordinates.includes('your-command')
);
```

**After (specific to your server):**
```typescript
const serverEndpoint = Array.from(endpoints.entries()).find(
  ([_, ep]) => ep.type === 'external' && ep.coordinates.includes('python3')
);
```

Or match by servername:
```typescript
const serverEndpoint = Array.from(endpoints.entries()).find(
  ([_, ep]) => ep.coordinates === 'your-server-name'
);
```

### Step 5: Configure Test Lane

**If your server spawns external processes**, run tests in the **forks lane**:

**package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:acceptance": "vitest run --pool=forks --poolOptions.forks.singleFork=true tests/server-acceptance.spec.ts"
  }
}
```

**If your server is in-process only**, you can use the **threads lane**:

**package.json:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:acceptance": "vitest run tests/server-acceptance.spec.ts"
  }
}
```

## Test Patterns Explained

### Pattern 1: Hostess Registration

**What it tests:** Your server registers an endpoint after spawning.

**Why it matters:** Hostess is the service discovery mechanism. If registration fails, your server won't be discoverable in topologies.

**Code:**
```typescript
it('should register endpoint with Hostess after spawn', async () => {
  wrapper = new YourServerWrapper(kernel, hostess);
  await wrapper.spawn();

  const endpoints = hostess.listEndpoints();
  const serverEndpoint = Array.from(endpoints.entries()).find(
    ([_, ep]) => ep.type === 'external'
  );

  expect(serverEndpoint).toBeDefined();
});
```

### Pattern 2: Stream I/O Roundtrip

**What it tests:** Data written to `inputPipe` flows through your server and appears on `outputPipe`.

**Why it matters:** This is the core data flow. If this fails, your server can't participate in pipelines.

**Code:**
```typescript
it('should perform stdin → stdout roundtrip', async () => {
  wrapper = new YourServerWrapper(kernel, hostess);
  await wrapper.spawn();

  const outputPromise = new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    wrapper.outputPipe.on('data', (data) => chunks.push(Buffer.from(data)));
    wrapper.outputPipe.once('end', () => {
      resolve(Buffer.concat(chunks).toString());
    });
  });

  wrapper.inputPipe.write('test\n');
  wrapper.inputPipe.end();

  const output = await outputPromise;
  expect(output).toContain('test');
});
```

### Pattern 3: Backpressure Handling

**What it tests:** Your server respects Node.js stream backpressure by emitting `drain` events.

**Why it matters:** Without backpressure handling, large data volumes will cause memory bloat or data loss.

**Code:**
```typescript
it('should handle backpressure with drain events', async () => {
  wrapper = new YourServerWrapper(kernel, hostess);
  await wrapper.spawn();

  let drainEvents = 0;
  for (let i = 0; i < 50; i++) {
    const chunk = Buffer.alloc(64 * 1024, i % 256);
    const canContinue = wrapper.inputPipe.write(chunk);
    if (!canContinue) {
      drainEvents++;
      await new Promise<void>((resolve) => {
        wrapper.inputPipe.once('drain', resolve);
      });
    }
  }
  expect(drainEvents).toBeGreaterThan(0);
});
```

### Pattern 4: Lifecycle Management

**What it tests:** Your server starts cleanly and shuts down without leaking resources.

**Why it matters:** Leaked processes cause CI failures and production instability.

**Code:**
```typescript
it('should manage lifecycle (start/stop)', async () => {
  wrapper = new YourServerWrapper(kernel, hostess);

  expect(wrapper.isRunning()).toBe(false);

  await wrapper.spawn();
  expect(wrapper.isRunning()).toBe(true);
  expect(wrapper.getProcessInfo().pid).toBeGreaterThan(0);

  await wrapper.shutdown();
  expect(wrapper.isRunning()).toBe(false);
});
```

### Pattern 5: Executor Integration

**What it tests:** Your server works in a full topology managed by Executor.

**Why it matters:** This is the real-world usage scenario. If this fails, your server won't work in production.

**Code:**
```typescript
it('should work in Executor topology', async () => {
  const config = {
    nodes: [
      { id: 'source1', module: 'TimerSource' },
      { id: 'your-server', module: 'YourServerWrapper' },
      { id: 'sink1', module: 'ConsoleSink' }
    ],
    connections: [
      { from: 'source1.output', to: 'your-server.input' },
      { from: 'your-server.output', to: 'sink1.input' }
    ]
  };

  const stateManager = new StateManager(kernel);
  const executor = new Executor(kernel, hostess, stateManager);

  executor.load(config);
  await executor.up();

  const endpoints = hostess.listEndpoints();
  expect(endpoints.size).toBeGreaterThanOrEqual(3); // source + server + sink

  await executor.down();
});
```

## Running Tests

### Locally

**Run all acceptance tests:**
```bash
npm run test:acceptance
```

**Run specific test:**
```bash
npx vitest run tests/server-acceptance.spec.ts -t "should register endpoint"
```

**Watch mode (for development):**
```bash
npx vitest tests/server-acceptance.spec.ts
```

### In CI (GitHub Actions)

**Example workflow:**

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 24]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run build
      - run: npm run test:acceptance
```

## Troubleshooting

### Test hangs indefinitely

**Cause:** Missing `end()` call or leaked process.

**Solution:**
1. Ensure `wrapper.inputPipe.end()` is called
2. Check `afterEach` cleanup:
   ```typescript
   afterEach(async () => {
     if (wrapper?.isRunning()) {
       await wrapper.shutdown();
     }
   });
   ```

### Hostess endpoint not found

**Cause:** Registration happens during `spawn()`, not construction.

**Solution:** Always call `await wrapper.spawn()` before querying endpoints.

### Data not flowing

**Cause:** Incorrect wiring or external script not flushing output.

**Solution:**
1. Verify connections: `kernel.connect(source, wrapper.inputPipe)`
2. Ensure external script flushes:
   ```python
   sys.stdout.flush()  # Python
   ```
   ```bash
   echo "data"  # Bash auto-flushes
   ```

### Tests fail in CI but pass locally

**Cause:** CI is slower; fixed timeouts are too short.

**Solution:** Use event-driven waiting instead of `setTimeout`:
```typescript
// Bad
await new Promise(resolve => setTimeout(resolve, 500));

// Good
await new Promise<void>((resolve) => {
  wrapper.outputPipe.once('data', resolve);
});
```

## Performance Guidelines

**Target execution time:**
- Per test: < 5 seconds
- Full suite: < 30 seconds

**How to achieve:**
1. Use minimal test data (don't send megabytes)
2. Avoid unnecessary timeouts
3. Clean up resources immediately after test
4. Run in forks lane with `singleFork: true` to prevent concurrency issues

## Next Steps

After running these acceptance tests successfully:

1. **Add custom tests** - Extend with server-specific behaviors
2. **Integrate with CI** - Add to your GitHub Actions workflow
3. **Monitor with Laminar** - Use Laminar reporter for observability
4. **Review failures** - Use `reports/` directory to debug issues

## Additional Resources

- [Wiring and Testing Guide](../../docs/devex/wiring-and-tests.md) - Comprehensive guide
- [First Server Tutorial](../../docs/devex/first-server-tutorial.md) - Build your first module
- [CI Testing Guide](../../docs/testing/ci.md) - Deep dive into test lanes
- [Laminar Integration](../../docs/testing/laminar-integration.md) - Test observability

## Support

For questions or issues:
- [GitHub Issues](https://github.com/anteew/mkolbol/issues)
- [Discussions](https://github.com/anteew/mkolbol/discussions)

---

**Ready to test?** Copy `server-acceptance.spec.ts` into your project and adapt it to your server. The tests are designed to fail meaningfully when wiring is incorrect, giving you fast feedback during development.
