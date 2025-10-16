# mkctl Cookbook

Quick reference guide for the most common `mkctl` commands and patterns. Use this as a daily reference when working with mkolbol topologies.

## Quick Start

**What is mkctl?**
`mkctl` is the Microkernel Control CLI—a lightweight tool to run topologies and discover running modules without writing code.

**Installation Methods:**

```bash
# Option 1: From Tarball (Recommended - offline-capable, reproducible)
curl -L https://github.com/anteew/Laminar/releases/download/v0.2.0/mkolbol-0.2.0.tar.gz \
  -o mkolbol-0.2.0.tar.gz
npm install ./mkolbol-0.2.0.tar.gz
npx mkctl

# Option 2: From Git Tag (Version-controlled, requires git)
npm install github:anteew/Laminar#v0.2.0
npx mkctl

# Option 3: From Vendor/Local Path (Full control, monorepo)
npm install file:../packages/mkolbol
npx mkctl

# Option 4: Development (local clone)
git clone https://github.com/anteew/Laminar.git
cd Laminar
npm install
npm run build
npx mkctl
```

**See [Distribution Matrix](./distribution.md) for detailed comparison and migration paths.**

---

## Installing from Different Sources

### Recipe 1: Install from Tarball (Recommended)

Best for reproducibility, offline use, and CI/CD.

**Step 1: Download the tarball**
```bash
curl -L https://github.com/anteew/Laminar/releases/download/v0.2.0/mkolbol-0.2.0.tar.gz \
  -o mkolbol-0.2.0.tar.gz
```

**Step 2: Install in your project**
```bash
npm install ./mkolbol-0.2.0.tar.gz
```

**Step 3: Use mkctl**
```bash
npx mkctl run --file config.yml
```

**Why tarball?**
- ✅ Reproducible (same file always, byte-for-byte)
- ✅ Offline after download (no network needed)
- ✅ Verifiable (you can inspect contents)
- ✅ CI/CD friendly (store in artifact repos)
- ✅ Version-clear (filename includes version)

**See also:** [Distribution Matrix](./distribution.md#1-tarball-recommended), [Releases Guide](./releases.md)

---

### Recipe 2: Pin to Git Tag

Best for version tracking in your git history.

**Step 1: Add to package.json**
```json
{
  "dependencies": {
    "mkolbol": "github:anteew/Laminar#v0.2.0"
  }
}
```

**Step 2: Install**
```bash
npm install
```

**Step 3: Use mkctl**
```bash
npx mkctl run --file config.yml
```

**Update to a new version:**
```bash
# Edit package.json with new tag
{
  "dependencies": {
    "mkolbol": "github:anteew/Laminar#v0.3.0"
  }
}

npm install
```

**Why git tag?**
- ✅ Git-native (integrates with your workflow)
- ✅ Version visible in package.json
- ✅ Easy to update and rollback
- ✅ Use exact commit hashes for maximum precision

**Note:** Requires network (clones from GitHub) and may have npm cache issues.

**See also:** [Distribution Matrix](./distribution.md#2-git-tag-pinned), [Releases Guide](./releases.md)

---

### Recipe 3: Vendor with File Path (Monorepo)

Best for full control, offline use, and active development.

**Step 1: Copy mkolbol source into your repo**
```bash
mkdir -p packages
git clone https://github.com/anteew/Laminar.git packages/mkolbol
```

**Step 2: Create root workspace (package.json)**
```json
{
  "name": "my-workspace",
  "workspaces": [
    "packages/mkolbol",
    "packages/my-app"
  ]
}
```

**Step 3: Reference in your app**
```json
{
  "name": "my-app",
  "dependencies": {
    "mkolbol": "workspace:*"
  }
}
```

**Step 4: Install everything**
```bash
npm install
```

**Step 5: Use mkctl**
```bash
cd packages/my-app
npx mkctl run --file config.yml
```

**Why vendor?**
- ✅ No network (works completely offline)
- ✅ Full control (modify source directly)
- ✅ Fast development (changes take effect immediately)
- ✅ Monorepo-native (everything in one repo)

**Updating mkolbol in vendor:**
```bash
cd packages/mkolbol
git fetch origin
git checkout v0.3.0
npm run build  # rebuild if needed
```

**See also:** [Distribution Matrix](./distribution.md#3-vendorlocal-monorepo), [Using mkolbol in Your Repo](./using-mkolbol-in-your-repo.md)

---

## Running Topologies

### Basic: Run a topology for default duration

```bash
mkctl run --file examples/configs/basic.yml
```

**What happens:**
- Loads YAML/JSON config from file
- Instantiates all modules
- Runs for **5 seconds** (default)
- Logs to stdout
- Cleans up and exits

### Validate topology without running (dry-run)

```bash
mkctl run --file examples/configs/basic.yml --dry-run
```

**What happens:**
- Loads and parses YAML/JSON config
- Validates configuration structure
- Checks for duplicate node IDs
- Verifies all connections reference existing nodes
- Validates module names against registry
- **Does NOT** instantiate modules or run topology
- Exits with appropriate exit code

**Output (valid config):**
```
Loading config from: examples/configs/basic.yml
Configuration is valid.
```

**Output (invalid config):**
```
Configuration validation failed: Connection from 'source' to non-existent node "missing"
```

**Use cases:**
- CI/CD validation pipelines
- Pre-deployment config checks
- Syntax and structure validation
- Quick feedback during config development

**Examples:**
```bash
# Validate complex topology before deployment
mkctl run --file production-topology.yml --dry-run

# Use in CI/CD pipeline
mkctl run --file config.yml --dry-run && echo "Config valid" || exit 1

# Flag can be placed anywhere
mkctl run --dry-run --file config.yml

# Check multiple configs
for cfg in configs/*.yml; do
  mkctl run --file "$cfg" --dry-run || echo "FAIL: $cfg"
done
```

**Exit codes with --dry-run:**
- `0` (SUCCESS) - Configuration is valid
- `65` (CONFIG_PARSE) - Invalid syntax or validation error
- `66` (CONFIG_NOT_FOUND) - Config file doesn't exist

### Run with custom duration

```bash
mkctl run --file examples/configs/basic.yml --duration 10
```

- `--duration 10` = run for 10 seconds
- Useful for longer-running demos or data processing

### Run from absolute path

```bash
mkctl run --file /path/to/topology.yml --duration 5
```

Always works, regardless of current working directory.

### Stop early with Ctrl+C

```bash
mkctl run --file examples/configs/basic.yml
# Press Ctrl+C to interrupt and shutdown gracefully
```

Output:
```
Topology running for 5 seconds...

Received SIGINT. Shutting down...
Bringing topology down...
Done.
```

---

## Discovering Endpoints

### List all running endpoints

```bash
mkctl endpoints
```

**Output:**
```
Registered Endpoints (RoutingServer snapshot)

ID:          localhost:timer1:0x0001:system:no:none:…
Type:        inproc
Coordinates: node:timer1
Metadata:    {"module":"TimerSource","runMode":"inproc"}
Announced:   2025-10-16T02:45:05.123Z
Updated:     2025-10-16T02:45:05.123Z
```

**What each field means:**
- **ID**: Stable identity generated by Hostess/Executor
- **Type**: Module category (`inproc`, `worker`, `process`, ...)
- **Coordinates**: Where the endpoint lives (`node:<id>`, `worker:<id>`, etc.)
- **Metadata**: Module-specific hints (module name, run mode, command)
- **Announced/Updated**: Timestamps from the RoutingServer

### Query endpoints while a topology is running

```bash
# Terminal 1: Start topology
mkctl run --file examples/configs/external-pty.yaml --duration 60

# Terminal 2: Inspect routing snapshot
mkctl endpoints
```

Whenever `mkctl run` exits it persists a snapshot to `reports/router-endpoints.json`. `mkctl endpoints` will fall back to the Hostess snapshot (`reports/endpoints.json`) if no router snapshot exists yet.

### Query endpoints in JSON format

```bash
mkctl endpoints --json
```

**Output:**
```json
[
  {
    "id": "localhost:timer1:0x0001:system:no:none:…",
    "type": "inproc",
    "coordinates": "node:timer1",
    "metadata": {"module":"TimerSource","runMode":"inproc"},
    "announcedAt": 1697520905123,
    "updatedAt": 1697520905123
  }
]
```

**Use case:** Scripting and automation (parsing in jq, Python, or other tools).

### Filter endpoints by type

```bash
# Show only external processes
mkctl endpoints --filter type=external

# Show only inproc modules
mkctl endpoints --filter type=inproc

# Show only output sinks
mkctl endpoints --filter type=output
```

**Combine with --json for programmatic access:**
```bash
mkctl endpoints --json --filter type=external | jq '.[].id'
```

---

## Common Topologies

### PTY Demo (Interactive Shell)

```bash
mkctl run --file examples/configs/external-pty.yaml --duration 10
```

Use for interactive shell demos, TTY hijacking, or PTY regression tests.

### StdIO Demo (Data Piping)

```bash
mkctl run --file examples/configs/external-stdio.yaml --duration 5
```

Use for non-interactive filters, streaming pipelines, or quick performance checks.

### HTTP Logs Demo (Local Node v1.0)

```bash
export MK_LOCAL_NODE=1
mkctl run --file examples/configs/http-logs-local.yml --duration 10
```

**In another terminal, send requests:**
```bash
curl -s http://localhost:3000/hello
curl -s http://localhost:3000/test
```

This demonstrates:
- ExternalProcess (HTTP server) → ConsoleSink (console output)
- RoutingServer endpoint discovery and lifecycle
- Local Node in-process routing
- Using `--watch` to monitor endpoints while topology runs

See **[Local Node v1.0 Demo](./quickstart.md#local-node-v10-demo-http-to-console)** for full walkthrough.

### Custom Config

```bash
mkctl run --file my-topology.yml --duration 5
```

Minimal topology:

```yaml
nodes:
  - id: source
    module: TimerSource
    params: { periodMs: 1000 }
  - id: sink
    module: ConsoleSink
    params: { prefix: "[demo]" }

connections:
  - from: source.output
    to: sink.input
```

---

## Health Checks for External Processes

External processes can be configured with health checks to ensure they're ready before the topology starts.

### Command-based Health Check

```yaml
nodes:
  - id: my-service
    module: ExternalProcess
    params:
      command: /usr/bin/my-service
      args: ['--port', '8080']
      ioMode: stdio
      healthCheck:
        type: command
        command: 'curl -f http://localhost:8080/health'
        timeout: 5000
        retries: 3
    runMode: process
```

**How it works:**
- Runs the specified shell command after spawning the process
- Expects exit code 0 for success
- Retries with exponential backoff on failure (1s, 2s, 4s, ...)
- Throws error if all retries fail

### HTTP-based Health Check

```yaml
nodes:
  - id: web-server
    module: ExternalProcess
    params:
      command: node
      args: ['server.js']
      ioMode: stdio
      healthCheck:
        type: http
        url: 'http://localhost:3000/health'
        timeout: 5000
        retries: 5
    runMode: process
```

**How it works:**
- Sends GET request to the specified URL
- Expects 2xx HTTP status code
- Retries with exponential backoff on failure
- Supports connection timeout and retry logic

### Health Check Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | `'command' \| 'http'` | required | Type of health check |
| `command` | `string` | - | Shell command to run (for `type: command`) |
| `url` | `string` | - | HTTP endpoint URL (for `type: http`) |
| `timeout` | `number` | 5000 | Timeout in milliseconds per attempt |
| `retries` | `number` | 3 | Number of retry attempts |

**Backoff behavior:**
- Retry 1: wait 1 second
- Retry 2: wait 2 seconds  
- Retry 3: wait 4 seconds
- Maximum backoff: capped at 10 seconds

---

## PipeMeter Transform

The `PipeMeterTransform` measures throughput in real-time as data flows through a pipeline.

### Basic Usage

```yaml
nodes:
  - id: source
    module: TimerSource
    params: { periodMs: 100 }
  - id: meter
    module: PipeMeterTransform
    params: { emitInterval: 1000 }
  - id: sink
    module: ConsoleSink

connections:
  - from: source.output
    to: meter.input
  - from: meter.output
    to: sink.input
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `emitInterval` | `number` | 1000 | Milliseconds between metric updates |

### Metrics Tracked

The PipeMeter tracks the following metrics:
- **totalBytes**: Cumulative bytes processed
- **totalMessages**: Cumulative message count
- **bytesPerSecond**: Current throughput (bytes/sec)
- **messagesPerSecond**: Current throughput (messages/sec)
- **startTime**: Timestamp when meter started
- **lastUpdateTime**: Timestamp of last metric update

### Use Cases

**Monitor data pipeline performance:**
```yaml
# High-throughput monitoring
nodes:
  - id: source
    module: TimerSource
    params: { periodMs: 10 }
  - id: meter
    module: PipeMeterTransform
    params: { emitInterval: 500 }
  - id: transform
    module: UppercaseTransform
  - id: sink
    module: ConsoleSink

connections:
  - from: source.output
    to: meter.input
  - from: meter.output
    to: transform.input
  - from: transform.output
    to: sink.input
```

**Multiple meters in a pipeline:**
```yaml
# Measure throughput before and after transform
nodes:
  - id: source
    module: TimerSource
  - id: meter1
    module: PipeMeterTransform
    params: { emitInterval: 1000 }
  - id: transform
    module: UppercaseTransform
  - id: meter2
    module: PipeMeterTransform
    params: { emitInterval: 1000 }
  - id: sink
    module: ConsoleSink

connections:
  - from: source.output
    to: meter1.input
  - from: meter1.output
    to: transform.input
  - from: transform.output
    to: meter2.input
  - from: meter2.output
    to: sink.input
```

### Programmatic Access

Access metrics from code:

```typescript
import { PipeMeterTransform } from './transforms/pipeMeter';

const meter = new PipeMeterTransform(kernel, { emitInterval: 1000 });

// Get current metrics
const metrics = meter.getMetrics();
console.log(`Processed ${metrics.totalMessages} messages`);
console.log(`Throughput: ${metrics.messagesPerSecond.toFixed(2)} msg/sec`);
console.log(`Bandwidth: ${metrics.bytesPerSecond.toFixed(2)} bytes/sec`);

// Clean up when done
meter.stop();
```

---

## FilesystemSink Output Formats

The `FilesystemSink` module writes pipeline data to files with configurable output formats.

### Raw Format (Default)

```yaml
nodes:
  - id: source
    module: TimerSource
    params: { periodMs: 1000 }
  - id: sink
    module: FilesystemSink
    params:
      path: reports/output.log
      format: raw  # default, can be omitted
      mode: append  # or 'truncate'
```

**Output:**
```
Hello from timer
Hello from timer
```

### JSONL Format (Timestamped JSON Lines)

```yaml
nodes:
  - id: source
    module: TimerSource
    params: { periodMs: 1000 }
  - id: sink
    module: FilesystemSink
    params:
      path: reports/output.jsonl
      format: jsonl  # wraps each chunk as JSON object
```

**Output:**
```jsonl
{"ts":"2025-10-16T12:34:56.789Z","data":"Hello from timer"}
{"ts":"2025-10-16T12:34:57.789Z","data":"Hello from timer"}
```

Each line is a valid JSON object with:
- `ts` - ISO 8601 timestamp when data was written
- `data` - The actual payload as string

**Use cases:**
- Log aggregation (Elasticsearch, Splunk)
- Stream processing (Apache Kafka, AWS Kinesis)
- Data analysis with jq or Python
- Audit trails requiring precise timestamps

### Raw Format with Timestamps

```yaml
nodes:
  - id: source
    module: TimerSource
  - id: sink
    module: FilesystemSink
    params:
      path: reports/output.log
      format: raw
      includeTimestamp: true  # prepends ISO timestamp to each line
```

**Output:**
```
2025-10-16T12:34:56.789Z Hello from timer
2025-10-16T12:34:57.789Z Hello from timer
```

**Note:** Timestamps are applied per-line, not per-chunk.

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | required | File path (absolute or relative to cwd) |
| `format` | `'raw' \| 'jsonl'` | `'raw'` | Output format |
| `includeTimestamp` | `boolean` | `false` | Add timestamp prefix (raw format only) |
| `mode` | `'append' \| 'truncate'` | `'append'` | File write mode |
| `encoding` | `BufferEncoding` | `'utf8'` | Text encoding |
| `fsync` | `'always' \| 'never' \| 'auto'` | `'auto'` | Force flush to disk |
| `highWaterMark` | `number` | `16384` | Stream buffer size (bytes) |

### Practical Example: HTTP Logs to JSONL

```yaml
nodes:
  - id: web
    module: ExternalProcess
    params:
      command: node
      args:
        - -e
        - "require('http').createServer((req,res)=>{console.log(\`[${new Date().toISOString()}] ${req.method} ${req.url}\`);res.end('OK');}).listen(3000)"
      ioMode: stdio

  - id: sink
    module: FilesystemSink
    params:
      path: reports/http-access.jsonl
      format: jsonl
      mode: append

connections:
  - from: web.output
    to: sink.input
```

**Run the topology:**
```bash
mkctl run --file examples/configs/http-logs-local-file.yml --duration 30
```

**In another terminal:**
```bash
curl http://localhost:3000/hello
curl http://localhost:3000/api/users
curl http://localhost:3000/test
```

**View structured logs:**
```bash
cat reports/http-access.jsonl | jq -r '.data'
# [2025-10-16T...] GET /hello
# [2025-10-16T...] GET /api/users
# [2025-10-16T...] GET /test

# Extract timestamps only
cat reports/http-access.jsonl | jq -r '.ts'

# Filter by path
cat reports/http-access.jsonl | jq 'select(.data | contains("/api"))'
```

### Processing JSONL with jq

```bash
# Pretty-print each record
cat output.jsonl | jq '.'

# Extract only the data field
cat output.jsonl | jq -r '.data'

# Filter by timestamp
cat output.jsonl | jq 'select(.ts >= "2025-10-16T12:00:00")'

# Count records per minute
cat output.jsonl | jq -r '.ts[0:16]' | sort | uniq -c

# Convert to CSV
cat output.jsonl | jq -r '[.ts, .data] | @csv'
```

---

## Troubleshooting Cheatsheet

| Symptom | Fix |
|---------|-----|
| `Config file not found` | Verify the path, or run `mkctl run --file $(pwd)/examples/configs/basic.yml`. |
| `Failed to read config` | Validate YAML/JSON syntax (`python -m yaml …`), ensure `nodes` and `connections` arrays exist. |
| `Health check failed` | Verify external process starts correctly and responds to health checks. Check `healthCheck.command` or `healthCheck.url` configuration. Increase `timeout` or `retries` if needed. |
| `Topology runtime error` | Confirm module names exist (registered in `ModuleRegistry`) and external commands reside on `$PATH`. |
| `No endpoints registered` | Run `mkctl run` first—the router snapshot is generated at shutdown. |
| `mkctl: command not found` | Use `npx mkctl …` or `node dist/scripts/mkctl.js …`. |

For deeper help see the **Troubleshooting** section in [README.md](../../README.md#mkctl-troubleshooting).

---

## Exit Codes Reference

mkctl uses standard exit codes to indicate success or failure:

| Exit Code | Name | Meaning | Example |
|-----------|------|---------|---------|
| `0` | SUCCESS | Command completed successfully | `mkctl run` finished without errors |
| `64` | USAGE | Invalid command-line arguments | Missing required `--file` option |
| `65` | CONFIG_PARSE | Configuration file has errors | Invalid YAML syntax or missing required fields |
| `66` | CONFIG_NOT_FOUND | Configuration file doesn't exist | Path to config file is wrong |
| `70` | RUNTIME | Error during topology execution | Failed to spawn external process or connection error |
| `130` | INTERRUPTED | Command was interrupted by user | User pressed Ctrl+C during topology run |

### Using Exit Codes in Scripts

Exit codes enable automation and CI/CD integration:

```bash
# Check if mkctl run succeeded
mkctl run --file my-config.yml
if [ $? -eq 0 ]; then
  echo "Topology completed successfully"
else
  echo "Topology failed with exit code $?"
fi
```

**Common patterns:**

```bash
# Retry on runtime error (exit code 70)
mkctl run --file config.yml || if [ $? -eq 70 ]; then echo "Retrying..."; fi

# Fail fast on config errors (exit code 65 or 66)
mkctl run --file config.yml || if [ $? -le 66 ]; then exit 1; fi

# Ignore user interruptions (exit code 130)
mkctl run --file config.yml || if [ $? -ne 130 ]; then exit 1; fi
```

---

## Router Sweeper Metrics

The RoutingServer includes built-in metrics tracking for the sweeper lifecycle. These metrics help you monitor endpoint cleanup performance and health.

### Available Metrics

```typescript
interface SweeperMetrics {
  totalSweeps: number;      // Total sweep operations performed
  totalRemoved: number;      // Cumulative endpoints removed across all sweeps
  lastSweepTime: number | null;  // Timestamp of most recent sweep (null if no sweeps yet)
}
```

### Using Sweeper Metrics

```typescript
import { RoutingServer } from 'mkolbol';

const router = new RoutingServer({ ttlMs: 30000, sweepIntervalMs: 10000 });

// Start automatic sweeping
router.startSweeper();

// Later, check metrics
const metrics = router.getSweeperMetrics();
console.log(`Total sweeps: ${metrics.totalSweeps}`);
console.log(`Total removed: ${metrics.totalRemoved}`);
console.log(`Last sweep: ${new Date(metrics.lastSweepTime!)}`);
```

### Debug Events

The sweeper emits enhanced debug events with detailed context:

**`sweep.start`** - Emitted at the beginning of each sweep:
```json
{
  "totalEndpoints": 5,
  "ttlMs": 30000,
  "sweepIntervalMs": 10000
}
```

**`sweep.stale`** - Emitted for each stale endpoint (warning level):
```json
{
  "id": "endpoint-123",
  "type": "inproc",
  "age": 45000,
  "ttlMs": 30000,
  "lastUpdated": 1697520905123,
  "coordinates": "node:timer1"
}
```

**`sweep.removed`** - Emitted after removing each endpoint:
```json
{
  "id": "endpoint-123",
  "totalRemaining": 4
}
```

**`sweep.complete`** - Emitted at the end of each sweep:
```json
{
  "removed": 2,
  "remaining": 3,
  "staleDetails": [
    { "id": "endpoint-123", "age": 45000, "type": "inproc" },
    { "id": "endpoint-456", "age": 50000, "type": "output" }
  ],
  "totalSweeps": 10,
  "totalRemoved": 25,
  "duration": 2
}
```

### Monitoring in Production

```typescript
// Periodic metrics reporting
setInterval(() => {
  const metrics = router.getSweeperMetrics();
  const rate = metrics.totalRemoved / metrics.totalSweeps;
  console.log(`Sweep removal rate: ${rate.toFixed(2)} endpoints/sweep`);
}, 60000);

// Health checks
const metrics = router.getSweeperMetrics();
if (metrics.lastSweepTime && Date.now() - metrics.lastSweepTime > 60000) {
  console.warn('Sweeper has not run in over 1 minute');
}
```

---

## Buffer Handling in ConsoleSink

ConsoleSink automatically formats Buffer objects for human-readable console output:

### UTF-8 Text Buffers (≤100 bytes)
```yaml
# Small text buffers are shown as strings
nodes:
  - id: sink
    module: ConsoleSink
```

**Output:**
```
[sink] Buffer(5) "hello"
[sink] Buffer(13) "hello world!\n"
```

### Binary Buffers (≤64 bytes)
```yaml
# Small binary buffers are shown as hex dump
nodes:
  - id: sink
    module: ConsoleSink
```

**Output:**
```
[sink] Buffer(4) [ff 00 ab cd]
[sink] Buffer(8) [de ad be ef ca fe ba be]
```

### Large Buffers (>64 bytes)
```yaml
# Large buffers show first 64 bytes + total size
nodes:
  - id: sink
    module: ConsoleSink
```

**Output:**
```
[sink] Buffer(200) [41 41 41 41 ... +136 bytes]
```

### Empty Buffers
```
[sink] Buffer(0) []
```

**Pro Tip**: ConsoleSink detects printable ASCII/UTF-8 text (including tabs, newlines) and formats accordingly. Binary data triggers hex dump mode.

---

## Error Matrix & Test Fixtures

To help you learn from common mistakes, we provide a set of bad-config fixtures that demonstrate each error. You can test these yourself to understand the error messages and how to fix them.

### Learning with Bad Configs

The `examples/configs/bad-*.yml` files are intentionally broken. Use them to:
1. See what the error message looks like
2. Understand the root cause
3. Learn how to fix it in your own configs

**Test each bad config:**

```bash
# Test invalid YAML syntax
node dist/scripts/mkctl.js run --file examples/configs/bad-invalid-yaml.yml
# Expected: Configuration validation failed: Failed to read config ...

# Test missing nodes array
node dist/scripts/mkctl.js run --file examples/configs/bad-missing-nodes.yml
# Expected: Configuration validation failed: "nodes" must be an array

# Test duplicate node IDs
node dist/scripts/mkctl.js run --file examples/configs/bad-duplicate-ids.yml
# Expected: Configuration validation failed: Duplicate node id 'timer'

# Test connection to non-existent node
node dist/scripts/mkctl.js run --file examples/configs/bad-connection-mismatch.yml
# Expected: Configuration validation failed: Connection from 'source' to non-existent node

# Test invalid command path
node dist/scripts/mkctl.js run --file examples/configs/bad-invalid-command.yml
# Expected: Failed to start topology: Command /nonexistent/bin/jq not found

# Test wrong ioMode (stdio for interactive shell)
node dist/scripts/mkctl.js run --file examples/configs/bad-wrong-iomode.yml
# Expected: Topology running, but bash won't respond to input

# Test missing connections array
node dist/scripts/mkctl.js run --file examples/configs/bad-missing-connections.yml
# Expected: Success (nodes load but don't communicate)

# Test non-existent module
node dist/scripts/mkctl.js run --file examples/configs/bad-invalid-module.yml
# Expected: Configuration validation failed: Unknown module 'NonexistentModule'

# Test health check failure
node dist/scripts/mkctl.js run --file examples/configs/bad-health-check.yml
# Expected: Health check failed for <node> after N attempts
```

### Error Message Reference

| Error | Exit Code | Cause | Fix |
|-------|-----------|-------|-----|
| `Config file not found` | 66 | File path wrong or doesn't exist | Check path: `ls -la examples/configs/bad-*.yml` |
| `Failed to read config` | 65 | YAML/JSON syntax error | Validate: `python3 -m yaml examples/configs/bad-invalid-yaml.yml` |
| `"nodes" must be an array` | 65 | Missing or malformed nodes | Add: `nodes: []` with proper indentation |
| `Duplicate node id` | 65 | Same ID used twice | Change one ID to unique name |
| `Connection from '...' to non-existent node` | 70 | Target node doesn't exist | Check node IDs in connections match nodes list |
| `Command ... not found` | 70 | External process path invalid | Use absolute paths: `/bin/bash` not `bash` |
| `Unknown module` | 65 | Module not registered | Check ModuleRegistry for valid names |
| `Health check failed` | 70 | External process not responsive or health check misconfigured | Verify process starts correctly, check health check command/URL, increase timeout/retries |

### Fixture Overview

```
examples/configs/
├── bad-invalid-yaml.yml           # Broken YAML indentation
├── bad-missing-nodes.yml          # No 'nodes' array
├── bad-duplicate-ids.yml          # Two nodes with same ID
├── bad-connection-mismatch.yml    # Connection to non-existent node
├── bad-invalid-command.yml        # External process path doesn't exist
├── bad-wrong-iomode.yml           # Interactive shell with stdio (not pty)
├── bad-missing-connections.yml    # Nodes defined but no connections
├── bad-invalid-module.yml         # Module name not in registry
└── bad-health-check.yml           # Health check that always fails
```

**Pro Tip**: Compare each bad config to the working examples (basic.yml, external-stdio.yaml, external-pty.yaml) to see what's different. This is a great way to internalize the correct config format!
