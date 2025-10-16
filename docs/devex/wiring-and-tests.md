# Wiring External Processes: Configuration Guide

## Overview

The ExternalProcess module enables seamless integration of external executables into mkolbol topologies. Configure via YAML/JSON to spawn processes with stdio or pty I/O modes.

## Configuration Basics

### Minimal Config

```yaml
nodes:
  - id: echo1
    module: ExternalProcess
    params:
      command: /bin/cat
      ioMode: stdio
```

### Full Config Options

```yaml
nodes:
  - id: myprocess
    module: ExternalProcess
    params:
      # Process spawn
      command: /bin/bash              # Executable path or name
      args: ["-c", "cat"]             # Command arguments
      env:                            # Environment variables
        DEBUG: "1"
      cwd: /tmp                       # Working directory
      
      # I/O mode
      ioMode: stdio                   # 'stdio' | 'pty'
      
      # Restart policy
      restart: on-failure             # 'never' | 'on-failure' | 'always'
      restartDelay: 5000              # ms between restarts
      maxRestarts: 3                  # Max restart attempts
      
      # PTY-specific (when ioMode: pty)
      terminalType: xterm-256color
      initialCols: 80
      initialRows: 24
```

## I/O Modes

### stdio Mode

Lightweight pipe-based I/O without terminal emulation. Use for filters, data processors, and non-interactive programs.

**When to use:**
- Plain text or binary data processing
- CLI tools (jq, sed, grep)
- No ANSI/terminal control needed
- Maximum performance

**Example: Data Filter**

```yaml
nodes:
  - id: source1
    module: TimerSource
    params:
      periodMs: 1000
  
  - id: filter1
    module: ExternalProcess
    params:
      command: /bin/cat
      ioMode: stdio
  
  - id: sink1
    module: ConsoleSink
    params:
      prefix: "[filtered]"

connections:
  - { from: source1.output, to: filter1.input }
  - { from: filter1.output, to: sink1.input }
```

**Performance:** Low latency (~100μs), minimal overhead

### pty Mode

Pseudo-terminal emulation for interactive applications. Use for shells, TUIs, and programs requiring terminal capabilities.

**When to use:**
- Interactive shells (bash, zsh)
- TUI applications (vim, htop)
- ANSI escape sequences
- Terminal window size support

**Example: Interactive Shell**

```yaml
nodes:
  - id: shell1
    module: ExternalProcess
    params:
      command: /bin/bash
      args: []
      ioMode: pty
      terminalType: xterm-256color
      initialCols: 80
      initialRows: 24
  
  - id: parser1
    module: AnsiParserModule
  
  - id: renderer1
    module: XtermTTYRenderer

connections:
  - { from: shell1.output, to: parser1.input }
  - { from: parser1.output, to: renderer1.input }
```

**Performance:** Higher latency (~500μs), manages terminal state

## Restart Policies

Control process lifecycle behavior:

- **never**: No automatic restart (default)
- **on-failure**: Restart only if exit code ≠ 0
- **always**: Always restart after exit

```yaml
nodes:
  - id: resilient1
    module: ExternalProcess
    params:
      command: /usr/bin/my-service
      ioMode: stdio
      restart: on-failure
      restartDelay: 5000
      maxRestarts: 3
```

## Complete Topology Examples

### Example 1: stdio Echo Pipeline

```yaml
nodes:
  - { id: timer1, module: TimerSource, params: { periodMs: 1000 } }
  - { id: echo1, module: ExternalProcess, params: { command: /bin/cat, ioMode: stdio } }
  - { id: console1, module: ConsoleSink, params: { prefix: "[echo]" } }

connections:
  - { from: timer1.output, to: echo1.input }
  - { from: echo1.output, to: console1.input }
```

### Example 2: PTY with ANSI Parsing

```yaml
nodes:
  - id: pty1
    module: ExternalProcess
    params:
      command: /bin/bash
      args: ["-c", "while true; do echo -e '\\e[1;32mGreen\\e[0m'; sleep 1; done"]
      ioMode: pty
      terminalType: xterm-256color
  
  - id: ansi1
    module: AnsiParserModule
  
  - id: console1
    module: ConsoleSink

connections:
  - { from: pty1.output, to: ansi1.input }
  - { from: ansi1.output, to: console1.input }
```

### Example 3: Multi-Modal Output

```yaml
nodes:
  - id: shell1
    module: ExternalProcess
    params:
      command: /bin/bash
      ioMode: pty
  
  - id: tty1
    module: XtermTTYRenderer
  
  - id: log1
    module: ConsoleSink
    params:
      prefix: "[raw]"

connections:
  - { from: shell1.output, to: tty1.input }
  - { from: shell1.output, to: log1.input }
```

## Running Configurations

The easiest way to run a config file is with `mkctl run`:

```bash
# Build project
npm run build

# Run config with mkctl run (recommended)
node dist/scripts/mkctl.js run --file examples/configs/my-topology.yml

# Customize duration (default 5 seconds)
node dist/scripts/mkctl.js run --file examples/configs/my-topology.yml --duration 10
```

**Legacy alternatives** (still supported):

```bash
# Via config-runner script
node dist/examples/config-runner.js --file examples/configs/my-topology.yml

# Or via tsx (development)
npx tsx examples/config-runner.ts --file examples/configs/my-topology.yml
```

**Why mkctl run?**
- Unified interface for running any topology
- Automatically registers modules with Hostess
- Endpoint metadata is captured for `mkctl endpoints` discovery
- Works identically locally and in distributed deployments

## Testing External Processes

Use the **forks** lane for tests involving ExternalProcess or PTYServerWrapper:

```bash
# Forks lane (process isolation required)
npm run test:pty

# Threads lane (no external processes)
npm run test:ci
```

**Why forks?** Process-mode isolation prevents stdio/pty cross-talk between concurrent tests.

## Troubleshooting

**Process not spawning:**
- Check `command` path is absolute or in PATH
- Verify `cwd` exists
- Inspect stderr via `errorPipe`

**stdio vs pty confusion:**
- stdio: Binary/text data, no terminal
- pty: Interactive, ANSI codes, terminal emulation

**Restart not working:**
- Ensure `restart` policy is set
- Check `maxRestarts` limit not exceeded
- Review `restartDelay` timing

## Acceptance Testing Notes

### Executor Integration Testing

For developers testing executor-based topologies, enable the executor integration test using the `MK_DEVEX_EXECUTOR` flag:

```bash
# Enable executor integration tests (requires forks lane)
MK_DEVEX_EXECUTOR=1 npm run test:pty

# Or with Laminar for structured test logging
MK_DEVEX_EXECUTOR=1 npm run test:pty:lam
```

**What this flag does:**
- Enables tests that exercise the full Executor topology loading and wiring flow
- Requires forks lane for process-mode isolation (prevents stdio/pty cross-talk)
- Tests complete topology lifecycle: load → up → down

**Why gate executor tests?**
- Executor tests spawn real processes and are resource-intensive
- Longer execution time than basic unit tests
- Optional for simple server implementations

### Verification Checklist

After wiring your external process config, verify:

1. **Config syntax** - YAML/JSON parses without errors
2. **Command path** - Use absolute paths or ensure command is in PATH
3. **I/O mode** - Explicit `ioMode: stdio` or `ioMode: pty`
4. **Connections** - Wire nodes correctly (source → process → sink)
5. **Test execution** - Run in forks lane for process-based tests
6. **Endpoint registration** - `mkctl endpoints` shows your process

## References

- [Acceptance Suite](./acceptance-suite.md) - Copy-pasteable tests for server implementations
- [StdIO Path Guide](./stdio-path.md) - Deep dive on stdio mode
- [Interactive Topology](./interactive-topology.md) - Keyboard → PTY → TTY demo
- [External Wrapper RFC](../rfcs/stream-kernel/11-external-wrapper.md) - Architecture details
- [PTY Wrapper Patterns RFC](../rfcs/stream-kernel/12-pty-wrapper-patterns.md) - PTY use cases
- [Example Configs](../../examples/configs/) - Working YAML examples
