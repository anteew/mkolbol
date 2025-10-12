# mkolbol

**Stream-based microkernel for AI agent systems**

## Primary Architect
 - **Architect Name** - VEGA
 - **Architect Model** - GPT-5 Thinking HIGH
 - **AI AGENT SELF files** - In this repo in the subdirectory VEGA
 - **AI AGENT reads self files on startup** - YES
 - **Relation to human user** - Vega is the technical brains, helping to keep the human on track with what he or she is needing built.
 
 
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

## Installation

```bash
npm install mkolbol
# or
pnpm add mkolbol
```

**Note:** Experimental preview. The Stream Kernel is implemented minimally in this repo with runnable demos; APIs may change.

Requirements

- Node 20+ (tested on 20.x and 24.x)
- macOS or Linux (Windows later)

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
kernel.connect(keyboard.output, pty.input);     // Keyboard → PTY
kernel.connect(pty.output, parser.input);       // PTY → Parser
kernel.split(parser.output, [                   // Parser → Multiple outputs
  screen.input,                                 //   → Screen
  ai.input                                      //   → AI formatter
]);

// Start the system
keyboard.start();
pty.start();
```

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

```bash
npm test
# or  
npm run test:watch
# For CI environments (Node 20/24)
npm run test:ci
```

**CI Note:** The `test:ci` script uses `--pool=threads` to avoid tinypool concurrency issues on Node 20 and 24. Tested on both LTS versions.

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
  configFile: 'laminar.config.json'
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
  caseName: 'my-suite/failing-test' 
});

// 4. Get repro commands
const repro = await server.callTool('repro', { 
  caseName: 'my-suite/failing-test' 
});
```

**Workflow 2: Focus overlay for temporary filtering**
```typescript
// 1. Set temporary overlay rules to focus on errors only
await server.callTool('focus.overlay.set', {
  rules: [
    { match: { lvl: 'error' }, actions: [{ type: 'include' }] },
    { match: { evt: 'assert.fail' }, actions: [{ type: 'slice', window: 5 }] }
  ]
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
  limit: 50
});

// 2. Query specific event types
const assertions = await server.callTool('query', {
  caseName: 'topology.spec/rewire',
  event: 'assert.fail'
});
```

**Workflow 4: Flake detection**
```typescript
// Run tests with flake detection (5 runs)
const result = await server.callTool('run', {
  flakeDetect: true,
  flakeRuns: 5
});

// Check stability report
// (saved to reports/stability-report.json)
```

See [docs/testing/laminar.md](docs/testing/laminar.md#mcp-server-integration) for complete MCP integration examples and tool schemas.

### Cross-Language Test Ingest

Laminar can import test results from external languages and frameworks:

```bash
# Import Go test results
lam ingest --go --from-file go-test-output.json
lam ingest --go --cmd "go test -json ./..."
```

Ingested tests integrate with all Laminar features (`logq`, `lam digest`, `lam show`). See [docs/testing/laminar.md](docs/testing/laminar.md#cross-language-test-ingest) for complete workflow examples and CI integration.

### CLI Tools

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

## License

MIT - See [LICENSE](./LICENSE)
