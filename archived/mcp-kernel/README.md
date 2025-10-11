# Archived: MCP-Based Microkernel Implementation

**Status:** 🗄️ Archived  
**Date Archived:** October 11, 2025  
**Reason:** Superseded by Stream Kernel architecture

## What This Is

This directory contains the original MCP (Model Context Protocol) based microkernel implementation that was the initial design for mkolbol. This implementation has been **archived** and is no longer the active direction for the project.

## Why It Was Archived

The project has evolved to adopt a **Stream Kernel** architecture (~100 lines) based on pure stream plumbing primitives. The new architecture provides:
- Protocol-agnostic design (not tied to JSON-RPC/MCP)
- Greater deployment flexibility (single process → distributed)
- Simpler, more minimal kernel (~100 lines vs ~200 lines)
- Better separation between mechanism (kernel) and policy (modules)

## What's Here

This archived implementation includes:

### Source Code (`src/`)
- **kernel/** - Router, Bus, EventLog (JSON-RPC/MCP focused)
- **transports/** - HTTP and stdio adapters
- **middleware/** - Compression, metrics pipeline
- **control/** - ControlPlane for runtime configuration
- **plugins/** - Plugin manifest system

### Compiled Output (`dist/`)
- TypeScript compilation artifacts (.js, .d.ts, .map files)

### Documentation
- **KERNEL_RFC.md** - Original MCP kernel architecture RFC
- **MILESTONE_M0.md** - Original milestone plan

### Tests (`tests/`)
- **router.test.ts** - Router test suite

## New Architecture

The current project direction is documented in the **Stream Kernel RFC**:
- **Main RFC:** [/STREAM_KERNEL_RFC.md](/STREAM_KERNEL_RFC.md)
- **Modular RFC:** [/docs/rfcs/stream-kernel/00-index.md](/docs/rfcs/stream-kernel/00-index.md)

## Can I Still Use This?

This code is preserved for reference but is **not maintained**. If you need MCP-specific functionality, this code may serve as a reference implementation, but it's recommended to build MCP support as a **module** on top of the new Stream Kernel instead.

## Migration Path

The Stream Kernel RFC documents how to build MCP support as a composable module:

```typescript
// MCP as a module on Stream Kernel (future implementation)
const kernel = new Kernel();
const jsonrpc = new JSONRPCRouter(kernel);
const mcp = new MCPProtocol(kernel);

kernel.connect(transport.output, jsonrpc.input);
kernel.connect(jsonrpc.output, mcp.input);
```

This approach provides the same MCP capabilities but with greater flexibility since the kernel remains protocol-agnostic.

---

**For questions about the archived code:** Refer to the commit history or the original KERNEL_RFC.md in this directory.

**For current development:** See the main README.md and Stream Kernel RFC in the root directory.
