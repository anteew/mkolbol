# Early Adopter Guide

Welcome to mkolbol! This guide will get you up to speed in 5 minutes.

## Quick Start: Choose Your Path

**New to mkolbol?** Pick one of these entry points based on what you want to do:

### 🚀 **I want to see it in action** (5 min)
Run a live topology demo without writing code:
- **[Quickstart: mkctl run](./quickstart.md#quick-start-with-mkctl-recommended)** - Execute pre-built topologies from YAML
- After it runs, inspect the RoutingServer snapshot with `mkctl endpoints`
- **[Interactive Topology](./interactive-topology.md)** - Keyboard → PTY → Terminal demo
- **[StdIO Path](./stdio-path.md)** - Non-interactive data pipeline (no terminal overhead)

### 🔨 **I want to build my first module** (20-30 min)
Create and wire a custom server:
- **[First Server Tutorial](./first-server-tutorial.md)** - Code your first Transform or External process
- **[Wiring and Testing Guide](./wiring-and-tests.md)** - Configure topologies and test them
- **[Acceptance Tests](./tests/devex/README.md)** - Validate your module works

### 🚢 **I want to deploy and observe** (15-20 min)
Prepare modules for production:
- **[Laminar Dev Workflow](./laminar-workflow.md)** - Test observability and debugging
- **[Packaging Guide](./packaging.md)** - Bundle your modules into single executables
- **[mkctl Cookbook](./mkctl-cookbook.md)** - Daily cheatsheet for `mkctl run` / `mkctl endpoints`
- **[Contributing](../../../CONTRIBUTING-DEVEX.md)** - Share feedback and get help

---

## What is mkolbol?

mkolbol is a stream-based microkernel for building flexible AI agent systems and terminal I/O applications. Think of it as "plumbing for data" - a tiny (~100 line) kernel that provides pipes and connections, while all the interesting functionality lives in composable modules. You can run modules in-process for speed, in separate threads for isolation, or as external processes for maximum flexibility.

## Core Mental Model

mkolbol follows a simple three-layer architecture:

```
┌─────────────────────────────────────────────────────────┐
│                        MODULES                          │
│  (Input, Source, Transform, Output, Routing)            │
│                                                          │
│  KeyboardInput → PTY → AnsiParser → ScreenRenderer      │
│                                   ↘ CanvasRenderer       │
│                                   ↘ AIFormatter          │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │  uses
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    KERNEL (~100 lines)                  │
│                                                          │
│  • createPipe()  - Create data channels                 │
│  • connect()     - Wire pipes together (1→1)            │
│  • split()       - Fan-out (1→many)                     │
│  • merge()       - Fan-in (many→1)                      │
│  • register()    - Service discovery                    │
│  • lookup()      - Find services by capabilities        │
│                                                          │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │  built on
                        ▼
┌─────────────────────────────────────────────────────────┐
│              NODE.JS STREAMS (Physical Layer)           │
│   Duplex streams with automatic backpressure            │
└─────────────────────────────────────────────────────────┘
```

**Key Insight**: The kernel is pure plumbing. It doesn't know about JSON, MCP, terminal protocols, or any data formats. It just moves data through pipes. All semantics live in modules.

### Minimal Example

```typescript
import { Kernel } from 'mkolbol';

// 1. Create kernel
const kernel = new Kernel();

// 2. Create modules (they create their own pipes via kernel)
const timer = new TimerSource(kernel);    // Emits data periodically
const upper = new UppercaseTransform(kernel);  // Transforms data
const console = new ConsoleSink(kernel);  // Displays data

// 3. Wire them up
kernel.connect(timer.outputPipe, upper.inputPipe);
kernel.connect(upper.outputPipe, console.inputPipe);

// Data flows: timer → upper → console
// Output: "TICK" every second
```

## Module Types

Every module falls into one of five categories:

| Type | Purpose | Pipes | Examples |
|------|---------|-------|----------|
| **Input** | User input sources | Output only | KeyboardInput, VoiceInput, MCPInput |
| **Source** | Bidirectional processes | Input + Output | PTY, DockerContainer, RemoteShell |
| **Transform** | Process data in-flight | Input + Output | AnsiParser, Compressor, Encryptor |
| **Output** | Display/record results | Input only | ScreenRenderer, MP4Recorder, Logger |
| **Routing** | Manage multiple pipes | Many pipes | RoutingServer, LoadBalancer |

**Example Flow**:
```
KeyboardInput (input)
      ↓
   PTY (source)
      ↓
AnsiParser (transform)
      ↓
 ┌────┴────┐
 ↓         ↓
Screen   Canvas  (both output)
```

### RoutingServer at a glance

- The in-process RoutingServer records every endpoint announcement from the Executor.
- `mkctl run` automatically announces/withdraws endpoints as nodes start and stop.
- Use `mkctl endpoints` (see the [mkctl Cookbook](./mkctl-cookbook.md)) to read `reports/router-endpoints.json` and confirm what is live.
- Architecture details live in [RoutingServer RFC](../rfcs/stream-kernel/05-router.md); future work will extend this to worker and network transports.

## Run Modes Explained

mkolbol supports four run modes, giving you flexibility for development, testing, and production:

### 1. inproc (In-Process)
**What**: Module runs in the main Node.js process
**When**: Development, lightweight transforms, minimal overhead
**Tradeoff**: Fast but no isolation

```typescript
const module = new UppercaseTransform(kernel);  // Runs in same process
```

### 2. worker (Worker Thread)
**What**: Module runs in a separate V8 worker thread
**When**: CPU-intensive work, need memory isolation, parallel processing
**Tradeoff**: Some overhead, but isolated from main thread

```yaml
nodes:
  - { id: parser, module: HeavyParser, runMode: worker }
```

### 3. external (Process via stdio)
**What**: Module runs as separate process, communicates over stdin/stdout
**When**: Any executable, language-agnostic, maximum isolation
**Tradeoff**: Process startup cost, but can use Python, Go, Rust, etc.

```yaml
nodes:
  - id: python-analyzer
    module: external
    command: python3
    args: [scripts/analyze.py]
```

### 4. pty (Pseudo-Terminal)
**What**: Module runs as PTY process with terminal emulation
**When**: Interactive shells, terminal applications, hijacking terminal I/O
**Tradeoff**: Full terminal semantics, ANSI escape sequences

```yaml
nodes:
  - id: shell
    module: pty
    command: bash
    params: { cols: 80, rows: 24 }
```

**Development Flow**: Start with `inproc` for fast iteration, switch to `worker` or `external` when you need isolation or production deployment.

## Simple ASCII Flow Diagram

Here's a one-screen view of a typical mkolbol topology:

```
                         ┌──────────────────────────────────┐
                         │         Main Process             │
                         │                                  │
    User Input           │  ┌──────────────────────────┐   │
        │                │  │    Kernel (inproc)       │   │
        ▼                │  │  - createPipe()          │   │
  ┌──────────┐           │  │  - connect()             │   │
  │ Keyboard │───────────┼──│  - split()               │   │
  │ (inproc) │           │  │  - merge()               │   │
  └──────────┘           │  └──────┬───────────────────┘   │
                         │         │                        │
        │                │         │ pipes                  │
        ▼                │         │                        │
  ┌──────────┐           │  ┌──────▼───────────────────┐   │
  │   PTY    │◄──────────┼──│  Executor + StateManager │   │
  │ (process)│───────────┼──│  Topology & Lifecycle    │   │
  └──────────┘           │  └──────────────────────────┘   │
   │       ▲             │                                  │
   │       │ Unix Socket │         │                        │
   │       │             │         │ data flow              │
   ▼       │             │         ▼                        │
  bash -i  │             │  ┌─────────────────┐            │
  output   │             │  │  AnsiParser     │            │
   │       input         │  │  (transform)    │            │
   │       │             │  └────┬────────────┘            │
   │       │             │       │ parsed events            │
   │       │             │       │                          │
   │       │             │  ┌────▼──────┬──────────────┐   │
   │       │             │  │           │              │   │
   │       │             │  ▼           ▼              ▼   │
   │       │             │ Screen    Canvas         Logger │
   │       │             │ (output)  (output)      (output)│
   │       │             │                                  │
   └───────┴─────────────┴──────────────────────────────────┘

Legend:
  ─────►  Data flow (pipes)
  ◄────►  Bidirectional
  (inproc)   Run mode
  (process)  Run mode (separate OS process)
```

## Key Components: Executor, StateManager, Hostess

These three components work together to manage your system:

### Executor
Orchestrates module lifecycle: load config → instantiate modules → wire connections → start/stop

```typescript
const executor = new Executor(kernel, hostess, stateManager);
executor.load(topologyConfig);  // Load YAML/JSON config
await executor.up();             // Start all modules
// ... system runs ...
await executor.down();           // Graceful shutdown
```

### StateManager
Tracks topology (nodes, connections) and emits events for HMI/monitoring

```typescript
stateManager.on('node.added', ({ nodeId }) => {
  console.log(`Node ${nodeId} registered`);
});
stateManager.on('connected', ({ from, to }) => {
  console.log(`Connected: ${from} → ${to}`);
});
```

### Hostess
Service registry with heartbeat monitoring and capability-based discovery

```typescript
// Modules auto-register on spawn
hostess.register(nodeId, capabilities, pipes);

// Query by capabilities
const parsers = hostess.query({ type: 'transform', produces: ['terminal-state'] });
```

## Where Logs and Artifacts Live

mkolbol integrates with **Laminar** for structured test observability. After running tests or your system, check these locations:

### Test Reports Directory: `reports/`

```
reports/
├── index.json                    # Manifest of all test artifacts
├── summary.jsonl                 # One-line summaries (pass/fail/duration)
├── <suite>/<case>.jsonl         # Per-case event streams (JSONL)
└── <suite>/<case>.digest.json   # Failure analysis digests
```

### Viewing Results

```bash
# List all test results
npx lam summary

# Analyze failures
npx lam digest

# Show specific test details with context
npx lam show --case kernel.spec/connect_moves_data_1_1 --around assert.fail --window 10

# Query test logs
npm run logq -- evt=case.begin reports/kernel.spec/connect_moves_data_1_1.jsonl

# Track failure trends
npx lam trends --top 10
```

### What Gets Logged

- **Test Events**: `case.begin`, `test.run`, `assert.fail`, `case.end`
- **Debug Events**: When `LAMINAR_DEBUG=1` or `DEBUG=1` is set
- **Module Events**: State transitions, connections, data flow
- **Performance**: Duration, memory usage, throughput

### Artifacts in CI

GitHub Actions uploads two artifact bundles per Node version:
- `laminar-reports-node-XX` - Contains `summary.jsonl`, case logs, digests
- Download from the [Actions tab](https://github.com/anteew/mkolbol/actions)

## Glossary

| Term | Definition |
|------|------------|
| **Kernel** | ~100 line core providing pipes, connections, and registry |
| **Pipe** | Bidirectional data channel (Node.js Duplex stream) |
| **Module** | Functional unit with input/output pipes (all semantics live here) |
| **Executor** | Lifecycle manager: loads config, instantiates modules, manages start/stop |
| **StateManager** | Topology tracker and event emitter for monitoring |
| **Hostess** | Service registry with heartbeat and capability-based discovery |
| **Run Mode** | Execution environment: inproc, worker, external, or pty |
| **Endpoint** | Addressable module instance with type, coordinates, and metadata |
| **Topology** | Configuration of nodes and connections (YAML/JSON) |
| **Laminar** | Test observability framework with structured logging (JSONL) |

## Packaging Walkthrough: Bundle Your First Module

After you build your first module, you'll want to distribute it as a single executable. Here's a quick walkthrough using the bundling example:

### Step 1: Navigate to Examples Directory

```bash
cd examples/early-adopter
```

### Step 2: Review the Bundle Script

The `scripts/build-bundle.mjs` file shows how to use **esbuild** to bundle your topology:

```bash
cat scripts/build-bundle.mjs
```

This script:
- Takes your TypeScript source (src/*.ts)
- Resolves all dependencies (mkolbol kernel, node_modules)
- Bundles into a single JavaScript file
- Produces `dist/runner.js` - your distributable executable

### Step 3: Build the Bundle

```bash
# Install dependencies (if not already done)
npm install

# Run the bundle script
node scripts/build-bundle.mjs
```

Expected output:
```
✓ Bundled successfully
✓ Output: dist/runner.js
```

### Step 4: Execute Your Bundled Topology

```bash
# Run your bundled runner
node dist/runner.js --duration 5

# Or specify custom config location
node dist/runner.js --file ./my-config.yml --duration 10
```

Your bundled application runs identically to the source:
- Same module wiring
- Same configuration loading
- Same Laminar observability (if enabled)

### Step 5: Observe with Laminar

If your runner includes Laminar instrumentation, artifacts appear in `reports/`:

```bash
# View test results
npx lam summary

# Analyze failures
npx lam digest

# Show detailed logs
npx lam show --case mytest.spec/test_name --around assert.fail --window 10
```

See **[Laminar Workflow Guide](./laminar-workflow.md)** for complete observability setup.

### Bundling Tips

**Size optimization:**
- Use esbuild's `--minify` flag to reduce bundle size
- Tree-shake unused dependencies with `--platform=node`
- Consider splitting bundles if they exceed 50MB

**Runtime configuration:**
- Store configs in `/etc/myapp/` or `$XDG_CONFIG_HOME`
- Pass config path as CLI argument (see `dist/runner.js --help`)
- Embed default config in the bundle as fallback

**Reproducible builds:**
- Pin all versions in `package-lock.json`
- Store the bundle script in version control
- Document any environment variables required at runtime

See **[Packaging Guide](./packaging.md)** for detailed information on bundling strategies (esbuild vs. pkg vs. ncc) and production considerations.

## Next Step: Quickstart

Ready to try it yourself? Jump to the **[Quickstart](../../README.md#quickstart)** section in the main README to:

1. Install mkolbol locally: `npm install mkolbol`
2. Initialize Laminar config: `npx lam init`
3. Run example tests: `npx lam run --lane auto`
4. Explore results: `npx lam summary` and `npx lam digest`

Or run a simple topology:

```bash
# Build the project
npm run build

# Run the basic example
npm run dev

# Run other examples
npm run dev:split   # Fan-out example
npm run dev:merge   # Fan-in example
```

---

## Your Next Steps

See the **Quick Start: Choose Your Path** section near the top of this guide to pick your entry point. Each path includes links to everything you need.

**Not sure which path?** Here's how to decide:
- **Just want to explore?** → Choose **"I want to see it in action"**
- **Ready to code?** → Choose **"I want to build my first module"**
- **Building something real?** → Choose **"I want to deploy and observe"**

## Deep Dives (Architecture & Design)

- **[Stream Kernel RFC](../rfcs/stream-kernel/00-index.md)** - Complete architecture documentation
- **[Philosophy & Design Principles](../rfcs/stream-kernel/01-philosophy.md)** - Microkernel vision
- **[Core Architecture](../rfcs/stream-kernel/02-core-architecture.md)** - The ~100 line kernel API
- **[Module Types](../rfcs/stream-kernel/03-module-types.md)** - Building your own modules
- **[PTY Use Cases](../rfcs/stream-kernel/04-pty-use-cases.md)** - Real-world terminal hijacking

## Questions?

- **Architecture questions?** See the RFC documents linked above
- **Testing questions?** Check `docs/testing/laminar-integration.md`
- **Build issues?** See `docs/testing/ci.md` for CI enforcement and Node version requirements
- **Want to contribute?** The kernel is stable; focus on building new modules!

Welcome aboard! mkolbol is designed to be a stable foundation you can build on. The kernel never changes - all the innovation happens in modules.
