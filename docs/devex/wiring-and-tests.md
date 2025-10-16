# Wiring and Testing Guide

This guide explains how to wire your custom server into an mkolbol topology using configuration files, and how to write deterministic tests that verify your wiring works correctly. You'll learn how to write topologies in YAML/JSON, understand the test lane architecture (threads vs forks), and create acceptance tests that validate Hostess registration and stream I/O.

## Prerequisites

- Basic understanding of mkolbol modules (see [First Server Tutorial](./first-server-tutorial.md))
- Familiarity with Vitest testing framework
- Node.js 20 or higher

## Table of Contents

1. [Configuration File Basics](#configuration-file-basics)
2. [YAML Configuration Examples](#yaml-configuration-examples)
3. [JSON Configuration Examples](#json-configuration-examples)
4. [Test Lanes: Threads vs Forks](#test-lanes-threads-vs-forks)
5. [Running Tests Locally](#running-tests-locally)
6. [Running Tests in CI](#running-tests-in-ci)
7. [Writing Deterministic Tests](#writing-deterministic-tests)
8. [Acceptance Test Patterns](#acceptance-test-patterns)
9. [Troubleshooting](#troubleshooting)

---

## Configuration File Basics

mkolbol uses a **topology configuration** to describe how modules connect. The configuration defines:

- **Nodes**: Individual modules (sources, transforms, sinks)
- **Connections**: Data flow paths between nodes

### Configuration Schema

```typescript
interface TopologyConfig {
  nodes: NodeConfig[];
  connections: ConnectionConfig[];
}

interface NodeConfig {
  id: string;                    // Unique identifier
  module: string;                // Module class name
  params?: Record<string, any>;  // Module-specific parameters
  runMode?: 'inproc' | 'worker'; // Execution mode (default: 'inproc')
}

interface ConnectionConfig {
  from: string;  // Source address: "nodeId.terminal"
  to: string;    // Destination address: "nodeId.terminal"
  type?: 'direct' | 'split' | 'merge'; // Connection type (default: 'direct')
}
```

### Key Rules

1. **Node IDs must be unique** within a topology
2. **Addresses use dot notation**: `nodeId.terminalName`
   - Example: `timer1.output` → `transform1.input`
3. **Nodes must exist** before being referenced in connections
4. **Terminal names** should match your module's pipe names:
   - `inputPipe` → use terminal name `input`
   - `outputPipe` → use terminal name `output`
   - `errorPipe` → use terminal name `error`

---

## YAML Configuration Examples

YAML is the preferred format for human-readable configurations. It's less verbose than JSON and supports comments.

### Example 1: Simple Linear Pipeline

**File: `config/simple-pipeline.yaml`**

```yaml
# Simple pipeline: Timer → Uppercase → Console
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 1000
      message: "hello world"

  - id: upper1
    module: UppercaseTransform

  - id: console1
    module: ConsoleSink
    params:
      prefix: "[OUTPUT]"

connections:
  - from: timer1.output
    to: upper1.input

  - from: upper1.output
    to: console1.input
```

**How to load:**

```typescript
import { loadConfig } from 'mkolbol';
import { Executor } from 'mkolbol';

const config = loadConfig('./config/simple-pipeline.yaml');
const executor = new Executor(kernel, hostess, stateManager);
executor.load(config);
await executor.up();
```

### Example 2: Including External Process Server

**File: `config/with-external-server.yaml`**

```yaml
# Pipeline with external Python server
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 500
      message: "test message"

  # Your custom external server (from first-server-tutorial.md)
  - id: echo-server
    module: SimpleEchoWrapper
    params:
      scriptPath: ./scripts/echo-server.py

  - id: console1
    module: ConsoleSink

connections:
  - from: timer1.output
    to: echo-server.input

  - from: echo-server.output
    to: console1.input
```

**Note**: The `module` field references your wrapper class name (`SimpleEchoWrapper`), not the script path. The wrapper manages the external process lifecycle.

### Example 3: Fan-out (Split) Topology

**File: `config/fan-out.yaml`**

```yaml
# One source feeds multiple destinations
nodes:
  - id: source1
    module: TimerSource
    params:
      periodMs: 1000

  - id: sink1
    module: ConsoleSink
    params:
      prefix: "[SINK-1]"

  - id: sink2
    module: ConsoleSink
    params:
      prefix: "[SINK-2]"

  - id: sink3
    module: ConsoleSink
    params:
      prefix: "[SINK-3]"

connections:
  # Split: source1 → [sink1, sink2, sink3]
  - from: source1.output
    to: sink1.input
    type: split

  - from: source1.output
    to: sink2.input
    type: split

  - from: source1.output
    to: sink3.input
    type: split
```

**Behavior**: Each message from `source1` is cloned and sent to all three sinks.

### Example 4: Fan-in (Merge) Topology

**File: `config/fan-in.yaml`**

```yaml
# Multiple sources feed one destination
nodes:
  - id: source1
    module: TimerSource
    params:
      periodMs: 500
      message: "Source-1"

  - id: source2
    module: TimerSource
    params:
      periodMs: 700
      message: "Source-2"

  - id: source3
    module: TimerSource
    params:
      periodMs: 900
      message: "Source-3"

  - id: sink1
    module: ConsoleSink

connections:
  # Merge: [source1, source2, source3] → sink1
  - from: source1.output
    to: sink1.input
    type: merge

  - from: source2.output
    to: sink1.input
    type: merge

  - from: source3.output
    to: sink1.input
    type: merge
```

**Behavior**: All messages from the three sources are interleaved and sent to `sink1`.

### Example 5: Complex Multi-Stage Pipeline

**File: `config/multi-stage.yaml`**

```yaml
# Multi-stage: Source → Transform1 → Transform2 → Sink
nodes:
  - id: file-source
    module: FileSource
    params:
      path: ./data/input.txt
      encoding: utf8

  - id: trim-transform
    module: TrimTransform

  - id: uppercase-transform
    module: UppercaseTransform

  - id: reverse-transform
    module: ReverseTransform

  - id: file-sink
    module: FileSink
    params:
      path: ./data/output.txt
      encoding: utf8

connections:
  - from: file-source.output
    to: trim-transform.input

  - from: trim-transform.output
    to: uppercase-transform.input

  - from: uppercase-transform.output
    to: reverse-transform.input

  - from: reverse-transform.output
    to: file-sink.input
```

---

## JSON Configuration Examples

JSON is more verbose but useful when generating configs programmatically.

### Example 1: Simple Pipeline (JSON)

**File: `config/simple-pipeline.json`**

```json
{
  "nodes": [
    {
      "id": "timer1",
      "module": "TimerSource",
      "params": {
        "periodMs": 1000,
        "message": "hello world"
      }
    },
    {
      "id": "upper1",
      "module": "UppercaseTransform"
    },
    {
      "id": "console1",
      "module": "ConsoleSink",
      "params": {
        "prefix": "[OUTPUT]"
      }
    }
  ],
  "connections": [
    {
      "from": "timer1.output",
      "to": "upper1.input"
    },
    {
      "from": "upper1.output",
      "to": "console1.input"
    }
  ]
}
```

### Example 2: External Server with Custom Params (JSON)

**File: `config/custom-server.json`**

```json
{
  "nodes": [
    {
      "id": "timer1",
      "module": "TimerSource",
      "params": {
        "periodMs": 500
      }
    },
    {
      "id": "word-count",
      "module": "WordCountWrapper",
      "params": {
        "scriptPath": "./scripts/word-count.sh",
        "restartPolicy": "on-failure",
        "maxRestarts": 3
      }
    },
    {
      "id": "logger",
      "module": "LoggerSink",
      "params": {
        "logFile": "./logs/word-count.log"
      }
    }
  ],
  "connections": [
    {
      "from": "timer1.output",
      "to": "word-count.input"
    },
    {
      "from": "word-count.output",
      "to": "logger.input"
    }
  ]
}
```

---

## Test Lanes: Threads vs Forks

mkolbol uses a **dual-lane testing strategy** to handle different execution contexts. Understanding when to use each lane is critical for writing reliable tests.

### Overview

| Lane | Pool | Execution | Speed | Isolation | Use Case |
|------|------|-----------|-------|-----------|----------|
| **Threads** | `--pool=threads` | Parallel worker threads | Fast (5-10s) | Low (shared process) | Unit tests, pure logic, kernel operations |
| **Forks** | `--pool=forks` | Isolated child processes | Slower (15-20s) | High (separate processes) | Integration tests, PTY, process spawning, external servers |

### Threads Lane

**When to use:**
- Testing pure functions (transforms, parsers, validators)
- Kernel operations (connect, split, merge)
- State management logic
- Module instantiation (without spawning processes)
- Hostess registration/query (for in-process modules)

**What to avoid:**
- Spawning external processes (use forks instead)
- PTY operations (node-pty requires process isolation)
- Tests that modify global state
- Heavy I/O or network operations

**Run command:**
```bash
npm run test:ci
```

**Direct vitest:**
```bash
npx vitest run --pool=threads --exclude='**/{ptyServerWrapper,multiModalOutput,endpointsList,processMode}.spec.ts'
```

### Forks Lane

**When to use:**
- Testing external process wrappers (`ExternalServerWrapper`, `PTYServerWrapper`)
- PTY operations (terminal emulation, ANSI parsing)
- Full topology lifecycle (Executor up → run → down)
- Process spawning and communication (stdin/stdout/stderr)
- Tests requiring process isolation (avoid crosstalk)

**What to avoid:**
- Overusing forks for simple unit tests (slows CI)
- Running forks in parallel (use `singleFork: true` to prevent issues)

**Run command:**
```bash
npm run test:pty
```

**Direct vitest:**
```bash
npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/integration/*.spec.ts
```

**Important**: Forks lane runs with `singleFork: true` to prevent concurrency issues when spawning processes.

### Which Lane for Your Test?

**Decision Tree:**

```
Does your test spawn external processes?
├─ Yes → Use Forks lane
└─ No
   ├─ Does it use PTY (node-pty)?
   │  ├─ Yes → Use Forks lane
   │  └─ No
   │     ├─ Does it test Executor lifecycle with external modules?
   │     │  ├─ Yes → Use Forks lane
   │     │  └─ No
   │     │     ├─ Is it a pure logic test (transforms, parsers)?
   │     │     │  ├─ Yes → Use Threads lane
   │     │     │  └─ No
   │     │     │     └─ Does it test kernel operations only?
   │     │     │        ├─ Yes → Use Threads lane
   │     │     │        └─ No → Use Forks lane (default for integration)
```

**Examples:**

| Test Type | Lane | Reason |
|-----------|------|--------|
| Kernel.connect() moves data | Threads | Pure kernel logic |
| Config loader validates YAML | Threads | No process spawning |
| Hostess registers inproc module | Threads | No isolation needed |
| ExternalServerWrapper spawns cat | Forks | Spawns process |
| PTYServerWrapper spawns bash | Forks | Requires PTY + process |
| Executor loads topology with external nodes | Forks | Full integration test |
| ANSI parser extracts escape codes | Threads | Pure parsing logic |

---

## Running Tests Locally

### Quick Commands

```bash
# Run all tests (threads + forks)
npm test

# Run threads lane only (fast feedback)
npm run test:ci

# Run forks lane only (integration tests)
npm run test:pty

# Run specific test file (auto-detect lane)
npx vitest run tests/config/loader.spec.ts

# Run specific test file in forks lane
npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/integration/processMode.spec.ts

# Watch mode (for development)
npm run test:watch
```

### Running Your Custom Tests

After creating your acceptance tests (see [Acceptance Test Patterns](#acceptance-test-patterns)), run them:

**Threads lane (if no process spawning):**
```bash
npx vitest run tests/devex/server-acceptance.spec.ts
```

**Forks lane (if spawning external servers):**
```bash
npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/devex/server-acceptance.spec.ts
```

### With Laminar Reporting

Generate structured test reports:

```bash
# Threads lane + Laminar
npm run test:ci:lam

# Forks lane + Laminar
npm run test:pty:lam

# View summary
cat reports/LAMINAR_SUMMARY.txt

# View trends
cat reports/LAMINAR_TRENDS.txt
```

---

## Running Tests in CI

Tests run automatically in GitHub Actions on every push/PR. The CI workflow runs both lanes in parallel.

### CI Workflow Overview

**File: `.github/workflows/tests.yml`**

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [20, 24]
    steps:
      - name: Threads lane
        run: npm run test:ci

      - name: Forks lane (with process-mode)
        env:
          MK_PROCESS_EXPERIMENTAL: 1
        run: npm run test:pty

      - name: Upload Laminar reports
        uses: actions/upload-artifact@v4
        with:
          name: laminar-reports-${{ matrix.node-version }}
          path: reports/
```

**Key Points:**

1. **Both lanes run** on every commit
2. **Process-mode is required** (`MK_PROCESS_EXPERIMENTAL=1`)
3. **Artifacts are uploaded** to GitHub Actions (30-day retention)
4. **Tests use `continue-on-error`** to prevent flake-induced failures

### Viewing CI Results

1. Go to [Actions tab](https://github.com/anteew/mkolbol/actions)
2. Click on your workflow run
3. Download artifacts: `laminar-reports-20` or `laminar-reports-24`
4. Extract and view:
   - `summary.jsonl` - Structured test results
   - `LAMINAR_SUMMARY.txt` - Human-readable summary
   - `LAMINAR_TRENDS.txt` - Top recurring issues

---

## Writing Deterministic Tests

Deterministic tests are **repeatable** and **fast**. Avoid flaky tests by following these guidelines.

### 1. Avoid Fixed Timeouts

**Bad:**
```typescript
it('should process data', async () => {
  wrapper.inputPipe.write('test');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Flaky!
  expect(output).toBe('expected');
});
```

**Good:**
```typescript
it('should process data', async () => {
  const dataPromise = new Promise<string>((resolve) => {
    wrapper.outputPipe.once('data', (data) => {
      resolve(data.toString());
    });
  });

  wrapper.inputPipe.write('test');
  const output = await dataPromise;
  expect(output).toBe('expected');
});
```

**Why?** Event-driven waiting is deterministic. Fixed timeouts are fragile (depend on system load).

### 2. Wait for Events, Not Time

**Bad:**
```typescript
await wrapper.spawn();
await new Promise(resolve => setTimeout(resolve, 500)); // Race condition!
expect(wrapper.isRunning()).toBe(true);
```

**Good:**
```typescript
await wrapper.spawn(); // spawn() returns when ready
expect(wrapper.isRunning()).toBe(true);
```

**Why?** `spawn()` is already async and waits for the process to start. No timeout needed.

### 3. Use Proper Cleanup

**Bad:**
```typescript
afterEach(() => {
  // Forget to shutdown wrapper
});
```

**Good:**
```typescript
afterEach(async () => {
  if (wrapper && wrapper.isRunning()) {
    await wrapper.shutdown();
  }
});
```

**Why?** Leaked processes cause test pollution and CI failures.

### 4. Collect All Output Before Asserting

**Bad:**
```typescript
let output = '';
wrapper.outputPipe.on('data', (data) => {
  output += data.toString();
});
wrapper.inputPipe.write('test\n');
await new Promise(resolve => setTimeout(resolve, 100));
expect(output).toBe('test\n'); // Might fail if slow
```

**Good:**
```typescript
const chunks: Buffer[] = [];
wrapper.outputPipe.on('data', (data) => {
  chunks.push(Buffer.from(data));
});

wrapper.inputPipe.write('test\n');
wrapper.inputPipe.end();

await new Promise<void>((resolve) => {
  wrapper.outputPipe.once('end', resolve);
});

const output = Buffer.concat(chunks).toString();
expect(output).toBe('test\n');
```

**Why?** Waiting for `end` event ensures all data is received.

### 5. Avoid Race Conditions with Registration

**Bad:**
```typescript
const wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
const endpoints = hostess.listEndpoints(); // Empty! Not spawned yet
```

**Good:**
```typescript
const wrapper = new ExternalServerWrapper(kernel, hostess, manifest);
await wrapper.spawn(); // Wait for spawn + registration
const endpoints = hostess.listEndpoints();
const found = Array.from(endpoints.values()).find(ep => ep.type === 'external');
expect(found).toBeDefined();
```

**Why?** Registration happens during `spawn()`, not during construction.

### 6. Set Reasonable Timeouts

**Pattern:**
```typescript
describe('External Server Tests', () => {
  const testTimeout = 10000; // 10 seconds max

  it('should spawn server', async () => {
    // Test logic
  }, testTimeout);
});
```

**Why?** Prevents tests from hanging indefinitely in CI.

### 7. Use Deterministic Test Data

**Bad:**
```typescript
const randomData = Math.random().toString();
wrapper.inputPipe.write(randomData);
// Hard to debug failures!
```

**Good:**
```typescript
const testData = 'predictable-test-input';
wrapper.inputPipe.write(testData);
// Easy to reproduce and debug
```

**Why?** Deterministic inputs make failures reproducible.

---

## Acceptance Test Patterns

These patterns help you verify that your custom server is correctly wired into the mkolbol system.

### Pattern 1: Hostess Registration Test

**Purpose:** Verify your server registers with Hostess after spawning.

**Code:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from 'mkolbol';
import { Hostess } from 'mkolbol';
import { YourServerWrapper } from '../src/modules/YourServerWrapper.js';

describe('YourServer Hostess Registration', () => {
  let kernel: Kernel;
  let hostess: Hostess;
  let wrapper: YourServerWrapper;

  beforeEach(() => {
    kernel = new Kernel();
    hostess = new Hostess();
  });

  afterEach(async () => {
    if (wrapper && wrapper.isRunning()) {
      await wrapper.shutdown();
    }
  });

  it('should register endpoint with Hostess after spawn', async () => {
    wrapper = new YourServerWrapper(kernel, hostess);
    await wrapper.spawn();

    const endpoints = hostess.listEndpoints();
    const serverEndpoint = Array.from(endpoints.entries()).find(
      ([_, ep]) => ep.type === 'external' && ep.coordinates.includes('your-command')
    );

    expect(serverEndpoint).toBeDefined();
    expect(serverEndpoint![1].metadata?.ioMode).toBe('stdio');
  }, 10000);
});
```

### Pattern 2: Stream I/O Roundtrip Test

**Purpose:** Verify data flows correctly through your server.

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

  const testInput = 'test message\n';
  wrapper.inputPipe.write(testInput);
  wrapper.inputPipe.end();

  const output = await outputPromise;
  expect(output).toContain('test message'); // Adjust for your transform
}, 10000);
```

### Pattern 3: Backpressure Smoke Test

**Purpose:** Verify your server handles backpressure correctly.

**Code:**
```typescript
it('should handle backpressure with drain events', async () => {
  wrapper = new YourServerWrapper(kernel, hostess);
  await wrapper.spawn();

  const chunkSize = 64 * 1024; // 64KB chunks
  const numChunks = 50;
  let drainEvents = 0;

  const receivedChunks: Buffer[] = [];
  wrapper.outputPipe.on('data', (chunk) => {
    receivedChunks.push(Buffer.from(chunk));
  });

  for (let i = 0; i < numChunks; i++) {
    const chunk = Buffer.alloc(chunkSize, i % 256);
    const canContinue = wrapper.inputPipe.write(chunk);
    if (!canContinue) {
      drainEvents++;
      await new Promise<void>((resolve) => {
        wrapper.inputPipe.once('drain', resolve);
      });
    }
  }
  wrapper.inputPipe.end();

  await new Promise<void>((resolve) => {
    wrapper.outputPipe.once('end', resolve);
  });

  const totalReceived = receivedChunks.reduce((sum, b) => sum + b.length, 0);
  expect(totalReceived).toBe(chunkSize * numChunks);
  expect(drainEvents).toBeGreaterThan(0); // Backpressure occurred
}, 10000);
```

### Pattern 4: Lifecycle Test

**Purpose:** Verify clean startup and shutdown.

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
}, 10000);
```

### Pattern 5: Executor Integration Test

**Purpose:** Verify your server works within a full topology.

**Code:**
```typescript
it('should work in Executor topology', async () => {
  const config = {
    nodes: [
      { id: 'source1', module: 'TimerSource', params: { periodMs: 100 } },
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

  // Verify node is registered
  const state = stateManager.getState();
  const serverNode = state.nodes.find((n: any) => n.id === 'your-server');
  expect(serverNode).toBeDefined();

  // Verify endpoint exists
  const endpoints = hostess.listEndpoints();
  const serverEndpoint = Array.from(endpoints.values()).find(
    ep => ep.coordinates.includes('your-server')
  );
  expect(serverEndpoint).toBeDefined();

  await executor.down();
}, 15000);
```

---

## Troubleshooting

### Tests Fail in CI but Pass Locally

**Symptoms:**
- Tests pass on your machine
- CI shows timeouts or failures

**Solutions:**

1. **Check test timeout**: Increase timeout for slow CI environments
   ```typescript
   it('test', async () => {
     // ...
   }, 15000); // 15 seconds instead of 10
   ```

2. **Check for race conditions**: Use event-driven waiting instead of fixed timeouts

3. **Review CI logs**: Download artifacts from GitHub Actions and inspect `reports/*.jsonl`

4. **Run in forks lane locally**: Simulate CI environment
   ```bash
   npx vitest run --pool=forks --poolOptions.forks.singleFork=true your-test.spec.ts
   ```

### Tests Hang Indefinitely

**Symptoms:**
- Test never completes
- No output after "running" status

**Solutions:**

1. **Check cleanup**: Ensure `afterEach` calls `shutdown()`
   ```typescript
   afterEach(async () => {
     if (wrapper?.isRunning()) {
       await wrapper.shutdown();
     }
   });
   ```

2. **Check for missing `end()`**: Streams won't emit `end` event without it
   ```typescript
   wrapper.inputPipe.end(); // Don't forget this!
   ```

3. **Add timeout**: Force test to fail after reasonable time
   ```typescript
   it('test', async () => {
     // ...
   }, 10000); // Fail after 10 seconds
   ```

### Hostess Registration Not Found

**Symptoms:**
- `listEndpoints()` returns empty
- `query()` doesn't find your server

**Solutions:**

1. **Wait for spawn**: Registration happens during `spawn()`, not construction
   ```typescript
   wrapper = new YourServerWrapper(kernel, hostess);
   await wrapper.spawn(); // <-- Don't forget this!
   const endpoints = hostess.listEndpoints();
   ```

2. **Check manifest**: Ensure your wrapper passes correct manifest to `super()`

3. **Debug registration**: Add logging
   ```typescript
   hostess.on('register', (entry) => {
     console.log('Registered:', entry.servername);
   });
   ```

### External Process Not Spawning

**Symptoms:**
- `wrapper.isRunning()` returns false after `spawn()`
- No output on `outputPipe` or `errorPipe`

**Solutions:**

1. **Check command path**: Verify executable exists
   ```bash
   which python3
   ls -l ./scripts/your-script.py
   ```

2. **Check permissions**: Make script executable
   ```bash
   chmod +x ./scripts/your-script.py
   ```

3. **Check stderr**: Listen for error messages
   ```typescript
   wrapper.errorPipe.on('data', (data) => {
     console.error('Stderr:', data.toString());
   });
   ```

4. **Enable debug**: Set environment variable
   ```bash
   DEBUG=1 npx vitest run your-test.spec.ts
   ```

### Data Not Flowing

**Symptoms:**
- Data written to `inputPipe` doesn't appear on `outputPipe`
- No errors, but no output

**Solutions:**

1. **Check wiring**: Verify connections in topology
   ```typescript
   kernel.connect(source.outputPipe, wrapper.inputPipe);
   kernel.connect(wrapper.outputPipe, sink.inputPipe);
   ```

2. **Check for paused streams**: Resume if needed
   ```typescript
   if (wrapper.outputPipe.isPaused()) {
     wrapper.outputPipe.resume();
   }
   ```

3. **Check external script**: Ensure it flushes output
   ```python
   # Python
   sys.stdout.flush()
   ```

4. **Add trace logging**: Log all data events
   ```typescript
   wrapper.inputPipe.on('data', (d) => console.log('IN:', d));
   wrapper.outputPipe.on('data', (d) => console.log('OUT:', d));
   ```

---

## Next Steps

Now that you understand wiring and testing:

1. **Create your topology config** - Start with YAML for clarity
2. **Write acceptance tests** - Use patterns from [Acceptance Test Patterns](#acceptance-test-patterns)
3. **Run tests locally** - Verify in both threads and forks lanes
4. **Review test reports** - Use Laminar summaries to catch issues
5. **Integrate with CI** - Push to GitHub and verify CI passes

**Additional Resources:**

- [First Server Tutorial](./first-server-tutorial.md) - Build your first module
- [Early Adopter Guide](./early-adopter-guide.md) - Overview of mkolbol adoption
- [CI Testing Guide](../testing/ci.md) - Deep dive into test lanes and CI
- [Laminar Integration](../testing/laminar-integration.md) - Test observability with Laminar

**Example Projects:**

- [tests/devex/](../../tests/devex/) - Acceptance test examples
- [src/examples/](../../src/examples/) - Working topology demos
- [tests/integration/](../../tests/integration/) - Full integration test suite
