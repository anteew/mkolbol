# mkolbol

**Stream-based microkernel for AI agent systems**

## Overview

mkolbol is a minimal (~100 line) stream-based microkernel designed for building flexible, distributed AI agent systems. The kernel provides protocol-agnostic "physical layer" plumbing while all semantics live in composable modules.

**Current Status:** 🏗️ **Architecture & RFC Phase**  
The Stream Kernel architecture is fully documented in comprehensive RFCs. Implementation is planned for the near future.

## Vision

Build the most flexible terminal I/O and AI agent system ever created:
- **PTY hijacking** - Intercept and transform any terminal application's I/O
- **Multi-modal rendering** - Display terminal output as xterm.js, Canvas, Video, TTS, AI-formatted text
- **Multi-source input** - Accept input from keyboard, voice (STT), AI agents, network
- **Protocol agnostic** - Pipes carry anything (bytes, JSON-RPC, MCP, custom protocols)
- **Distributed deployment** - Same code runs single-process, multi-process, or across machines
- **Browser-ready** - Works in Node.js and browsers (TypeScript)

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

**Note:** The Stream Kernel implementation is not yet available. Current package contains the archived MCP-based implementation (see below).

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
```

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

### Current Implementation (MCP Kernel)
See [KERNEL_RFC.md](./KERNEL_RFC.md) for detailed architecture documentation of the current MCP-based kernel.

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
