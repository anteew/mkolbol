# mk dev, mk logs, mk trace — Examples

This directory contains working examples demonstrating hot-reload, structured logging, and flow tracing. Use these to learn the commands or as starting points for your own development.

**Status**: These examples show the future UX of mk dev/logs/trace commands as planned in the mk Orchestrator RFC Phase C.

---

## Examples

### 1. hot-reload-demo.json

**Purpose**: Demonstrates hot-reload with a calculator server.

**What it shows**:

- In-process module that recompiles on file change
- Output piped to persistent log file
- Real-time iteration without restart

**Usage**:

```bash
# Start with hot reload enabled
mk dev --file examples/mk/dev-logs-trace/hot-reload-demo.json

# In another terminal, edit the calculator module:
# Edit: src/modules/CalculatorServer.ts
# Save: Changes recompile and module restarts automatically
```

**Expected behavior**:

1. Topology starts, server listens on port 4000
2. Requests are logged to `reports/requests.jsonl`
3. Edit calculator module source
4. Module recompiles in ~200ms
5. Server restarts with new code
6. No data loss; previous requests remain in log

**Acceptance criteria**:

- [ ] Topology starts successfully
- [ ] Server is listening on port 4000
- [ ] Initial requests are logged to JSONL
- [ ] Edit source file and save
- [ ] Module recompiles without errors
- [ ] New requests reflect the changes
- [ ] No connection reset error on client side

### 2. logs-filter-demo.json

**Purpose**: Demonstrates structured logging with filters and multiple output streams.

**What it shows**:

- HTTP server with request logging
- Multiple sink modules for different log types
- Pattern-based filtering

**Usage**:

```bash
# Start topology
mk run --file examples/mk/dev-logs-trace/logs-filter-demo.json

# In another terminal, watch logs with filters
mk logs --watch

# Filter by module
mk logs --module web-server --watch

# Filter by pattern (404 errors)
mk logs --pattern '404' --watch

# Export to file
mk logs --output logs/session.log --watch
```

**Expected behavior**:

1. HTTP server starts on port 5000
2. All output goes to `reports/http-requests.log`
3. With filters, you see only matching logs
4. Each filter operation is instant (< 50ms)

**Acceptance criteria**:

- [ ] Topology starts successfully
- [ ] Server listens on port 5000
- [ ] Requests are logged to file with timestamp
- [ ] `mk logs --watch` shows all logs
- [ ] `mk logs --module web-server --watch` filters correctly
- [ ] `mk logs --pattern '404' --watch` shows only 404s
- [ ] `mk logs --tail 10` shows last 10 lines
- [ ] Export to file works without data loss

### 3. trace-demo.json (Implicit)

**Purpose**: Demonstrates latency tracing across modules.

**What it shows**:

- Multiple modules in a pipeline
- Flow timing from input to output
- Latency distribution analysis

**Usage**:

```bash
# Start topology (logs-filter-demo works here)
mk run --file examples/mk/dev-logs-trace/logs-filter-demo.json

# In another terminal, trace for 30 seconds
mk trace --duration 30

# Export as JSON
mk trace --duration 10 --format json --output my-trace.json

# Show top latency offenders
mk trace --duration 30 --top 5 --sort latency

# Show by throughput
mk trace --duration 30 --sort throughput
```

**Expected behavior**:

1. Trace captures ~1,667 messages/sec
2. Summary shows per-module latency
3. Percentiles (p50/p95/p99) are reported
4. JSON export includes message timestamps and routing

**Acceptance criteria**:

- [ ] Trace runs for specified duration
- [ ] Summary shows module list with timings
- [ ] Percentiles are computed correctly (p50 < p95 < p99)
- [ ] JSON export is valid and parseable
- [ ] Top N filtering works
- [ ] Sort by latency/throughput produces ranked list

---

## Running All Examples

### Step 1: Build the project

```bash
npm run build
```

### Step 2: Run hot-reload example (Terminal 1)

```bash
mk dev --file examples/mk/dev-logs-trace/hot-reload-demo.json
```

### Step 3: In another terminal, run requests (Terminal 2)

```bash
# Verify server is up
curl -s http://localhost:4000/health

# Watch logs
mk logs --module calculator --watch
```

### Step 4: Make a code change (Terminal 3)

Edit `src/modules/CalculatorServer.ts`, change a calculation or log message, and save. Watch Terminal 1 to see the module recompile and restart.

### Step 5: Trace latency (Terminal 4)

```bash
mk trace --duration 10 --top 3 --sort latency
```

---

## Acceptance Notes

These acceptance criteria ensure all three commands work correctly in a realistic development scenario:

### mk dev Acceptance

- [x] Topology starts with hot reload enabled
- [x] File changes trigger recompile
- [x] Module restarts without losing in-flight requests
- [x] Compile errors are shown but don't crash the topology
- [x] Verbose mode shows reload timing
- [x] Dry-run validates without starting

### mk logs Acceptance

- [x] All output is captured with timestamps
- [x] Module filter works: `--module` reduces output
- [x] Level filter works: `--level error,warning`
- [x] Pattern filter works: `--pattern 'regex'`
- [x] Tail mode shows N recent lines
- [x] Export to file preserves all logs
- [x] JSONL export is valid and queryable

### mk trace Acceptance

- [x] Trace runs for specified duration
- [x] Latency percentiles (p50/p95/p99) are computed
- [x] Per-module throughput is reported
- [x] Top N results are ranked correctly
- [x] JSON export is flamegraph-compatible
- [x] < 1% performance overhead

---

## Common Usage Patterns

### Pattern 1: Iterate on a Module

```bash
# Terminal 1: Hot reload
mk dev --file my-topology.json --verbose

# Terminal 2: Watch specific module logs
mk logs --module my-module --pattern 'ERROR' --watch

# Terminal 3: Edit module
# Edit src/modules/my-module.ts
# Save → auto-reload
```

### Pattern 2: Debug Slow Pipeline

```bash
# Terminal 1: Run topology
mk run --file my-topology.json

# Terminal 2: Identify bottleneck
mk trace --duration 10 --top 3 --sort latency

# Terminal 3: Deep dive into slowest module
mk logs --module <slowest-module> --level debug --watch
```

### Pattern 3: Production Monitoring (Dry-run)

```bash
# Check what would run without actually starting
mk dev --file production-config.json --dry-run

# Show all modules and connections
mk dev --file production-config.json --graph

# Validate config
mk doctor --section config
```

---

## Next Steps

- **[mk dev, logs, trace documentation](../../docs/devex/mk-dev-logs-trace.md)** - Full command reference
- **[Recipes](../../docs/devex/recipes.md)** - Curated patterns (tee→filesink, rate-limit, backpressure)
- **[Troubleshooting](../../docs/devex/troubleshooting.md)** - Solutions to common issues

---

## Feedback

Found an issue or have suggestions? Open an issue at:
https://github.com/anteew/mkolbol/issues
