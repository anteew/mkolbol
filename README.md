# mkolbol

**Stream-based microkernel for AI agent systems**

## Primary Architect
 - **Architect Name** - VEGA
 - **Architect Model** - GPT-5 Thinking HIGH
 - **AI AGENT SELF files** - In this repo in the subdirectory VEGA
 - **AI AGENT reads self files on startup** - YES
 - **Relation to human user** - Vega is the technical brains, helping to keep the human on track with what he or she is needing built.
 
 
## Quickstart

Work locally without any external tooling:

```bash
# Install dependencies
npm ci

# Build
npm run build

# Run tests (threads lane)
npm run test:ci

# PTY-specific tests (fork lane)
npm run test:pty

# Run a simple demo
node dist/examples/basic-topology.js
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

## Installation

### Local Installation (Recommended)

```bash
# Install in your project
npm install mkolbol
```

### Requirements

- Node 20+ (tested on 20.x and 24.x)
- macOS or Linux (Windows support coming soon)

Note: This repository focuses on the stream kernel. Demos live under `dist/examples/` after building.

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

<!-- CI badge removed intentionally to keep main vanilla. -->

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

<!-- For test artifact schema and advanced analysis, see the separate tooling repository. -->

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
