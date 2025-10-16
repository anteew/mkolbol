# Acceptance Pack: Local Node v1.0

This document describes the canonical acceptance scenario for **Local Node v1.0**—a single-host topology demonstrating the core integration of mkolbol's Router, Executor, and Local Node mode.

**Scenario:** HTTP application to console sink on a single host.

---

## Scenario Overview

### What We're Testing

This scenario validates that a complete mkolbol topology can:

1. **Load from YAML config** - Configuration loader accepts well-formed config files
2. **Spawn external processes** - ExternalProcess module spawns HTTP server in stdio mode
3. **Wire connections** - StateManager connects modules via streams (kernel pipes)
4. **Register endpoints** - RoutingServer captures endpoint announcements with metadata
5. **Handle I/O** - Data flows from server stdout → sink input → console
6. **Graceful shutdown** - Topology terminates cleanly on signal or timer
7. **Generate snapshots** - Router persists endpoint list for post-run inspection
8. **Enforce Local Node gate** - Network features are disabled when `MK_LOCAL_NODE=1`

### Why This Matters

This scenario is the **entry point for early adopters**. If this works, adopters can:
- Build custom server wrappers (reference: `ExternalServerWrapper`)
- Extend topologies with their own modules
- Deploy on single machines before scaling to distributed setups
- Validate their understanding of mkolbol's core concepts

### Canonical Config

The acceptance scenario uses this config:

**File:** `examples/configs/http-logs-local.yml`

```yaml
nodes:
  - id: web
    module: ExternalProcess
    params:
      command: node
      args:
        - -e
        - "require('http').createServer((req,res)=>{console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);res.end('ok')}).listen(3000,()=>console.log('Server listening on http://localhost:3000'))"
      ioMode: stdio
      restart: never

  - id: sink
    module: ConsoleSink
    params:
      prefix: "[http]"

connections:
  - from: web.output
    to: sink.input
```

**Key Design Choices:**

- **`ioMode: stdio`** - Lightweight, non-interactive data piping (vs. pty for shells)
- **`restart: never`** - HTTP server should not auto-restart on crash (policy enforcement)
- **`prefix: "[http]"`** - ConsoleSink adds prefix to all output lines for visibility
- **Inline server** - No external dependency; server is defined in config args
- **Stable node IDs** - `web` and `sink` remain constant even when sink implementation changes in future

---

## Acceptance Criteria

### Preconditions

- mkolbol source cloned and `npm install` + `npm run build` completed
- Node.js 20 or higher available
- Terminal supports UTF-8 output
- `MK_LOCAL_NODE=1` environment variable set (gates out network features)

### Steps

#### Step 1: Start the Topology

```bash
# Set Local Node mode
export MK_LOCAL_NODE=1

# Run the topology for 10 seconds (provides time for testing)
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local.yml --duration 10
```

**Expected Output (Terminal 1):**
```
[mkctl] Running in Local Node mode (MK_LOCAL_NODE=1): network features disabled.
Loading config from: examples/configs/http-logs-local.yml
Bringing topology up...
Topology running for 10 seconds...

[http] Server listening on http://localhost:3000
```

**What's Happening:**
1. mkctl validates config and loads into Executor
2. Executor instantiates `web` (ExternalProcess) node
3. ExternalProcess spawns Node.js HTTP server with inline script
4. Server logs "Server listening..." to stdout
5. ConsoleSink reads from server's stdout and adds `[http]` prefix to output
6. Topology enters running state

#### Step 2: Send HTTP Request (in another terminal, while topology runs)

```bash
# Terminal 2: Send a simple request
curl -s http://localhost:3000/hello
```

**Expected Output (Terminal 2):**
```
ok
```

**Expected Output (Terminal 1, sink receives log):**
```
[http] [2025-10-17T04:15:23.456Z] GET /hello
```

**What's Happening:**
1. curl sends HTTP GET request to server on localhost:3000
2. Server receives request and logs timestamp + method + path
3. Log line flows through stdout → ConsoleSink.input
4. ConsoleSink prepends `[http]` prefix and writes to console
5. Topology continues running (no crash or disconnect)

#### Step 3: Inspect Live Endpoints (in another terminal, while topology runs)

```bash
# Terminal 3: Watch endpoints with 1-second refresh
export MK_LOCAL_NODE=1
node dist/scripts/mkctl.js endpoints --watch --interval 1
```

**Expected Output (Terminal 3):**
```
[2025-10-17T04:15:20.123Z] Watching endpoints (refresh every 1s)...
Press Ctrl+C to stop.

Registered Endpoints (RoutingServer snapshot)

ID:          localhost:web:0x0001:external:stdio:node:…
Type:        external
Coordinates: node:web
Metadata:    {"command":"node","ioMode":"stdio"}
Announced:   2025-10-17T04:15:20.123Z
Updated:     2025-10-17T04:15:20.123Z

ID:          localhost:sink:0x0002:output:…
Type:        output
Coordinates: node:sink
Metadata:    {"prefix":"[http]"}
Announced:   2025-10-17T04:15:20.234Z
Updated:     2025-10-17T04:15:20.234Z
```

**What's Happening:**
1. RoutingServer maintains live registry of all active endpoints
2. Each endpoint has unique ID, type, coordinates, and metadata
3. `--watch --interval 1` refreshes endpoint view every second
4. Shows both `web` (external process) and `sink` (output module)
5. Timestamps indicate when endpoint was announced and last updated
6. Metadata reflects module-specific configuration

#### Step 4: Graceful Shutdown

**Option A: Wait for timer (automatic)**
```
# After 10 seconds, topology automatically shuts down
Topology running for 10 seconds...
[http] Server listening on http://localhost:3000
[http] [2025-10-17T04:15:23.456Z] GET /hello

Bringing topology down...
Done.
```

**Option B: Interrupt early (manual, Ctrl+C)**
```
# Press Ctrl+C in Terminal 1
Topology running for 10 seconds...
[http] Server listening on http://localhost:3000

^C
Received SIGINT. Shutting down...
Bringing topology down...
Interrupted.
```

**What's Happening:**
1. Executor triggers graceful shutdown sequence
2. Each module's shutdown hook is called (e.g., ExternalProcess sends SIGTERM to server)
3. ConsoleSink flushes any buffered output
4. Resources are cleaned up
5. Process exits with status 0 (success) or 130 (interrupted)

#### Step 5: Verify Router Snapshot

After the topology exits, inspect the endpoint snapshot:

```bash
# Terminal 1 (after mkctl run completes):
node dist/scripts/mkctl.js endpoints

# Or from any terminal:
cat reports/router-endpoints.json | jq .
```

**Expected Output:**
```json
[
  {
    "id": "localhost:web:0x0001:external:stdio:node:…",
    "type": "external",
    "coordinates": "node:web",
    "metadata": {
      "command": "node",
      "ioMode": "stdio"
    },
    "announcedAt": 1697520920123,
    "updatedAt": 1697520920123
  },
  {
    "id": "localhost:sink:0x0002:output:…",
    "type": "output",
    "coordinates": "node:sink",
    "metadata": {
      "prefix": "[http]"
    },
    "announcedAt": 1697520920234,
    "updatedAt": 1697520920234
  }
]
```

**What's Happening:**
1. mkctl persists RoutingServer endpoints to `reports/router-endpoints.json` at shutdown
2. This snapshot allows post-run inspection (e.g., CI/CD validation)
3. Each endpoint captures identity (id, coordinates), classification (type), and config (metadata)
4. Timestamps enable auditability

---

## Verification Checklist

Use this checklist to validate the scenario works correctly:

- [ ] **Config loads without errors** - mkctl accepts `http-logs-local.yml` without validation errors
- [ ] **Topology starts** - "Bringing topology up..." message appears; no startup crashes
- [ ] **Server starts** - "[http] Server listening on http://localhost:3000" appears in output
- [ ] **HTTP request succeeds** - `curl http://localhost:3000/hello` returns "ok"
- [ ] **Log captured** - "[http] [2025-10-...] GET /hello" appears in Terminal 1 output
- [ ] **Endpoints visible** - `mkctl endpoints --watch` shows both "web" and "sink" endpoints
- [ ] **Endpoint metadata correct** - web endpoint shows `ioMode: stdio`; sink shows `prefix: [http]`
- [ ] **Graceful shutdown** - Topology shuts down cleanly (no timeouts or crashes)
- [ ] **Router snapshot generated** - `reports/router-endpoints.json` exists after run completes
- [ ] **Snapshot contains endpoints** - Snapshot JSON is valid and contains both endpoints
- [ ] **Local Node gate enforced** - mkctl prints "[mkctl] Running in Local Node mode..."

---

## Expected Artifacts

After a successful run, you should see:

```
reports/
├── router-endpoints.json          # RoutingServer snapshot (generated at shutdown)
├── endpoints.json                 # Hostess snapshot (if available)
└── http-response.log              # Optional: if using tee workaround for persistent logs
```

### `reports/router-endpoints.json`

This is the **primary artifact**. Validate:

1. **File exists** - mkctl successfully persisted the snapshot
2. **Valid JSON** - Contains endpoint array
3. **Both endpoints present** - web (external) and sink (output)
4. **Metadata complete** - Each endpoint has type, coordinates, metadata, timestamps
5. **Timestamps reasonable** - announcedAt ≤ updatedAt, within expected range

### How to Inspect

```bash
# View as formatted JSON
cat reports/router-endpoints.json | jq .

# Count endpoints
cat reports/router-endpoints.json | jq 'length'

# Extract just endpoint IDs and types
cat reports/router-endpoints.json | jq '.[] | {id, type}'

# Filter by type
cat reports/router-endpoints.json | jq '.[] | select(.type == "external")'
```

---

## Troubleshooting

### Error: "Config file not found"

**Cause:** File path is incorrect.

**Fix:**
```bash
# Verify file exists
ls -la examples/configs/http-logs-local.yml

# Use absolute path if needed
node dist/scripts/mkctl.js run --file $(pwd)/examples/configs/http-logs-local.yml --duration 10
```

### Error: "Configuration validation failed"

**Cause:** YAML syntax error or missing required fields.

**Fix:**
```bash
# Validate YAML syntax
python3 -m yaml examples/configs/http-logs-local.yml

# Check that nodes and connections arrays exist
grep -E "^\s*(nodes|connections):" examples/configs/http-logs-local.yml
```

### No output from server

**Cause:** Server may not be flushing stdout, or ConsoleSink is not wired correctly.

**Fix:**
1. Verify connection exists: `grep -A2 "connections:" examples/configs/http-logs-local.yml`
2. Check ConsoleSink is receiving data: add temporary logging in ConsoleSink module
3. Ensure ExternalProcess ioMode is `stdio` (not `pty`)

### Curl request times out

**Cause:** Server may not be listening on 3000, or topology crashed.

**Fix:**
```bash
# Check if port 3000 is listening
lsof -i :3000

# Check mkctl output for errors in Terminal 1
# Try sending request to different port (if you modified config)
curl -v http://localhost:3000/test
```

### mkctl endpoints returns "No endpoints registered"

**Cause:** Router snapshot not yet written, or topology didn't run long enough.

**Fix:**
```bash
# Run topology with longer duration to allow snapshot to be written
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local.yml --duration 15

# Then immediately check endpoints (before snapshot expires)
node dist/scripts/mkctl.js endpoints
```

---

## FilesystemSink with PipeMeter Walkthrough (End-to-End Logging with Metrics)

### Scenario: HTTP Logs to File with Throughput Monitoring

This scenario demonstrates the **complete FilesystemSink + PipeMeter flow**: data flows from an HTTP server through a PipeMeter transform (for metrics) and then to a FilesystemSink module into a persistent JSONL log file, all coordinated by mkolbol's routing and I/O system.

**Prerequisites:** FilesystemSink and PipeMeterTransform modules must be available

### Configuration

**File:** `examples/configs/http-logs-local-file.yml`

```yaml
nodes:
  - id: web
    module: ExternalProcess
    params:
      command: node
      args:
        - -e
        - "require('http').createServer((req,res)=>{console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);res.end('ok')}).listen(3000,()=>console.log('Server listening on http://localhost:3000'))"
      ioMode: stdio
      restart: never

  - id: meter
    module: PipeMeterTransform
    params:
      emitInterval: 1000

  - id: file
    module: FilesystemSink
    params:
      path: reports/http-logs.jsonl
      format: jsonl
      mode: append
      fsync: auto

connections:
  - from: web.output
    to: meter.input
  
  - from: meter.output
    to: file.input
```

**Key Features:**

- **PipeMeterTransform** - Measures bytes/sec and messages/sec flowing through the pipeline
- **FilesystemSink with JSONL** - Structured log format with timestamps
- **`format: jsonl`** - Each line is `{"ts": "...", "data": "..."}`
- **`mode: append`** - Append to file (vs. `truncate` to overwrite)
- **`fsync: auto`** - Automatic fsync policy for data durability

### Steps

#### Step 1: Run the Topology

```bash
export MK_LOCAL_NODE=1
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local-file.yml --duration 10
```

**Expected Output:**
```
[mkctl] Running in Local Node mode (MK_LOCAL_NODE=1): network features disabled.
Loading config from: examples/configs/http-logs-local-file.yml
Bringing topology up...
Topology running for 10 seconds...

Server listening on http://localhost:3000
```

**What's Happening:**
1. mkctl validates and loads the config
2. Executor instantiates `web` (ExternalProcess), `meter` (PipeMeterTransform), and `file` (FilesystemSink)
3. FilesystemSink creates `reports/` directory and opens `http-logs.jsonl` in append mode
4. ExternalProcess spawns HTTP server
5. StateManager wires `web.output` → `meter.input` → `file.input`
6. PipeMeter begins tracking throughput metrics (bytes/sec, messages/sec)

#### Step 2: Generate HTTP Activity

In another terminal, send requests:

```bash
# Terminal 2: Send multiple requests
for i in {1..5}; do
  curl -s http://localhost:3000/request-$i
  sleep 0.5
done
```

**Expected Behavior (Terminal 1):**
- No console output from logs (they go to file, not console)
- HTTP server still runs

**What's Happening:**
1. Each curl request reaches the HTTP server
2. Server logs `[timestamp] GET /request-N` to stdout
3. These logs flow through `web.output` → `meter.input` → `meter.output` → `file.input`
4. PipeMeter increments its message count and byte count for each chunk
5. FilesystemSink wraps each line as JSONL: `{"ts": "...", "data": "..."}`
6. File grows with each request (append mode)

#### Step 3: Inspect the Log File (While Topology Runs)

In another terminal:

```bash
# Terminal 3: Watch the log file grow
tail -f reports/http-logs.jsonl
```

**Expected Output (updates as requests arrive):**
```jsonl
{"ts":"2025-10-17T04:15:23.456Z","data":"Server listening on http://localhost:3000"}
{"ts":"2025-10-17T04:15:23.789Z","data":"[2025-10-17T04:15:23.789Z] GET /request-1"}
{"ts":"2025-10-17T04:15:24.290Z","data":"[2025-10-17T04:15:24.290Z] GET /request-2"}
{"ts":"2025-10-17T04:15:24.791Z","data":"[2025-10-17T04:15:24.791Z] GET /request-3"}
{"ts":"2025-10-17T04:15:25.292Z","data":"[2025-10-17T04:15:25.292Z] GET /request-4"}
{"ts":"2025-10-17T04:15:25.793Z","data":"[2025-10-17T04:15:25.793Z] GET /request-5"}
```

**What's Happening:**
1. `tail -f` watches file for new content
2. Each request appends a line to the file
3. FilesystemSink handles backpressure (writes don't block the HTTP server)
4. File I/O is transparent to the topology

#### Step 4: Verify Log Persistence After Shutdown

After the topology runs (10 seconds), the log file persists:

```bash
# Terminal 1 (after mkctl completes):
# Logs are already written to disk

# Terminal 2: Inspect final log file
cat reports/http-logs.jsonl
```

**Expected Output:**
```jsonl
{"ts":"2025-10-17T04:15:23.456Z","data":"Server listening on http://localhost:3000"}
{"ts":"2025-10-17T04:15:23.789Z","data":"[2025-10-17T04:15:23.789Z] GET /request-1"}
{"ts":"2025-10-17T04:15:24.290Z","data":"[2025-10-17T04:15:24.290Z] GET /request-2"}
{"ts":"2025-10-17T04:15:24.791Z","data":"[2025-10-17T04:15:24.791Z] GET /request-3"}
{"ts":"2025-10-17T04:15:25.292Z","data":"[2025-10-17T04:15:25.292Z] GET /request-4"}
{"ts":"2025-10-17T04:15:25.793Z","data":"[2025-10-17T04:15:25.793Z] GET /request-5"}
```

**Key Insight:** Unlike ConsoleSink, FilesystemSink persists logs to disk. JSONL format allows easy parsing with `jq` and other tools. PipeMeter tracks pipeline throughput for performance monitoring.

### Verification Checklist

- [ ] **Directory created** - `reports/` directory exists after run starts
- [ ] **File created** - `reports/http-logs.jsonl` is created (initially empty or appended to)
- [ ] **PipeMeter instantiated** - `meter` node successfully created in topology
- [ ] **Logs written** - Each HTTP request generates a JSONL line in the file
- [ ] **File format correct** - Logs are JSONL format: `{"ts": "...", "data": "..."}`
- [ ] **JSONL parseable** - Each line is valid JSON (verify with `jq`)
- [ ] **Append mode works** - Running topology twice appends lines (doesn't truncate)
- [ ] **Backpressure handled** - HTTP requests don't stall while logs are written
- [ ] **Graceful shutdown** - FilesystemSink closes file handle cleanly at shutdown
- [ ] **File integrity** - Log file is readable and contains all expected entries
- [ ] **PipeMeter metrics** - Metrics can be queried via `meter.getMetrics()` (programmatic access)

### FilesystemSink Performance Benchmarks (T7022)

**Stress Test Results** (October 2025):

| Test Scenario | Throughput | Duration | Notes |
|---------------|-----------|----------|-------|
| **High-throughput** | ~300K msg/sec | 33-34ms | 10,000 sequential writes |
| **Concurrent writes** | 10K total messages | 26-100ms | 5 sinks × 2,000 messages each |
| **Large files** | ~270-310 MB/sec | 33-52ms | 10MB file (160 × 64KB chunks) |
| **fsync=always** | 1,000 messages | 33-88ms | With backpressure handling |
| **Mixed sizes** | 5,000 writes | 28-37ms | Alternating 16B and 1KB chunks |
| **Rapid cycles** | 50 start/stop | 46-57ms | Full lifecycle per cycle |

**Property-Based Test Coverage:**
- ✅ Write order preservation (50 runs, 1-100 messages)
- ✅ Byte counting accuracy (50 runs, random buffers)
- ✅ Path structure handling (20 runs, nested directories)
- ✅ JSONL format validation (30 runs, arbitrary strings)
- ✅ Statistics invariants (50 runs, varied workloads)

**Test Methodology:**
- Framework: Vitest + fast-check (property-based testing)
- Platform: Ubuntu 24.04.3 LTS, Node.js 20+
- Test file: `tests/renderers/filesystemSink.spec.ts`
- Total tests: 29 (22 unit + 6 stress + 5 property-based)
- Status: ✅ All tests passing

**Key Findings:**
1. **Throughput:** FilesystemSink handles >300K messages/sec for typical log messages
2. **Durability:** fsync=always mode maintains data integrity under stress
3. **Concurrency:** Multiple sinks can write simultaneously without conflicts
4. **Large files:** Handles 10MB+ files efficiently (>200 MB/sec)
5. **Backpressure:** Properly handles drain events when buffer is full
6. **JSONL:** Format validation passes for all arbitrary input strings

**Production Readiness:**
- Suitable for high-throughput logging scenarios (100K+ msg/sec)
- Concurrent write support for multi-instance topologies
- Large file support for batch processing and archival
- Property-based tests ensure correctness across edge cases

### Comparison: ConsoleSink vs FilesystemSink

| Aspect | ConsoleSink | FilesystemSink |
|--------|-------------|----------------|
| **Output** | Live console/stdout | File on disk |
| **Persistence** | Ephemeral (lost on exit) | Persistent (survives process) |
| **Latency** | Immediate | Buffered (fsync policy dependent) |
| **Use Case** | Development, debugging, CI logs | Production logging, audit trails |
| **Query** | Manual inspection | Log aggregation tools, `grep`, `tail` |
| **Integration** | Shell pipelines, `tee` | ELK, Splunk, CloudWatch, Datadog |

### Analyzing JSONL Logs with jq

Once logs are captured, you can analyze them programmatically:

**Extract just the HTTP requests:**
```bash
# Show only the GET requests
cat reports/http-logs.jsonl | jq -r 'select(.data | contains("GET")) | .data'

# Output:
# [2025-10-17T04:15:23.789Z] GET /request-1
# [2025-10-17T04:15:24.290Z] GET /request-2
```

**Count requests per second:**
```bash
# Extract timestamps and count by minute
cat reports/http-logs.jsonl | jq -r '.ts[0:16]' | sort | uniq -c

# Output:
#   2 2025-10-17T04:15
#   3 2025-10-17T04:16
```

**Convert JSONL to CSV for analysis:**
```bash
# Export as CSV for spreadsheet import
cat reports/http-logs.jsonl | jq -r '[.ts, .data] | @csv' > logs-export.csv
```

**Find slow requests:**
```bash
# Filter by timestamp range (production debugging)
cat reports/http-logs.jsonl | jq 'select(.ts >= "2025-10-17T04:15:24" and .ts < "2025-10-17T04:15:25")'
```

### Next: Integration with Monitoring

After validating FilesystemSink works, you can:

1. **Rotate logs** - Use log rotation tools (`logrotate`, `newsyslog`)
2. **Aggregate** - Ship logs to centralized system (ELK, Splunk, etc.)
3. **Parse** - Use tools like `jq` or `awk` to analyze logs programmatically
4. **Alert** - Trigger alerts based on log patterns

Example: Ship logs to cloud storage after topology runs:

```bash
# After topology completes
aws s3 cp logs/http-response.log s3://my-bucket/logs/$(date +%Y-%m-%d-%H-%M-%S).log

# Or archive locally
tar -czf logs-backup-$(date +%s).tar.gz logs/
```

### Production Workflow: FilesystemSink End-to-End

Here's a complete production workflow using FilesystemSink for observability:

**File:** `examples/configs/http-logs-production.yml`

```yaml
nodes:
  - id: web
    module: ExternalProcess
    params:
      command: node
      args:
        - -e
        - "require('http').createServer((req,res)=>{const ts = new Date().toISOString(); const log = JSON.stringify({ts, method: req.method, path: req.url, ip: req.socket.remoteAddress}); console.log(log); res.end('ok')}).listen(3000)"
      ioMode: stdio
      restart: on-failure
      maxRestarts: 3

  - id: meter
    module: PipeMeterTransform
    params:
      emitInterval: 5000

  - id: file-sink
    module: FilesystemSink
    params:
      path: logs/access.jsonl
      format: jsonl
      mode: append
      fsync: auto
      encoding: utf8

connections:
  - from: web.output
    to: meter.input
  - from: meter.output
    to: file-sink.input
```

**Run it:**
```bash
export MK_LOCAL_NODE=1
node dist/scripts/mkctl.js run --file examples/configs/http-logs-production.yml --duration 60
```

**Monitor metrics while running (in another terminal):**
```bash
# Watch the log file grow
tail -f logs/access.jsonl | jq .

# Count total events
tail -f logs/access.jsonl | wc -l
```

**Post-run analysis:**
```bash
# Total requests
wc -l < logs/access.jsonl

# Unique paths accessed
cat logs/access.jsonl | jq -r '.data | fromjson | .path' | sort | uniq -c

# Requests per IP
cat logs/access.jsonl | jq -r '.data | fromjson | .ip' | sort | uniq -c

# Create hourly summaries for trending
cat logs/access.jsonl | jq -r '.ts[0:13]' | sort | uniq -c > logs/hourly-summary.txt
```

**CI/CD Integration:**
```bash
#!/bin/bash
# verify-logging.sh

node dist/scripts/mkctl.js run --file examples/configs/http-logs-production.yml --duration 30

# Verify log file was created and has content
if [ ! -f logs/access.jsonl ] || [ ! -s logs/access.jsonl ]; then
  echo "ERROR: Log file not created or empty"
  exit 1
fi

# Verify all logs are valid JSON
if ! jq -e '.' logs/access.jsonl > /dev/null 2>&1; then
  echo "ERROR: JSONL format invalid"
  exit 1
fi

# Verify we got events
LINE_COUNT=$(wc -l < logs/access.jsonl)
if [ "$LINE_COUNT" -lt 1 ]; then
  echo "ERROR: Expected at least 1 log line, got $LINE_COUNT"
  exit 1
fi

echo "✅ FilesystemSink verification passed: $LINE_COUNT events logged"
exit 0
```

---

## Today vs Soon: Logging Path

### Today (Current - v1.0)

The acceptance scenario uses **ConsoleSink** for output:

```yaml
- id: sink
  module: ConsoleSink
  params:
    prefix: "[http]"
```

**Pros:**
- Simple and immediate
- No file I/O overhead
- Works in CI/CD pipelines
- Easy to combine with shell redirection

**Cons:**
- Logs ephemeral (lost when process exits)
- Difficult to query historical logs

**User Workaround (Persistent Logs):**

If you want logs to persist, use shell redirection or tee:

```bash
# Option 1: Redirect stdout to file
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local.yml --duration 10 | tee reports/http-logs.txt

# Option 2: Tee to file and console (prints to both)
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local.yml --duration 10 | tee -a reports/http-logs.log
```

This gives you the best of both worlds: live console output + persistent file logs.

### Soon (Future - FilesystemSink Module)

When Susan's sprint delivers **FilesystemSink**, you'll be able to write logs directly to files without tee workaround:

```yaml
- id: sink
  module: FilesystemSink          # ← Swap ConsoleSink for FilesystemSink
  params:
    path: ./logs/http-response.log
    mode: append
```

**Benefits:**
- Native mkolbol module (no shell trickery)
- Structured logging (JSONL format option)
- Integration with monitoring systems
- No external dependencies

**Migration Path:**

The node IDs (`web`, `sink`) stay the same, so the diff is minimal:

```diff
- module: ConsoleSink
+ module: FilesystemSink
```

No topology restructuring needed. Users can update their configs incrementally as the ecosystem grows.

---

## Integration with Acceptance Suite

This scenario is the **anchor** for the acceptance test suite:

- **Unit tests** (threads lane) validate individual modules in isolation
- **Process tests** (forks lane) validate spawning and lifecycle
- **Integration scenario** (this document) validates end-to-end topology with real I/O

**How to extend this scenario:**

1. **Add error injection** - What happens if server crashes? Is it restarted (no, restart: never)?
2. **Add backpressure** - What happens if client sends many rapid requests? Does ConsoleSink buffer correctly?
3. **Add cancellation** - What happens if user presses Ctrl+C mid-request? Is cleanup immediate?
4. **Add multi-instance** - Run multiple web nodes feeding one sink. Does routing merge streams correctly?

---

## Next Steps for Adopters

After validating this scenario, explore:

1. **[Early Adopter Guide](../../../docs/devex/early-adopter-guide.md)** - Concepts and architecture
2. **[Wiring and Testing Guide](../../../docs/devex/wiring-and-tests.md)** - Build custom topologies
3. **[First Server Tutorial](../../../docs/devex/first-server-tutorial.md)** - Create your own module
4. **[Laminar Workflow](../../../docs/laminar-workflow.md)** - Test observability

---

## Support

Questions about this scenario?

- **[GitHub Issues](https://github.com/anteew/mkolbol/issues)** - Report bugs or request features
- **[Discussions](https://github.com/anteew/mkolbol/discussions)** - Ask for help

---

**Ready to validate?** Follow the steps above, check off the verification checklist, and you're ready to build custom topologies!
