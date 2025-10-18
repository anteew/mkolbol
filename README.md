# mkolbol

[Agent Hub → AGENTS.md](AGENTS.md)

**Stream-based microkernel for AI agent systems**

## QUICKSTART — Build With mk (30–60s)

If the `mk` command isn’t in your PATH, run it via npm or node from this repo.

```bash
# 1) Prepare
export MK_LOCAL_NODE=1
npm ci && npm run build

# 2) Use mk via npm (inside this repo)
npm run mk -- --help

# 3) Scaffold the sample app (HTTP calculator)
npm run mk -- init hello-calculator --force
cd hello-calculator

# 4) Validate the topology (dry-run)
npm run mk -- run mk.json --dry-run

# 5) (Optional) Run the example calculator with mkctl
cd ..  # from inside hello-calculator, go back to repo root
node dist/scripts/mkctl.js run \
  --file examples/mk/hello-calculator/mk.yaml \
  --duration 10

# In another shell, exercise the calculator
curl 'http://localhost:4000/add?a=2&b=3'       # → {"result":5}
curl 'http://localhost:4000/subtract?a=10&b=7' # → {"result":3}

# Pro tip: make a short alias if you prefer direct invocation
alias mk="node $(pwd)/dist/scripts/mk.js"
```

Notes

- You can always run mk directly with `node dist/scripts/mk.js ...`.
- The `mk` and `mkctl` binaries are also exposed as npm scripts: `npm run mk -- …`, `npm run mkctl -- …`.
- Local‑node gate: keep `MK_LOCAL_NODE=1` set while dogfooding.
- **Want mk anywhere?** See [Installation: mk Anywhere](#installation-mk-anywhere-self-install) below.

### Web Terminal Demo (browser)

- Quickstart: see docs/devex/web-terminal-quickstart.md
- Run servers:
  - `npm run build`
  - `npm run dev:web-terminal` (WS: 3001, HTML: 9090)
  - Open http://localhost:9090
  - Remote? Use `ssh -L 9090:localhost:9090 host` from your laptop.

## Primary Architect

- **Architect Name** - VEGA
- **Architect Model** - GPT-5 Thinking HIGH
- **AI AGENT SELF files** - In this repo in the subdirectory VEGA
- **AI AGENT reads self files on startup** - YES
- **Relation to human user** - Vega is the technical brains, helping to keep the human on track with what he or she is needing built.

## New to mkolbol?

**⏱️ First 5 minutes:** **[First Five Minutes](docs/devex/first-five-minutes.md)** - Pick your path (mkctl run, StdIO, or Interactive)

**Learn the concepts:** **[Early Adopter Guide](docs/devex/early-adopter-guide.md)** - Understand mkolbol's architecture and mental model

## Quickstart — Demos & Testing

**Try the Live Demos:**

- [PTY to XtermTTYRenderer Demo](docs/devex/quickstart.md) - See PTY and terminal rendering in action in under 2 minutes
- [StdIO Echo Demo](docs/devex/stdio-path.md) - Learn the lightweight StdIO path without PTY overhead
- [Interactive Topology: Keyboard → PTY → TTY](docs/devex/interactive-topology.md) - Build interactive terminal applications with bidirectional I/O

Get started with Laminar testing in 5 minutes:

```bash
# Install mkolbol in your project (tarball or git tag)
# See docs/devex/distribution.md for instructions

# Initialize Laminar config
npx lam init

# Run tests
npx lam run --lane auto

# Run specific tests by pattern
npx lam run --lane ci --filter kernel
npx lam run --lane ci --filter "connect.*data"

# View results
npx lam summary

# Analyze failures
npx lam digest

# Show specific test details
npx lam show --case kernel.spec/connect_moves_data_1_1 --around assert.fail --window 10

# Get repro commands
npx lam repro
```

**Laminar Basic Commands:**

- `npx lam init` — Create laminar.config.json with defaults
- `npx lam run [--lane ci|pty|auto] [--filter <pattern>]` — Execute tests with structured logging
- `npx lam summary` — List all test results
- `npx lam digest` — Generate failure analysis digests
- `npx lam show` — Inspect test artifacts and events

📖 **Documentation:**

- **[Laminar Workflow Guide](docs/devex/laminar-workflow.md)** - Install from GitHub, run tests, analyze failures, CI integration
- **[Full Laminar Reference](docs/testing/laminar.md)** - Complete API and advanced features

## CI & Testing

- Threads lane: `npm run test:ci`
- Forks lane (process-mode **required**): `npm run test:pty`
- Dogfooding with Laminar (produces summaries/trends under `reports/`):
  - Threads + summaries: `npm run test:ci:lam`
  - Forks + summaries: `npm run test:pty:lam`
- See `docs/testing/ci.md` for enforcement policy and CI artifacts.

## Config Loader

Define stream topologies in YAML and run them with the config loader:

```yaml
nodes:
  - { id: timer1, module: TimerSource, params: { periodMs: 1000 } }
  - { id: upper1, module: UppercaseTransform }
  - { id: console1, module: ConsoleSink, params: { prefix: '[basic]' } }
connections:
  - { from: timer1.output, to: upper1.input }
  - { from: upper1.output, to: console1.input }
```

```bash
# Using mkctl run (recommended)
node dist/scripts/mkctl.js run --file examples/configs/basic.yml

# Or via legacy config-runner
node dist/examples/config-runner.js --file examples/configs/basic.yml
```

**Using mkctl run:**

- `mkctl run --file <path>` - Load and execute a topology (runs for 5 seconds by default)
- `mkctl run --file <path> --duration 10` - Customize duration in seconds
- Automatically registers modules with Hostess and tracks endpoints

**Learn more about configuration:**

- **[Quickstart with mkctl](docs/devex/quickstart.md#quick-start-with-mkctl-recommended)** - Get running in 2 minutes
- **[Wiring and Testing Guide](docs/devex/wiring-and-tests.md)** - Complete config schema, external processes (stdio/pty modes), and test lanes
- **[Config Examples](examples/configs/)** - Real working topologies with stdio and pty modes
  - `examples/configs/basic.yml` - Basic timer + transform + console
  - `examples/configs/external-stdio.yaml` - External process with stdio mode
  - `examples/configs/external-pty.yaml` - External process with PTY mode

### mkctl Troubleshooting

| Exit Code | Meaning                                   | Friendly Hint                                                                                        |
| --------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `64`      | Usage error (missing flags, bad duration) | Run `mkctl run --file <path> [--duration <seconds>]` and double-check your arguments.                |
| `65`      | Config parse/validation failure           | Ensure the file is valid YAML/JSON and that `nodes[]` / `connections[]` are present with unique IDs. |
| `66`      | Config file not found                     | Verify the path or reuse one of the samples in `examples/configs/`.                                  |
| `70`      | Topology runtime error                    | Confirm module names exist (or external commands can spawn) before launching the topology.           |
| `130`     | Interrupted via Ctrl+C                    | mkctl caught the signal and shut the topology down cleanly.                                          |

mkctl error messages now include matching hints; the CLI prefixes every message with `[mkctl]` so they’re easy to spot in logs.

### Routing & Discovery

- `mkctl endpoints` prints the currently announced endpoints by reading the RoutingServer snapshot (`reports/router-endpoints.json`).
- Every `mkctl run` invocation now writes that snapshot automatically; rerun `mkctl endpoints` to confirm what’s live.
- Need a longer reference? See the **[mkctl Cookbook](docs/devex/mkctl-cookbook.md)** for end-to-end command examples.
- Architectural details live in **[RoutingServer RFC](docs/rfcs/stream-kernel/05-router.md)**, which tracks the in-process announcement API and future multi-node work.

## ANSI Parser

Parse ANSI escape sequences from terminal output into structured events:

```typescript
import { Kernel } from 'mkolbol';
import { AnsiParserModule } from 'mkolbol/modules/ansi-parser-module';

const kernel = new Kernel();
const parser = new AnsiParserModule(kernel);

// Connect to parser output
kernel.connect(parser.outputPipe, yourSink);

// Send ANSI text
parser.inputPipe.write('\x1b[1;32mGreen Bold\x1b[0m\n');
```

Run the example:

```bash
npx tsx examples/ansi-parser-simple.ts
npx tsx examples/ansi-parser-p3.ts   # Demonstrates truecolor, resize, DEC modes
```

## Overview

mkolbol is a minimal (~100 line) stream-based microkernel designed for building flexible, distributed AI agent systems. The kernel provides protocol-agnostic "physical layer" plumbing while all semantics live in composable modules.

**Current Status:** 🧪 **Early Implementation + RFCs**  
A minimal stream kernel with examples and tests is present. APIs are still evolving; RFCs document the intended shape.

## Vision

Build the most flexible terminal I/O and AI agent system ever created:

- **PTY hijacking** - Intercept and transform any terminal application's I/O
- **Multi-modal rendering** - Display terminal output as xterm.js, Canvas, Video, TTS, AI-formatted text
- **Multi-source input** - Accept input from keyboard, voice (STT), AI agents, network
- **Protocol agnostic** - Pipes carry anything (bytes, JSON-RPC, MCP, custom protocols)
- **Distributed deployment** - Same code runs single-process, multi-process, or across machines
- **Browser-ready** - Works in Node.js and browsers (TypeScript)

Product focus (P0)

- See docs/product/pty-metasurface.md for the PTY metasurface product spec clarifying P0 scope and demos.

## Core Principles

- **~100 line kernel** - Provides only: `createPipe()`, `connect()`, `split()`, `merge()`, service registry
- **Pure plumbing** - Kernel is the "physical layer", doesn't understand protocols or data formats
- **Everything is a module** - MCP, JSON-RPC, routing, supervision all live in modules
- **Location transparency** - Modules don't know if peers are local or remote
- **Infinite extensibility** - New features never require kernel changes

## Architecture Documentation

### 📖 Stream Kernel RFC (Recommended)

**Modular Version:** [docs/rfcs/stream-kernel/00-index.md](docs/rfcs/stream-kernel/00-index.md)

The RFC is organized into focused documents:

- **[Philosophy & Design Principles](docs/rfcs/stream-kernel/01-philosophy.md)** - Microkernel vision, mechanism vs policy
- **[Core Architecture](docs/rfcs/stream-kernel/02-core-architecture.md)** - The ~100 line kernel API
- **[Module Types](docs/rfcs/stream-kernel/03-module-types.md)** - Input, Source, Transform, Output, Routing modules
- **[PTY Use Cases](docs/rfcs/stream-kernel/04-pty-use-cases.md)** - Real-world terminal hijacking examples
- **[Deployment Flexibility](docs/rfcs/stream-kernel/05-deployment-flexibility.md)** - Single process → distributed
- **[Distributed Service Mesh](docs/rfcs/stream-kernel/06-distributed-service-mesh.md)** - Routing servers, multi-hop communication
- **[Implementation Roadmap](docs/rfcs/stream-kernel/09-roadmap.md)** - Phase-by-phase development plan

**Single-File Version:** [STREAM_KERNEL_RFC.md](STREAM_KERNEL_RFC.md) (for offline reading)

## Installation: mk Anywhere (Self-Install)

To use `mk` and `mkctl` from any directory without `npm run` or `node dist/scripts/...`, add them to your PATH:

### POSIX (Linux/macOS)

**Option 1: PATH export (recommended)**

```bash
# Add to ~/.bashrc or ~/.zshrc or ~/.profile
export PATH="/absolute/path/to/mkolbol/dist/scripts:$PATH"

# Reload shell config
source ~/.bashrc  # or source ~/.zshrc
```

**Option 2: Symlink to /usr/local/bin**

```bash
# Create symlinks (requires sudo)
sudo ln -s /absolute/path/to/mkolbol/dist/scripts/mk.js /usr/local/bin/mk
sudo ln -s /absolute/path/to/mkolbol/dist/scripts/mkctl.js /usr/local/bin/mkctl

# Make executable
sudo chmod +x /usr/local/bin/mk /usr/local/bin/mkctl
```

**Verify:**

```bash
which mk        # Should show /usr/local/bin/mk or your PATH location
mk --help       # Should display mk help
mkctl --help    # Should display mkctl help
```

### Windows

**Option 1: Add to PATH via System Properties**

```powershell
# 1. Copy the full path to mkolbol\dist\scripts
# 2. Open: System Properties → Environment Variables
# 3. Edit "Path" under "User variables" or "System variables"
# 4. Click "New" and paste: C:\path\to\mkolbol\dist\scripts
# 5. Click OK to save
# 6. Restart terminal/PowerShell
```

**Option 2: Create .cmd shims in a PATH directory**

```powershell
# Create mk.cmd in C:\Windows\System32 or another PATH directory
@echo off
node "C:\path\to\mkolbol\dist\scripts\mk.js" %*

# Create mkctl.cmd
@echo off
node "C:\path\to\mkolbol\dist\scripts\mkctl.js" %*
```

**Verify:**

```powershell
where.exe mk    # Should show C:\Windows\System32\mk.cmd or PATH location
mk --help       # Should display mk help
mkctl --help    # Should display mkctl help
```

### Troubleshooting Self-Install

| Issue                       | Cause                                  | Fix                                                                        |
| --------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| **mk: command not found**   | PATH not updated or shell not reloaded | Run `source ~/.bashrc` (Linux/macOS) or restart terminal (Windows)         |
| **Permission denied**       | Script not executable                  | Run `chmod +x /path/to/mkolbol/dist/scripts/*.js` (Linux/macOS)            |
| **Wrong version executing** | Multiple mk installations in PATH      | Run `which mk` (Linux/macOS) or `where.exe mk` (Windows) to find conflicts |
| **Node.js not found**       | Node not installed or not in PATH      | Install Node 20+ and add to PATH                                           |

---

## Installation: Distribution Paths

📋 **[Distribution Matrix](docs/devex/distribution.md)** — Choose the right installation path for your use case (Tarball, Git Tag, or Vendor). Note: mkolbol is not published to npm.

### Local Installation (Recommended)

```bash
# Install in your project (tarball method recommended)
npm install ./mkolbol-0.2.0.tgz

# Use with npx (no global install needed)
npx lam init
npx lam run --lane auto
npx lam digest
```

### Global/npx

> Not applicable: mkolbol is not published to npm. Use local tarball, Git tag, or vendor path instead.

### Troubleshooting

**Command not found: lam**

- Local install: Use `npx lam` instead of `lam`
- Global install: Ensure npm global bin is in PATH: `npm config get prefix`

**npx hangs or prompts for confirmation**

- Add `-y` flag to auto-confirm: `npx -y mkolbol lam init`

**Wrong version executing**

- Clear npx cache: `npx clear-npx-cache`
- Force specific version: `npx mkolbol@0.2.0 lam init`

**Requirements:**

- Node 20+ (tested on 20.x and 24.x)
- macOS or Linux (Windows support coming soon)

**Note:** Experimental preview. The Stream Kernel is implemented minimally in this repo with runnable demos; APIs may change.

## Example (Future API)

```typescript
import { Kernel } from 'mkolbol';

// Create kernel
const kernel = new Kernel();

// Create modules
const keyboard = new KeyboardInput(kernel);
const pty = new PTY(kernel);
const parser = new ANSIParser(kernel);
const screen = new ScreenRenderer(kernel);
const ai = new AIFormatter(kernel);

// Wire up the flow
kernel.connect(keyboard.output, pty.input); // Keyboard → PTY
kernel.connect(pty.output, parser.input); // PTY → Parser
kernel.split(parser.output, [
  // Parser → Multiple outputs
  screen.input, //   → Screen
  ai.input, //   → AI formatter
]);

// Start the system
keyboard.start();
pty.start();
```

## Endpoints

Endpoints represent the execution environment and control coordinates for modules in the microkernel. Each endpoint has a **type** indicating how the module runs and **coordinates** specifying how to reach or identify it.

### Endpoint Types

The system supports four endpoint types:

- **inproc** - In-process modules running directly in the main process
  - Coordinates: `node:<node-id>`
  - Use case: Lightweight transforms, minimal overhead, no isolation needed

- **worker** - Worker thread modules with isolated execution
  - Coordinates: `node:<node-id>`
  - Use case: CPU-intensive work, memory isolation, parallel processing

- **external** - External processes spawned via stdio
  - Coordinates: `<command> <args>`
  - Use case: Language-agnostic integration, any executable, isolated environment

- **pty** - PTY-based processes with terminal emulation
  - Coordinates: `pid:<process-id>`
  - Use case: Interactive shells, terminal applications, PTY hijacking

### Discovery

Endpoints are registered automatically with Hostess when modules are instantiated. Use `mkctl endpoints` to discover all registered endpoints in the system. See the [mkctl CLI documentation](#mkctl---microkernel-control-cli) for usage details.

## Use Cases

The Stream Kernel enables:

1. **AI-Enhanced Terminals** - Multi-modal I/O with AI observation and control
2. **Terminal Recording** - Capture sessions as video, text, or AI training data
3. **Remote Processing** - Send terminal data to remote GPU, return to local display
4. **Browser Extensions** - Terminal rendering in Chrome DevTools, Canvas
5. **Accessibility** - TTS output, voice input, alternative input devices
6. **Collaborative Terminals** - Multiple users, AI assistants, shared sessions

See [PTY Use Cases RFC](docs/rfcs/stream-kernel/04-pty-use-cases.md) for detailed examples.

## Archived: MCP-Based Implementation

The repository previously contained an MCP (Model Context Protocol) based microkernel implementation. This has been **archived** to `archived/mcp-kernel/` to prevent confusion with the new Stream Kernel architecture.

**Why archived?** The Stream Kernel design provides:

- More minimal kernel (~100 lines vs ~200 lines)
- Protocol agnostic (not tied to JSON-RPC/MCP)
- Greater deployment flexibility
- Better separation of mechanism and policy

**Can I still use it?** The archived code is preserved for reference but not maintained. See [archived/mcp-kernel/README.md](archived/mcp-kernel/README.md) for details.

**Migration path:** MCP support will be built as a **module** on top of the Stream Kernel, providing the same capabilities with greater flexibility.

## Testing

[![Laminar Tests](https://github.com/anteew/mkolbol/actions/workflows/laminar.yml/badge.svg)](https://github.com/anteew/mkolbol/actions/workflows/laminar.yml)

```bash
npm test
# or
npm run test:watch
# For CI environments (Node 20/24)
npm run test:ci
```

**CI Note:** The `test:ci` script uses `--pool=threads` to avoid tinypool concurrency issues on Node 20 and 24. Process-mode is **required** for PTY and Unix adapter tests in the forks lane.

**CI Artifacts:** Laminar reports (`summary.jsonl`, case logs) and raw test logs (`threads_raw.log`, `forks_raw.log`) are uploaded to GitHub Actions as artifacts (`laminar-reports-node-20`, `laminar-reports-node-24`). Download from the [Actions tab](https://github.com/anteew/mkolbol/actions).

**Auto-Debug Rerun:** For CI pipelines with fast triage, use:

```bash
npm run laminar:run || true
```

This runs tests normally first, then automatically reruns failures with `LAMINAR_DEBUG=1` to capture debug output. Failed test logs are written to `reports/<suite>/<case>.jsonl` for analysis.

### Test Event Logging

The project includes structured test event logging in JSONL format:

- **Schema:** [src/logging/TestEvent.ts](src/logging/TestEvent.ts) defines envelope with ts, lvl, case, phase, evt, id, corr, path, payload
- **Logger:** [src/logging/logger.ts](src/logging/logger.ts) provides `beginCase()`, `endCase()`, `emit()` helpers
- **Output:** Events written to `reports/<suite>/<case>.jsonl` for test analysis and reporting

**Artifact Structure:**

```
reports/
├── index.json                    # Manifest of all test artifacts
├── summary.jsonl                 # One-line summaries
└── <suite>/<case>.jsonl         # Per-case event streams
```

See [docs/testing/laminar.md](docs/testing/laminar.md) for complete artifact structure, guarantees, and index.json specification.

**Agent Integration**: When working with agents via ampcode.log, include pointers to `reports/summary.jsonl` and case files in task reports. If digests were created or updated, also include pointers to relevant digest files in `docs/digests/`. Keep console output compact; rely on report files and digests for detailed metrics, traces, and learnings.

### Debug Instrumentation

Runtime-configurable debug output with near-zero overhead when disabled:

```bash
# Enable all debug output
DEBUG=1 npm run dev

# Enable specific modules
MK_DEBUG_MODULES=kernel,pipes npm run dev

# Set debug level (error, warn, info, debug, trace)
MK_DEBUG_LEVEL=trace npm run dev

# Combine options
DEBUG=1 MK_DEBUG_MODULES=executor MK_DEBUG_LEVEL=debug npm run dev
```

**Implementation:**

- [src/debug/config.ts](src/debug/config.ts) - Parse environment variables at startup
- [src/debug/api.ts](src/debug/api.ts) - `debug.on(module)` and `debug.emit(module, event, payload, level)` API
- **Laminar Integration:** When `LAMINAR_DEBUG=1` is set, debug events emit as `TestEventEnvelope` for structured logging

### MCP Server for Laminar

The project includes an MCP (Model Context Protocol) server for exposing Laminar test logs and digests to AI agents and tools.

**Location:** [src/mcp/laminar/server.ts](src/mcp/laminar/server.ts)

**Features:**

- **Resources:** Exposes `summary.jsonl` and digest files as MCP resources
- **12 MCP Tools:** Complete test execution, querying, and digest management
- **Focus Overlay:** Ephemeral digest rule overlay for temporary filtering
- **Protocol:** Standard MCP protocol for AI agent integration
- **JSON Contracts:** Fully type-safe input/output schemas with validation
- **Error Model:** Structured errors with codes, messages, and context
- **Idempotence:** All operations are safe to retry

#### Quick Start

```typescript
import { createLaminarServer } from './src/mcp/laminar/server.js';

const server = await createLaminarServer({
  reportsDir: 'reports',
  summaryFile: 'reports/summary.jsonl',
  configFile: 'laminar.config.json',
});

// List available resources
const resources = server.listResources();

// Read a resource
const summary = await server.readResource('laminar://summary');

// Call a tool
const failures = await server.callTool('list_failures', {});
```

#### Resources

- `laminar://summary` - Test summary JSONL file (all test results)
- `laminar://digest/{caseName}` - Digest JSON for specific failed test case

#### MCP Tools (14)

**Test Execution:**

- `run` - Execute tests with options for suite, case, and flake detection
  - Input: `{ suite?: string, case?: string, flakeDetect?: boolean, flakeRuns?: number }`
  - Output: `{ exitCode: number, message: string }`

**Digest Rule Management:**

- `rules.get` - Get current digest rules from laminar.config.json
  - Input: `{}` (no parameters)
  - Output: `{ config: DigestConfig }`
- `rules.set` - Update digest rules in laminar.config.json (persistent)
  - Input: `{ config: DigestConfig }` (required)
  - Output: `{ success: boolean, message: string }`

**Digest Generation:**

- `digest.generate` - Generate digests for specific cases or all failing cases
  - Input: `{ cases?: string[] }` (optional, all failures if omitted)
  - Output: `{ count: number, message: string }`

**Log Access:**

- `logs.case.get` - Retrieve per-case JSONL logs
  - Input: `{ caseName: string }` (required)
  - Output: `{ logs: string }` (raw JSONL content)
- `query` / `query_logs` - Query test event logs with filters (aliases)
  - Input: `{ caseName?: string, level?: string, event?: string, limit?: number }`
  - Output: `{ events: DigestEvent[], totalCount: number }`
  - Default limit: 100, max: 1000

**Failure Analysis:**

- `repro` - Get reproduction commands for failures
  - Input: `{ caseName?: string }` (optional, all failures if omitted)
  - Output: `{ commands: ReproCommand[] }` (vitest + logq commands)
- `get_digest` - Get digest for a specific failed test case
  - Input: `{ caseName: string }` (required)
  - Output: `{ digest: DigestOutput | null }`
- `list_failures` - List all failed test cases from summary
  - Input: `{}` (no parameters)
  - Output: `{ failures: SummaryEntry[] }`

**Repro Bundles & Diffs:**

- `repro.bundle` - Generate repro bundle with logs and digests
  - Input: `{ caseName?: string, format?: 'json' | 'markdown' }` (optional, all failures if omitted)
  - Output: `{ count: number, message: string, bundles: Array<{ caseName, jsonPath, mdPath }> }`
  - Use case: Package failure for reproduction and triage
- `diff.get` - Compare two digest files and return differences
  - Input: `{ digest1Path: string, digest2Path: string, outputFormat?: 'json' | 'markdown' }` (required)
  - Output: `{ diff: DigestDiff, formatted?: string }`
  - Use case: Track regressions, verify fixes, analyze failure evolution

**Focus Overlay (Ephemeral Rules):**

- `focus.overlay.set` - Set ephemeral focus overlay rules (non-persistent)
  - Input: `{ rules: DigestRule[] }` (required)
  - Output: `{ success: boolean, message: string }`
  - Use case: Temporary filtering without modifying config file
- `focus.overlay.clear` - Clear all ephemeral focus overlay rules
  - Input: `{}` (no parameters)
  - Output: `{ success: boolean, message: string }`
- `focus.overlay.get` - Get current ephemeral focus overlay rules
  - Input: `{}` (no parameters)
  - Output: `{ rules: DigestRule[] }`

#### Error Handling

All operations use structured error codes:

- `INVALID_INPUT` - Invalid input parameters (with validation details)
- `RESOURCE_NOT_FOUND` - Resource URI not found
- `TOOL_NOT_FOUND` - Tool name not recognized
- `IO_ERROR` - File system operation failed
- `PARSE_ERROR` - JSON parsing failed
- `INTERNAL_ERROR` - Unexpected internal error

Error format:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "caseName is required and must be a string",
    "details": { "received": null }
  }
}
```

#### Common Workflows

**Workflow 1: Run tests and analyze failures**

```typescript
// 1. Run tests
await server.callTool('run', { suite: 'my-suite' });

// 2. List failures
const failures = await server.callTool('list_failures', {});

// 3. Get digest for specific failure
const digest = await server.callTool('get_digest', {
  caseName: 'my-suite/failing-test',
});

// 4. Get repro commands
const repro = await server.callTool('repro', {
  caseName: 'my-suite/failing-test',
});
```

**Workflow 2: Focus overlay for temporary filtering**

```typescript
// 1. Set temporary overlay rules to focus on errors only
await server.callTool('focus.overlay.set', {
  rules: [
    { match: { lvl: 'error' }, actions: [{ type: 'include' }] },
    { match: { evt: 'assert.fail' }, actions: [{ type: 'slice', window: 5 }] },
  ],
});

// 2. Generate digests with overlay rules
await server.callTool('digest.generate', {});

// 3. Clear overlay when done
await server.callTool('focus.overlay.clear', {});
```

**Workflow 3: Query and filter logs**

```typescript
// 1. Query all error events for a test
const errors = await server.callTool('query', {
  caseName: 'topology.spec/rewire',
  level: 'error',
  limit: 50,
});

// 2. Query specific event types
const assertions = await server.callTool('query', {
  caseName: 'topology.spec/rewire',
  event: 'assert.fail',
});
```

**Workflow 4: Flake detection**

```typescript
// Run tests with flake detection (5 runs)
const result = await server.callTool('run', {
  flakeDetect: true,
  flakeRuns: 5,
});

// Check stability report
// (saved to reports/stability-report.json)
```

See [docs/testing/laminar.md](docs/testing/laminar.md#mcp-server-integration) for complete MCP integration examples and tool schemas.

### Cross-Language Test Ingest

Laminar can import test results from external languages and frameworks:

#### Pytest (Python)

```bash
# Install pytest-json-report plugin
pip install pytest-json-report

# Generate and ingest pytest JSON report
pytest --json-report --json-report-file=report.json
lam ingest --pytest --from-file report.json

# One-liner (pipe mode)
lam ingest --pytest --cmd "pytest --json-report --json-report-file=/dev/stdout"

# Direct script
tsx scripts/ingest-pytest.ts --from-file pytest-report.json
```

**Features:**

- Preserves test phases (setup/call/teardown) with individual durations
- Captures stdout/stderr output from tests
- Extracts error messages, stack traces, and crash details
- Maps pytest markers and keywords to Laminar metadata
- Supports all pytest outcomes (passed/failed/error/skipped/xfailed/xpassed)

**Event Mapping:**

- `nodeid` → `case.begin` (with line numbers and keywords)
- `setup/call/teardown.outcome` → phase-specific events
- `crash` + `traceback` → `test.error` with formatted stack traces
- Total duration calculated from all phases (seconds → milliseconds)

#### JUnit XML (Java, Jest, pytest, and more)

```bash
# Maven (Java)
mvn test  # Auto-generates in target/surefire-reports/
lam ingest --junit target/surefire-reports/TEST-*.xml

# Gradle (Java)
./gradlew test
lam ingest --junit build/test-results/test/TEST-*.xml

# Jest (JavaScript/TypeScript)
npm install -D jest-junit
jest --reporters=jest-junit
lam ingest --junit junit.xml

# pytest (Python - alternative to JSON)
pytest --junit-xml=junit-report.xml
lam ingest --junit junit-report.xml

# Direct script
tsx scripts/ingest-junit.ts junit-report.xml

# From stdin
cat test-output.xml | tsx scripts/ingest-junit.ts -
```

**Features:**

- Universal format supported by Maven, Gradle, Jest, pytest, NUnit, xUnit, RSpec
- Parses `<failure>`, `<error>`, and `<skipped>` elements
- Extracts stack traces and error messages from XML content
- Handles nested test suites automatically
- Converts time attributes from seconds to milliseconds

**Event Mapping:**

- `<testcase>` → `case.begin` + `test.run` + `case.end`
- `<failure>` → `test.error` (assertion failures)
- `<error>` → `test.error` (exceptions)
- `<skipped>` → `test.skip` (skipped tests)
- `classname` → `location` field
- `suite/testname` → unique case identifier

#### Go Test JSON

```bash
# From file
lam ingest --go --from-file go-test-output.json

# From command
lam ingest --go --cmd "go test -json ./..."
```

**Complete Integration:**

Ingested tests integrate seamlessly with all Laminar features:

- Query with `logq` for precise event filtering
- Generate digests with `lam digest` for failure analysis
- Inspect details with `lam show --case <name>`
- Track trends with `lam trends`
- Create repro bundles with `lam repro --bundle`

See [docs/testing/laminar.md](docs/testing/laminar.md#cross-language-test-ingestion) for:

- Complete event lifecycle examples
- CI/CD integration patterns (GitHub Actions, GitLab CI)
- Multi-environment testing workflows
- Historical trend tracking
- Troubleshooting guides

### CLI Tools

#### mkctl - Microkernel Control CLI

```bash
# List all registered endpoints
node dist/scripts/mkctl.js endpoints

# Connect to remote TCP/WebSocket pipes
node dist/scripts/mkctl.js connect --url tcp://localhost:30010
node dist/scripts/mkctl.js connect --url ws://localhost:30012/pipe

# Get JSON output for tooling
node dist/scripts/mkctl.js connect --url tcp://localhost:30010 --json

# Record and replay sessions (NEW in P21)
node dist/scripts/mkctl.js connect --url tcp://localhost:30010 --record session.mkframes
node dist/scripts/mkctl.js connect --replay session.mkframes

# Show help
node dist/scripts/mkctl.js
```

The `mkctl` tool provides control and introspection for the microkernel:

- **`endpoints`** - Lists all endpoints registered with Hostess, showing their type (e.g., "pty", "executor"), coordinates (e.g., "localhost:3000"), and optional metadata including `ioMode`
- **`connect`** - Connects to remote TCP or WebSocket pipes and displays output in real-time (human-readable or JSON format)

**Understanding ioMode:**

- **stdio** - Standard input/output (lightweight, non-interactive)
- **pty** - Pseudo-terminal (interactive, ANSI escape sequences supported)

**Example output:**

```
Registered Endpoints:

ID:          localhost:mcp-server:0xFFFF:test:no:none:abc123
Type:        external
Coordinates: node server.js
IO Mode:     stdio
Metadata:    {"cwd":"/srv/mcp","ioMode":"stdio"}

ID:          localhost:bash-multi:0xFFFF:test:no:none:def456
Type:        pty
Coordinates: pid:1234567
IO Mode:     pty
Metadata:    {"cols":80,"rows":24,"terminalType":"xterm-256color","ioMode":"pty"}
```

**See Also:**

- **[mkctl Cookbook](docs/devex/mkctl-cookbook.md)** - Quick reference for common commands and patterns
- **[Wiring and Testing Guide](docs/devex/wiring-and-tests.md#external-process-configuration)** - Complete explanation of stdio vs pty modes
- **[StdIO Path Guide](docs/devex/stdio-path.md)** - Deep dive on stdio mode for data pipelines

#### logq - Query JSONL test logs

```bash
# Filter by case name
npm run logq -- case=demo.case reports/demo/demo.case.jsonl

# Filter by event type with regex
npm run logq -- evt=/case.*/ reports/demo/demo.case.jsonl

# Show context around a correlation ID
npm run logq -- --around corr=abc123 --window 3 reports/demo/demo.case.jsonl

# Output raw JSONL
npm run logq -- --raw evt=case.begin reports/demo/demo.case.jsonl

# Show help
npm run logq -- --help
```

#### repro - Find and reproduce test failures

```bash
# Analyze failures from last test run
npm run repro

# Example output provides vitest commands to rerun failing tests
# and logq commands to inspect their JSONL logs
```

#### lam - Comprehensive test management CLI

```bash
# Run tests
lam run --lane auto
lam run --lane ci --filter kernel
lam run --lane pty --filter "wrapper.*"

# Generate failure digests
lam digest
lam digest --cases kernel.spec/connect_moves_data_1_1

# Generate repro bundles
lam repro --bundle
lam repro --bundle --case kernel.spec/connect_moves_data_1_1

# Compare digest files
lam diff reports/case1.digest.json reports/case2.digest.json
lam diff reports/case1.digest.json reports/case2.digest.json --output diff.md --format markdown

# Digest rules management
lam rules get
lam rules set --inline '{"budget":{"kb":2}}'

# Failure trends
lam trends --top 10 --since 2025-10-01

# Show test details
lam show --case kernel.spec/connect_moves_data_1_1 --around assert.fail --window 50

# See all commands
lam --help
```

See [docs/testing/laminar.md](docs/testing/laminar.md) for complete documentation on repro bundles and digest diffs.

### Sprint 1 Quickstart (Local, In-Process)

```bash
pnpm i
pnpm run build
pnpm run dev          # runs examples/basic-topology
# more demos
pnpm run dev:split
pnpm run dev:merge
```

The Stream Kernel is designed to be testable in isolation:

- Test kernel with no modules (just pipe connections)
- Test modules with mock kernel
- Property-based testing of pipe operations
- Golden transcript tests for complex flows

## Documentation

### Archived: MCP Kernel

See [archived/mcp-kernel/KERNEL_RFC.md](archived/mcp-kernel/KERNEL_RFC.md) for detailed documentation of the prior MCP-based kernel.

### Proposed Architecture (Stream Kernel)

A new stream-based microkernel architecture has been proposed with comprehensive documentation:

**📖 [Stream Kernel RFC - Modular Version](docs/rfcs/stream-kernel/00-index.md)**

The Stream Kernel RFC documents a ~100 line protocol-agnostic kernel design with:

- Pure stream plumbing philosophy
- Multi-modal terminal I/O capabilities
- Deployment flexibility (single process → distributed)
- Distributed service mesh architecture with routing servers
- Complete separation of concerns for easier maintenance

Key documents:

- [Philosophy & Design Principles](docs/rfcs/stream-kernel/01-philosophy.md)
- [Core Architecture (~100 lines)](docs/rfcs/stream-kernel/02-core-architecture.md)
- [PTY Use Cases](docs/rfcs/stream-kernel/04-pty-use-cases.md)
- [Deployment Flexibility](docs/rfcs/stream-kernel/05-deployment-flexibility.md)
- [Distributed Service Mesh](docs/rfcs/stream-kernel/06-distributed-service-mesh.md)
- [Implementation Roadmap](docs/rfcs/stream-kernel/09-roadmap.md)

> **Note:** There is also a [single-file version](STREAM_KERNEL_RFC.md) of the Stream Kernel RFC, but the modular version is recommended for easier navigation and maintenance.

## Troubleshooting

Running into issues? Check the comprehensive **[Troubleshooting Guide](docs/devex/troubleshooting.md)** for:

- Installation errors (build tools, native dependencies)
- Running topologies (mkctl run, config paths, YAML errors)
- PTY & terminal issues (permissions, TTY corruption)
- Node version mismatches
- External process configuration problems
- Testing failures and timeouts
- Performance & resource issues

For quick command fixes, see the [Installation Troubleshooting](#troubleshooting) section above.

## Publishing

### GitHub Actions Secrets

The following secrets must be configured in the repository settings for automated releases:

- **NPM_TOKEN** - NPM automation token with publish permissions
  - Create at https://www.npmjs.com/settings/[username]/tokens
  - Select "Automation" token type
  - Required permissions: Read and write

### Release Process

1. Update version in package.json
2. Commit changes
3. Create and push a tag: `git tag v1.0.0 && git push origin v1.0.0`
4. GitHub Actions will automatically:
   - Build and test the package
   - Verify package contents
   - Publish to NPM with provenance
   - Create a GitHub release with notes

## License

MIT - See [LICENSE](./LICENSE)

## Agent Briefing and Pre-Commit Guardrails

- Each sprint file (`ampcode.json` / `devex.json`) includes `instructions.briefing` — a short, high-signal note for agents.
- Pre-commit checks:
  - ESLint fix dry-run on staged JS/TS files (fail-fast). Override once: `SKIP_ESLINT_DRYRUN=1`.
  - Briefing token budget check (warn/fail thresholds; adjustable via `BRIEFING_WARN_TOKENS` / `BRIEFING_FAIL_TOKENS`).
  - Prettier auto-format for staged files.
- See `agent_template/examples/precommit-eslint-dryrun.md` for hook details.
