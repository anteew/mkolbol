# mkolbol

**Microkernel for AI agent systems built on Model Context Protocol (MCP)**

## Overview

mkolbol is a domain-agnostic microkernel designed for building AI-first systems. It provides:

- **JSON-RPC/MCP router** - Request/response and notification handling
- **Pluggable transports** - In-process bus, stdio, HTTP/SSE
- **Plugin system** - Dynamic loading of capabilities via MCP tools/resources
- **Middleware pipeline** - Composable cross-cutting concerns (compression, encryption, metrics)
- **Event log** - Append-only audit trail with replay capability
- **Presence tracking** - Heartbeat and liveness detection
- **Control plane** - Runtime reconfiguration via sideband channels

## Philosophy

mkolbol follows a pragmatic microkernel design:

- **Not an OS kernel** - No reimplementation of schedulers, interrupts, or memory management
- **Just-enough kernel** - RPC bus, priority queues, timeouts, backpressure, capability auth
- **Plugin-first** - All business logic lives in user-space plugins
- **Transport-agnostic** - Start single-process, graduate to distributed without API changes

## Use Cases

mkolbol is designed to be the foundation for:

- **AI-first ticketing systems** (like obol)
- **Build/CI systems** - AI agents managing builds, tests, and deployments
- **PTY systems** - Terminal multiplexers with AI agent integration
- **Any AI agent system** requiring modularity, testability, and extensibility

## Installation

```bash
npm install mkolbol
# or
pnpm add mkolbol
```

## Quick Start

```typescript
import { Router, InProcBus } from 'mkolbol/kernel';
import { createHttpTransport } from 'mkolbol/transports';

const router = new Router();
const bus = new InProcBus();

// Register a tool
router.registerTool(
  {
    name: 'echo',
    description: 'Echo back input',
    inputSchema: { type: 'object', properties: { message: { type: 'string' } } }
  },
  async (params) => ({ echo: params.message })
);

// Start HTTP transport
const transport = createHttpTransport(router, bus, { port: 4317 });
await transport.start();
```

## Architecture

### Core Components

- **Router** (`src/kernel/router.ts`) - JSON-RPC method dispatch, tool/resource registry
- **Bus** (`src/kernel/bus.ts`) - In-process message bus with middleware support
- **Event Log** (`src/kernel/eventlog.ts`) - Append-only audit trail
- **Transports** (`src/transports/`) - HTTP/SSE and stdio adapters
- **Middleware** (`src/middleware/`) - Compression, metrics, etc.
- **Control Plane** (`src/control/`) - Runtime configuration

### Migration Path

1. **Single process** - In-proc bus, SQLite, easy install
2. **Isolated** - Unix domain sockets for plugin isolation
3. **Distributed** - TCP/WebSocket, no API changes

## Plugin Development

Plugins register MCP tools and resources:

```typescript
// Register a tool (mutation)
router.registerTool(
  {
    name: 'build.run',
    description: 'Trigger a build',
    inputSchema: { /* ... */ }
  },
  async (params, session) => {
    // Tool implementation
    return { buildId: '...' };
  }
);

// Register a resource (state)
router.registerResource(
  {
    uri: 'mcp://builds/{id}.json',
    description: 'Build status',
    subscribable: true
  },
  async (uri, session) => {
    // Resource reader implementation
    return { status: 'running', ... };
  }
);
```

## Testing

```bash
npm test
# or
npm run test:watch
```

The kernel is designed to be testable in isolation with:
- Golden transcript tests
- Event log replay
- Mock transports and plugins

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
