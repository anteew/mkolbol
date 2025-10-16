# mk logs - Log Tailing and Filtering Guide

## Overview

The `mk logs` command tails and filters debug logs from mkolbol modules. It reads from JSONL log files in the `reports/` directory and provides human-readable or JSON output with flexible filtering.

## Usage

```bash
mk logs [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--module <name>` | Filter logs by module name (e.g., `kernel`, `router`, `executor`) |
| `--level <level>` | Filter by log level: `error`, `warn`, `info`, or `debug` |
| `--json` | Output logs in JSON format instead of human-readable |
| `--follow` or `-f` | Follow log file in real-time (like `tail -f`) |
| `--lines <n>` | Show last N lines (default: 50) |
| `--help` | Show help message |

## Log Levels

Log levels are hierarchical. When you filter by a level, you see that level and all higher-priority levels:

- `error` - Shows only errors
- `warn` - Shows warnings and errors
- `info` - Shows info, warnings, and errors (default)
- `debug` - Shows all logs including debug messages

## Examples

### Basic Usage

```bash
# Show last 50 lines of logs (default)
mk logs

# Show last 10 lines
mk logs --lines 10

# Show last 100 lines
mk logs --lines 100
```

### Filter by Module

```bash
# Show only kernel module logs
mk logs --module kernel

# Show only router module logs
mk logs --module router

# Show only executor logs
mk logs --module executor
```

### Filter by Level

```bash
# Show only errors
mk logs --level error

# Show warnings and errors
mk logs --level warn

# Show info and above (excludes debug)
mk logs --level info

# Show all logs including debug
mk logs --level debug
```

### Combined Filters

```bash
# Show kernel errors only
mk logs --module kernel --level error

# Show last 20 filesystem-sink warnings
mk logs --module filesystem-sink --level warn --lines 20
```

### JSON Output

```bash
# Output in JSON format for parsing
mk logs --json

# JSON with filters
mk logs --module kernel --level error --json
```

### Follow/Tail Mode

```bash
# Follow logs in real-time
mk logs --follow

# Follow with filters
mk logs --module router --level warn --follow
mk logs -f  # shorthand for --follow
```

## Output Formats

### Human-Readable Format

```
[2025-10-16T19:00:01.000Z] ERROR [kernel         ] pipe.error {"pipeId":"pipe-1","error":"connection failed"}
[2025-10-16T19:00:02.000Z] WARN  [router         ] sweep.stale {"serverId":"server-1","ttl":5000}
[2025-10-16T19:00:03.000Z] INFO  [kernel         ] pipe.connect {"fromId":"node-1","toId":"node-2"}
[2025-10-16T19:00:04.000Z] DEBUG [executor       ] start {"nodeCount":3}
[2025-10-16T19:00:05.000Z] INFO  [filesystem-sink] write {"path":"/tmp/output.txt","bytes":1024}
```

### JSON Format

```json
{"timestamp":"2025-10-16T19:00:01.000Z","level":"error","module":"kernel","event":"pipe.error","payload":{"pipeId":"pipe-1","error":"connection failed"}}
{"timestamp":"2025-10-16T19:00:02.000Z","level":"warn","module":"router","event":"sweep.stale","payload":{"serverId":"server-1","ttl":5000}}
{"timestamp":"2025-10-16T19:00:03.000Z","level":"info","module":"kernel","event":"pipe.connect","payload":{"fromId":"node-1","toId":"node-2"}}
```

## Log Sources

The `mk logs` command reads from:

1. **JSONL files** in `reports/<suite>/*.jsonl` - Generated when running tests with `LAMINAR_DEBUG=1`
2. **Console output** when `DEBUG=1` is set - For live debugging during development

### Generating Logs

To generate logs that `mk logs` can read:

```bash
# Run tests with debug logging
LAMINAR_DEBUG=1 npm run test:ci

# Run a topology with debug output
DEBUG=1 mk run examples/topology.json

# Run with specific module debugging
MK_DEBUG_MODULES=kernel,router mk run examples/topology.json
```

## Module Names

Common module names you can filter by:

- `kernel` - Core streaming kernel events
- `router` - Service routing and discovery
- `executor` - Topology execution engine
- `state` - State management events
- `filesystem-sink` - File system sink module
- `pty` - PTY wrapper events
- `external` - External process wrapper events

## Use Cases

### Debugging Connection Issues

```bash
# See all kernel pipe operations
mk logs --module kernel --level debug

# Focus on errors only
mk logs --module kernel --level error
```

### Monitoring Router Health

```bash
# Watch for stale server warnings
mk logs --module router --level warn --follow
```

### Analyzing Executor Performance

```bash
# Get JSON output for analysis scripts
mk logs --module executor --json > executor-logs.json
```

### Real-time Monitoring

```bash
# Follow all warnings and errors across modules
mk logs --level warn --follow
```

## Tips

1. **Start broad, then narrow**: Begin with `mk logs` to see all logs, then add filters
2. **Use --lines for quick checks**: `mk logs --lines 10` gives you a quick snapshot
3. **JSON for scripting**: Use `--json` when piping to other tools like `jq`
4. **Combine with grep**: `mk logs --json | jq 'select(.payload.pipeId == "pipe-1")'`
5. **Follow for debugging**: Use `-f` when actively debugging a running system

## Troubleshooting

### "Debug logging is not enabled"

This means no log files were found. Generate logs by:
- Running tests with `LAMINAR_DEBUG=1`
- Running topologies with `DEBUG=1`

### No output shown

Check that:
- The `reports/` directory exists
- There are `.jsonl` files in `reports/<suite>/`
- Logs contain `debug.*` events
- Your filters aren't too restrictive

### Logs are empty or filtered out

Try:
- Remove filters: `mk logs` (no options)
- Lower the level: `mk logs --level debug`
- Check available modules: `mk logs | grep -o '\[.*\]' | sort -u`
