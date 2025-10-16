# Quickstart: PTY to XtermTTYRenderer Demo

This guide shows you how to run a simple demonstration of mkolbol's PTY (pseudo-terminal) capabilities with the XtermTTYRenderer module. The demo spawns a bash shell in a PTY, pipes its output through the renderer to your terminal, sends a simple echo command, and then exits cleanly.

> **First time here?** Start with the **[First Five Minutes](./first-five-minutes.md)** guide to see all your options (mkctl run, StdIO path, or interactive). Then come back here for the deep dive.

## Quick Start with mkctl (Recommended)

The easiest way to run a topology from a config file is using `mkctl run`:

```bash
git clone https://github.com/anteew/mkolbol.git
cd mkolbol
npm install
npm run build

# Run the PTY demo via config
node dist/scripts/mkctl.js run --file examples/configs/external-pty.yaml
```

This loads the topology from `examples/configs/external-pty.yaml` and runs it for 5 seconds (default). To customize the duration:

```bash
# Run for 10 seconds
node dist/scripts/mkctl.js run --file examples/configs/external-pty.yaml --duration 10
```

**Why use mkctl run?**
- No need to write TypeScript/JavaScript code
- Config is shareable and version-controllable
- Same approach scales from local development to distributed deployments
- See **[Wiring and Testing Guide](./wiring-and-tests.md)** for how to build your own config files

### Inspect routing announcements

After `mkctl run` finishes it writes a RoutingServer snapshot to `reports/router-endpoints.json`. View it with:

```bash
mkctl endpoints
```

You’ll see the endpoint id, module type, coordinates (`node:<id>` for in-process modules), and the timestamps when the announcement was recorded. Re-run the command any time to confirm which modules are currently live.

---
### Local Node Mode (MK_LOCAL_NODE=1)

By default, mkolbol runs in Local Node mode with in-process routing only. This is enforced via the `MK_LOCAL_NODE=1` environment variable:

```bash
# Explicitly set Local Node mode (in-process Router only)
MK_LOCAL_NODE=1 node dist/scripts/mkctl.js run --file examples/configs/basic.yml
```

**What Local Node mode does:**
- **Enables:** In-process RoutingServer, Executor, Hostess, StateManager
- **Disables:** Network transports, distributed routing, multi-machine topologies
- **Validates:** Config loader rejects any node with `type=network` or `address` parameters

**When to use Local Node mode:**
- Local development and testing
- Single-machine deployments
- When you don't need network communication

**Future:** When `MK_LOCAL_NODE` is not set (or set to `0`), network adapters and distributed routing will be available. This feature is planned for future releases.

---

## Local Node v1.0 Demo: HTTP to Console

This is the canonical "hello world" for Local Node routing. It demonstrates:
- ExternalProcess (HTTP server) → ConsoleSink (terminal output)
- RoutingServer endpoint discovery
- Local Node topology lifecycle (spawn, run, shutdown)

### Quick Start

**Terminal 1: Start the topology**

```bash
export MK_LOCAL_NODE=1
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local.yml --duration 10
```

Expected output:
```
Loading config from: examples/configs/http-logs-local.yml
Bringing topology up...
Topology running for 10 seconds...

[http] Server listening on http://localhost:3000
```

**Terminal 2: Send a request**

```bash
curl -s http://localhost:3000/hello
```

You'll see logged in Terminal 1:
```
[http] [2025-10-17T04:15:23.456Z] GET /hello
```

### Inspect Endpoints

While the topology runs (or immediately after with mkctl endpoints --watch):

**Terminal 3: Watch endpoints**

```bash
export MK_LOCAL_NODE=1
node dist/scripts/mkctl.js endpoints --watch
```

You'll see:
```
Registered Endpoints (RoutingServer snapshot)

ID:          localhost:web:0x0001:...
Type:        external
Coordinates: node:web
Metadata:    {"command":"node","ioMode":"stdio"}
Announced:   2025-10-17T04:15:20.123Z
Updated:     2025-10-17T04:15:20.123Z

ID:          localhost:sink:0x0002:...
Type:        output
Coordinates: node:sink
...
```

### What's Happening

1. **web node** (ExternalProcess): Runs a Node.js HTTP server that logs requests to stdout
2. **sink node** (ConsoleSink): Reads from web's output and displays to terminal with `[http]` prefix
3. **Router**: Announced and tracked both endpoints; snapshot captured at shutdown
4. **Local Node gate** (MK_LOCAL_NODE=1): In-process routing only; no network features

### Today vs Soon

**Today (Current):**
- Output → ConsoleSink (terminal console)
- Users who want persistent logs can tee output: `… | tee reports/http-demo.log`

**FilesystemSink (file output):**
- Output → FilesystemSink (writes to `reports/http-logs.jsonl`)
- Use the ready-made config: `examples/configs/http-logs-local-file.yml`

Run it:
```bash
export MK_LOCAL_NODE=1
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local-file.yml --duration 5
# In another shell, hit the server to generate logs
curl -s http://localhost:3000 >/dev/null
curl -s http://localhost:3000/test >/dev/null
ls -l reports/http-logs.jsonl
```
- Node IDs stay the same (web, sink), so the documentation diff is minimal

### FilesystemSink Format Options

FilesystemSink supports two output formats:

**Raw format (default):**
```yaml
- id: sink
  module: FilesystemSink
  params:
    path: reports/output.log
    format: raw  # default, can be omitted
```

**JSONL format with timestamps:**
```yaml
- id: sink
  module: FilesystemSink
  params:
    path: reports/output.jsonl
    format: jsonl  # wraps each chunk as {"ts": "2025-10-16T...", "data": "..."}
```

Example JSONL output:
```jsonl
{"ts":"2025-10-16T12:34:56.789Z","data":"[http] GET /hello"}
{"ts":"2025-10-16T12:34:57.123Z","data":"[http] GET /test"}
```

**Raw format with timestamps:**
```yaml
- id: sink
  module: FilesystemSink
  params:
    path: reports/output.log
    format: raw
    includeTimestamp: true  # prepends ISO timestamp to each line
```

Example timestamped raw output:
```
2025-10-16T12:34:56.789Z [http] GET /hello
2025-10-16T12:34:57.123Z [http] GET /test
```

### Configuration

The config `examples/configs/http-logs-local.yml` demonstrates:

```yaml
nodes:
  - id: web
    module: ExternalProcess
    params:
      command: node
      args:
        - -e
        - "require('http').createServer((req,res)=>{ … }).listen(3000)"
      ioMode: stdio  # stdio for non-interactive (vs. pty for shells)

  - id: sink
    module: ConsoleSink
    params:
      prefix: "[http]"  # Add prefix to all console output

connections:
  - from: web.output
    to: sink.input  # Wire HTTP logs to console
```

Learn more: **[Wiring and Testing](./wiring-and-tests.md)** for complete config schema.

---

## Manual Demo (Direct Code Execution)

For deeper control or if you're building a custom topology, you can run the TypeScript demo directly.

### Prerequisites

- **Node.js 20 or higher** (tested on Node 20.x and 24.x)
- **npm** (comes with Node.js)
- **macOS or Linux** (Windows support coming soon)
- **PTY support** on your system (available by default on macOS/Linux)

### Installation and Build

Clone the repository (if you haven't already) and install dependencies:

```bash
git clone https://github.com/anteew/mkolbol.git
cd mkolbol
npm install
```

Build the project:

```bash
npm run build
```

This compiles TypeScript source files to JavaScript in the `dist/` directory.

### Running the Demo

Execute the PTY renderer demo:

```bash
node dist/src/examples/tty-renderer-demo.js
```

### What You'll See

The demo will:
1. Enter alternate screen buffer (clears your terminal view)
2. Spawn a bash shell in a PTY
3. Send the command: `echo "xterm TTY renderer demo"`
4. Display the bash prompt, command, and output with ANSI formatting
5. Send the `exit` command to close the shell
6. Exit the alternate screen buffer and return to your normal terminal

**Expected output** (with ANSI escape sequences visible):

```
echo "xterm TTY renderer demo"
[?2004h]0;user@hostname: /path/to/mkolbol[01;32muser@hostname[00m:[01;34m/path/to/mkolbol[00m$ echo "xterm TTY renderer demo"
[?2004lxterm TTY renderer demo
[?2004h]0;user@hostname: /path/to/mkolbol[01;32muser@hostname[00m:[01;34m/path/to/mkolbol[00m$ exit
[?2004lexit
```

The output includes:
- ANSI escape codes for colors (e.g., `[01;32m` for green bold text)
- Bracketed paste mode sequences (`[?2004h` and `[?2004l`)
- Terminal title sequences (`]0;...`)
- Your actual shell prompt with username and current directory
- The echo command output: `xterm TTY renderer demo`

The demo automatically exits after approximately 1.2 seconds.

### How to Exit

The demo exits automatically. If you modify the demo code and it hangs:

- **Ctrl+C** - Interrupt the process
- **Ctrl+Z** followed by `kill %1` - Suspend and kill the background job

If the terminal state is corrupted after an abrupt exit:

```bash
reset
```

This will restore your terminal to a clean state.

### Understanding the Demo

The demo demonstrates a complete PTY pipeline:

```
PTYServerWrapper (bash) → XtermTTYRenderer → Terminal Output
```

**Key components:**

- **PTYServerWrapper**: Spawns and manages a bash process with PTY support
- **XtermTTYRenderer**: Renders raw ANSI output to the terminal (with optional alternate screen buffer)
- **Alternate Screen Buffer**: The demo uses `altBuffer: true` to avoid cluttering your terminal history

**Source code:** [src/examples/tty-renderer-demo.ts](../../src/examples/tty-renderer-demo.ts)

### Troubleshooting

#### Error: "Cannot find module"

**Problem:** The demo file doesn't exist in `dist/src/examples/`.

**Solution:** Rebuild the project:

```bash
npm run build
```

#### Error: "spawn EACCES" or PTY permission denied

**Problem:** Insufficient permissions to create a PTY.

**macOS Solution:**
- Check System Preferences → Security & Privacy → Privacy → Developer Tools
- Grant Terminal.app or your terminal emulator full disk access

**Linux Solution:**
- Ensure your user is in the `tty` group:
  ```bash
  groups | grep tty
  ```
- If not, add yourself:
  ```bash
  sudo usermod -a -G tty $USER
  ```
- Log out and log back in for changes to take effect

#### Error: "node-pty" module not found

**Problem:** The `node-pty` native dependency is not installed.

**Solution:**

1. Ensure you have build tools installed:
   - **macOS**: `xcode-select --install`
   - **Debian/Ubuntu**: `sudo apt-get install build-essential python3`
   - **RHEL/CentOS**: `sudo yum install gcc-c++ make python3`

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

#### Node version mismatch

**Problem:** Using an unsupported Node.js version.

**Solution:** Upgrade to Node 20 or higher:

```bash
# Check current version
node --version

# Install nvm (Node Version Manager) if needed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 20
nvm install 20
nvm use 20
```

#### Terminal corrupted after demo

**Problem:** ANSI escape sequences or alternate buffer state persist after exit.

**Solution:** Reset your terminal:

```bash
reset
```

Or manually exit alternate screen buffer:

```bash
echo -e "\033[?1049l"
```

## Under the Hood

This demo uses mkolbol's **ExternalProcess** support with PTY mode. The PTYServerWrapper internally uses:

```yaml
params:
  command: /bin/bash
  ioMode: 'pty'                    # PTY mode (vs. stdio)
  terminalType: 'xterm-256color'   # Terminal emulation
```

To understand how to configure external processes from YAML/JSON files, see **[Wiring and Testing](./wiring-and-tests.md#external-process-configuration)** guide.

For non-interactive data pipelines using `stdio` mode, see the **[StdIO Path](./stdio-path.md)** guide.

## Next Steps

Congratulations on running your first topology! Here's what to explore next:

### Continue Your Journey
- **[Early Adopter Guide - Quick Start](./early-adopter-guide.md#quick-start-choose-your-path)** - Choose your next path (build, deploy, or dive deeper)
- **[Interactive Topology](./interactive-topology.md)** - Build keyboard → PTY → TTY pipelines
- **[StdIO Path](./stdio-path.md)** - Explore non-interactive data processing

### Learn More
- **[Wiring and Testing](./wiring-and-tests.md)** - Configuration and testing with external processes
- **[First Server Tutorial](./first-server-tutorial.md)** - Build your first custom module
- **[Stream Kernel RFC](../rfcs/stream-kernel/00-index.md)** - Architecture deep dive
- **[Testing with Laminar](../laminar-workflow.md)** - Test observability and debugging
- **[Examples Directory](../../src/examples/)** - More demos (split, merge, executor, multi-modal)

## Feedback

Found an issue or have suggestions? Open an issue at:
https://github.com/anteew/mkolbol/issues
