# mk dev, mk logs, mk trace — Developer Ergonomics

**Get instant feedback while building mkolbol topologies.**

This guide covers three developer-first commands that streamline local development: hot-reload with `mk dev`, structured logging with `mk logs`, and flow analysis with `mk trace`.

> **Status**: These commands are planned in Phase C of the mk Orchestrator RFC. This guide documents the UX, usage patterns, and troubleshooting based on the RFC specification.

---

## Quick Start

### mk dev — Hot Reload

```bash
# Start with hot reload enabled
mk dev --file mk.json

# Edit your module or config → changes reload instantly
# No need to stop/restart
```

### mk logs — Structured Tail with Filters

```bash
# Stream all logs (raw)
mk logs --file mk.json --watch

# Filter by module
mk logs --file mk.json --module http-server --watch

# Filter by level or pattern
mk logs --file mk.json --filter 'level=error' --watch
mk logs --file mk.json --filter 'pattern=GET.*404' --watch
```

### mk trace — Flow Analysis

```bash
# Capture sampled flow timings
mk trace --file mk.json --duration 30

# Export as JSON for analysis
mk trace --file mk.json --format json > trace.json

# Show top latency offenders
mk trace --file mk.json --top 10 --sort latency
```

---

## mk dev: Hot Reload

### What It Does

`mk dev` runs your topology with **file watch** enabled. When you edit:

- **TypeScript/JavaScript module source** → recompiles and restarts the module (in-process)
- **Configuration file** (mk.json or mk.yaml) → reloads and validates topology
- **Package.json dependencies** → rebuilds, then restarts affected modules

**Zero restart latency** (except the first compile). Perfect for iteration.

### Prerequisites

- Module running in `runMode: inproc` or `runMode: worker` (file watch supports these)
- Topology config in `mk.json` or `mk.yaml`
- Source code accessible from the repo root

### Usage

#### Basic Startup

```bash
mk dev
```

Auto-discovers `mk.json` (or `mk.yaml` if configured in `.mk/options.json`).

#### Explicit Config

```bash
mk dev --file topologies/calculator.json
```

#### Verbose Output (Trace Every Reload)

```bash
mk dev --file mk.json --verbose
```

Shows file watch events, compile logs, and reload timing.

#### Duration-Limited Dev Session

```bash
# Run for 10 minutes, then exit
mk dev --file mk.json --duration 10m

# Or in seconds
mk dev --file mk.json --duration 600
```

#### Dry-Run (Validate Without Running)

```bash
mk dev --file mk.json --dry-run
```

- Validates config
- Checks file watch patterns
- Prints module manifest
- **Does not start the topology**

### File Watch Patterns

By default, `mk dev` watches:

```
src/**/*.ts          → recompile and restart module
mk.json, mk.yaml     → reload topology
package.json         → rebuild dependencies
```

Override in `.mk/options.json`:

```json
{
  "dev": {
    "watch": ["src/**/*.ts", "src/**/*.js", "config/*.yaml", "data/seeds/*.json"],
    "ignore": ["**/*.test.ts", "**/node_modules"]
  }
}
```

### State Management During Reload

When a module reloads:

1. **In-process modules**: Graceful shutdown → recompile → restart (preserves port allocations)
2. **Worker modules**: Spawn new worker → wait for ready signal → terminate old worker
3. **External processes**: Restart entire subprocess (inherits stdio/pty config)

**Output** is continuous; you'll see:

```
[mk:dev] File changed: src/http-server.ts
[mk:dev] Recompiling...
[mk:dev] ✓ Compiled in 245ms
[mk:dev] Restarting module: http-server
[http-server] Server listening on http://localhost:3000
```

### Handling Compile Errors

If a compile fails:

```
[mk:dev] File changed: src/parser.ts
[mk:dev] Recompiling...
[mk:dev] ✗ Compile error in src/parser.ts:42:10
[mk:dev] Error: Property 'parse' does not exist on type 'Parser'.
[mk:dev] Run: mk doctor --section types
```

**The topology keeps running** with the previous working version. Fix the error and save again.

### Debugging During Development

Enable additional instrumentation:

```bash
# Debug: show all file watch events
mk dev --file mk.json --debug watch

# Debug: show reload lifecycle
mk dev --file mk.json --debug reload

# Debug: show memory and CPU per module
mk dev --file mk.json --debug metrics
```

Output includes module memory, compile time, and startup time:

```
[mk:dev] Module Metrics (10s sample)
  http-server:  12.4 MB, compiled in 245ms, started in 89ms
  parser:       5.2 MB,  compiled in 156ms, started in 42ms
  filesink:     2.1 MB,  no change
```

### Stopping Development

```bash
Ctrl+C
```

Gracefully shuts down all modules and closes file watchers.

---

## mk logs: Structured Logging with Filters

### What It Does

`mk logs` reads logs from all running modules and provides **structured filtering**. Logs are captured via:

- **stdout/stderr** from external processes
- **console.log** from in-process modules
- **Logger instances** in modules that expose a log endpoint
- **RoutingServer events** (module startup, shutdown, endpoint discovery)

### Usage

#### Stream All Logs

```bash
mk logs --watch
```

Shows all output from all modules with timestamps and module prefix:

```
[http-server] [2025-10-17T10:23:45.123Z] Server listening on http://localhost:3000
[parser] [2025-10-17T10:23:45.234Z] Parser ready
[filesink] [2025-10-17T10:23:45.456Z] Output file: logs/output.jsonl
[http-server] [2025-10-17T10:23:46.012Z] [GET /health] 200 OK (2.3ms)
```

#### Filter by Module

```bash
mk logs --module http-server --watch
```

Shows only logs from `http-server`:

```
[http-server] [2025-10-17T10:23:45.123Z] Server listening on http://localhost:3000
[http-server] [2025-10-17T10:23:46.012Z] [GET /health] 200 OK (2.3ms)
[http-server] [2025-10-17T10:23:46.145Z] [GET /api/data] 200 OK (12.4ms)
```

#### Filter by Log Level

```bash
# Only errors and warnings
mk logs --level error,warning --watch

# Only info and debug
mk logs --level info,debug --watch
```

Levels (from most to least severe):

- `error` — runtime failures, exceptions
- `warning` — deprecations, slow operations, retries
- `info` — normal operation, requests, module lifecycle
- `debug` — fine-grained flow, loop iterations, state changes
- `trace` — every message, extremely verbose

#### Filter by Pattern (Regex)

```bash
# Show only GET requests
mk logs --pattern 'GET' --watch

# Show only 404 errors
mk logs --pattern '[4][0-9]{2}' --watch

# Show errors and warnings
mk logs --pattern '(ERROR|WARN)' --watch

# Case-insensitive
mk logs --pattern '(?i)timeout' --watch
```

#### Combine Filters

```bash
# Errors from http-server only
mk logs --module http-server --level error --watch

# Warnings or errors matching "timeout"
mk logs --level error,warning --pattern 'timeout' --watch
```

#### Tail Last N Lines (No Watch)

```bash
# Last 20 lines since startup
mk logs --tail 20

# Last 100 lines
mk logs --tail 100
```

#### Export Logs to File

```bash
# Stream to file while watching
mk logs --watch --output logs/dev-session.log

# Tail and export
mk logs --tail 50 --output logs/recent.log
```

#### JSON Output (For Scripting)

```bash
# Export as JSONL (newline-delimited JSON)
mk logs --format jsonl --output logs/structured.jsonl

# Parse in another tool
mk logs --format jsonl | jq '.module, .level, .message'
```

### Log Timestamp & Timezone

By default, logs use ISO 8601 UTC timestamps. Configure in `.mk/options.json`:

```json
{
  "logs": {
    "timezone": "local", // local | UTC
    "format": "iso|human|epoch"
  }
}
```

#### Format Examples

```
[iso]   2025-10-17T10:23:45.123Z
[human] Oct 17, 10:23:45 AM
[epoch] 1729163025123
```

### Structured Log Schema

When exported as JSON, each log entry has:

```json
{
  "ts": "2025-10-17T10:23:45.123Z",
  "module": "http-server",
  "level": "info",
  "message": "[GET /health] 200 OK (2.3ms)",
  "fields": {
    "method": "GET",
    "path": "/health",
    "status": 200,
    "latency_ms": 2.3
  }
}
```

Modules can emit structured logs with `fields` by using the Logger interface (documented in [Authoring a Module](./authoring-a-module.md)).

---

## mk trace: Flow Analysis

### What It Does

`mk trace` captures **sampled flow timings** for every message through your topology. It answers:

- "Which module is slowest?"
- "Where do messages spend the most time?"
- "What's the tail latency (p95, p99) for this pipeline?"

Traces are **non-intrusive** (< 1% performance overhead) and **optional** to enable.

### Usage

#### Basic Capture

```bash
mk trace --duration 30
```

Captures traces for 30 seconds, then prints a summary:

```
[mk:trace] Captured 50,000 messages in 30.0s (1,667 msg/sec)

Top 10 Latency Offenders (total time)
  1. parser (5.2s, 25%) — 50,000 messages
  2. http-server (2.8s, 13%) — 50,000 messages
  3. filesink (1.4s, 7%)  — 50,000 messages

Latency Distribution (p50 / p95 / p99)
  parser:      2.1ms / 12.3ms / 45.6ms
  http-server: 0.8ms / 3.4ms  / 12.1ms
  filesink:    0.4ms / 0.9ms  / 2.2ms

[mk:trace] Wrote detailed report to reports/trace-2025-10-17T102345Z.json
```

#### Export for Analysis

```bash
# JSON format (flamegraph-compatible)
mk trace --duration 10 --format json --output my-trace.json

# Analyze with external tools
cat my-trace.json | jq '.[] | select(.latency_ms > 10)'
```

#### Sort & Filter Results

```bash
# Top 20 slowest modules
mk trace --duration 30 --top 20 --sort latency

# Show only modules with > 1ms average latency
mk trace --duration 30 --threshold 1.0

# Show by throughput (msg/sec)
mk trace --duration 30 --sort throughput
```

#### Continuous Tracing

```bash
# Keep capturing until you press Ctrl+C
mk trace --watch

# Emit summary every 10 seconds
mk trace --watch --summary-interval 10
```

### Performance Impact

Tracing adds:

- **CPU**: ~0.5% per topology (negligible)
- **Memory**: ~2MB per million messages
- **Latency**: < 50 microseconds per message (sub-millisecond noise)

Safe to leave enabled during all development.

### Distributed Traces (Future)

In future releases, traces will support:

- Correlation IDs (follow a single message through the whole system)
- Cross-node tracing (distributed topologies)
- OpenTelemetry export

For now, traces are local-only and show per-module timing only.

---

## Integration with First Five Minutes & Recipes

These three commands integrate into your workflow:

### Typical Iteration Loop

```bash
# 1. Start development with hot reload
mk dev

# 2. Edit your module (in another terminal)
# (reload happens automatically)

# 3. Watch logs to see the effect
mk logs --module my-module --pattern 'important' --watch

# 4. Identify slowness
mk trace --duration 5 --top 5 --sort latency

# 5. Fix and repeat
```

### With Examples

Example: Building a rate-limiter module.

```bash
# Start topology with hot reload
mk dev --file examples/configs/rate-limit-demo.json

# In another terminal, watch for limit-exceeded errors
mk logs --pattern 'LIMIT_EXCEEDED' --watch

# Trace to see where bottleneck is
mk trace --top 3 --sort latency
```

---

## Troubleshooting

### mk dev: No Reload Happening

**Problem**: File changes don't trigger reload.

**Checklist**:

1. Verify file path is correct: `mk dev --verbose` shows watched paths
2. Ensure module is in `runMode: inproc` or `worker` (external processes don't hot-reload)
3. Check file is in watched patterns in `.mk/options.json`
4. On Mac: ensure Terminal has full disk access (System Preferences → Security & Privacy)

**Fix**:

```bash
# Force rebuild and restart all modules
mk dev --reload-all
```

### mk dev: Compile Errors Aren't Shown

**Problem**: Recompile fails silently; topology keeps running old version.

**Fix**: Enable verbose logging

```bash
mk dev --verbose
```

Or check errors explicitly:

```bash
mk doctor --section types
```

### mk logs: No Output

**Problem**: `mk logs --watch` shows nothing.

**Checklist**:

1. Is topology running? (`mk logs` requires `mk dev` or `mk run` to be active)
2. Are modules outputting logs? (some modules may be silent)
3. Check stdout/stderr redirection: is output captured?

**Fix**:

```bash
# Ensure topology is running
mk dev &
sleep 2
mk logs --watch  # should now show output
```

### mk logs: Too Much Output

**Problem**: `mk logs --watch` is overwhelming.

**Solutions**:

```bash
# Filter to one module
mk logs --module http-server --watch

# Filter to errors only
mk logs --level error --watch

# Tail recent lines without watching
mk logs --tail 50
```

### mk trace: Overhead Too High

**Problem**: Tracing adds noticeable latency.

**Solutions**:

- Use `--duration` to limit capture window instead of `--watch`
- Reduce sample rate: `mk trace --sample-rate 0.1` (trace 10% of messages)
- Trace only specific modules: `mk trace --module parser`

### mk trace: "No Trace Data Available"

**Problem**: `mk trace` returns empty results.

**Checklist**:

1. Is topology running with messages flowing?
2. Was capture duration long enough? (need at least 100 messages for meaningful stats)

**Fix**:

```bash
# Ensure topology is active
mk dev &
sleep 2

# Trace for longer
mk trace --duration 30 --watch
```

---

## Environment Variables

Override defaults via environment:

```bash
# Use YAML format for all mk commands
export MK_FORMAT=yaml

# Enable verbose logging
export MK_VERBOSE=1

# Set log timezone
export MK_LOG_TIMEZONE=local

# Trace sample rate (0.0-1.0)
export MK_TRACE_SAMPLE_RATE=0.5
```

---

## Quick Reference

| Command    | Purpose                    | Key Flags                                               |
| ---------- | -------------------------- | ------------------------------------------------------- |
| `mk dev`   | Hot reload on file changes | `--file`, `--duration`, `--verbose`, `--dry-run`        |
| `mk logs`  | Stream & filter logs       | `--module`, `--level`, `--pattern`, `--watch`, `--tail` |
| `mk trace` | Analyze flow latency       | `--duration`, `--top`, `--sort`, `--format`, `--watch`  |

---

## Next Steps

- **[First Five Minutes](./first-five-minutes.md)** — Get started with basics
- **[mkctl Cookbook](./mkctl-cookbook.md)** — Reference for endpoints and other CLI tools
- **[Recipes](./recipes.md)** — Copy-paste patterns using mk dev/logs/trace
- **[Troubleshooting](./troubleshooting.md)** — Deep dive into common issues
