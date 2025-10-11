# Philosophy & Design Principles

## The Microkernel Vision

A microkernel does **one thing perfectly**: provide mechanism. All policy lives in user space (or in our case, modules/servers).

### Mechanism vs Policy

**Mechanism** (kernel provides):
- Create pipes (data channels)
- Connect pipes together
- Split data to multiple destinations  
- Merge data from multiple sources
- Register services

**Policy** (modules decide):
- What data formats to use (JSON, bytes, MCP, etc.)
- How to parse/transform data
- Where to route messages
- When to compress/encrypt
- How to handle errors

**The kernel is mechanism. Modules are policy.**

## Design Principles

### 1. Pure Plumbing (~100 Lines)

The kernel is the "physical layer" - like pneumatic tubes that move packages through a bank. The kernel doesn't know or care what's in the packages.

```typescript
class Kernel {
  createPipe(): Pipe { ... }              // ~10 lines
  connect(from: Pipe, to: Pipe) { ... }   // ~5 lines  
  split(from: Pipe, to: Pipe[]) { ... }   // ~10 lines
  merge(from: Pipe[], to: Pipe) { ... }   // ~10 lines
  register(name, caps, pipe) { ... }      // ~20 lines
  lookup(query) { ... }                   // ~15 lines
}
```

**Total: ~100 lines that never change.**

### 2. Protocol Agnostic

The kernel works with **any** data format:
- Raw bytes (terminal escape sequences)
- JSON objects (structured data)
- JSON-RPC messages (AI agent communication)  
- MCP protocol (Model Context Protocol)
- Binary data (video frames)
- Custom protocols (your future invention)

**Pipes carry anything. The kernel doesn't parse or understand data.**

### 3. Transport Agnostic

Same kernel API works with different "wire protocols":

```typescript
// In same process
createPipe('local')    → PassThrough stream (in-memory)

// Different processes  
createPipe('unix')     → Unix domain socket

// Different machines
createPipe('tcp')      → TCP socket
createPipe('websocket') → WebSocket

// Embedded systems
createPipe('ringbuf')  → Ring buffer (zero-copy)
```

**Location is policy, not mechanism!** (L4 microkernel insight)

### 4. Location Transparency

Servers don't know where their peers are located:

```typescript
// Server code - same everywhere
class ParserServer {
  constructor(kernel: Kernel) {
    this.input = kernel.createPipe();   // Could be local or remote!
    this.output = kernel.createPipe();  // Could be local or remote!
  }
}
```

Whether the parser runs in-process, in another process, or on another machine is **configuration**, not code.

### 5. Composability

Build complex behaviors from simple primitives:

```
Kernel provides:  createPipe, connect, split, merge
Developer builds: fan-out, fan-in, routing, filtering, transformation
```

Example - multi-modal output (one PTY → many renderers):

```typescript
const pty = new PTY(kernel);
const xterm = new XtermRenderer(kernel);
const canvas = new CanvasRenderer(kernel);  
const tts = new TTSRenderer(kernel);

kernel.split(pty.output, [
  xterm.input,
  canvas.input,
  tts.input
]);
```

**Same data flows to all renderers simultaneously.**

### 6. Everything is a Module

Even "system" services are modules:

```typescript
// Routing? Module!
const router = new RoutingServer(kernel);

// Service discovery? Module!  
const registry = new RegistryServer(kernel);

// Supervision? Module!
const supervisor = new SupervisorModule(kernel);

// MCP protocol? Module!
const mcp = new MCPRouter(kernel);
```

**The kernel knows nothing about routing, discovery, supervision, or protocols.**

## What This Enables

### ✅ Deployment Flexibility

Same code, different deployment:
- **Development:** Single Node.js process
- **Testing:** Multi-process with isolation
- **Production:** Distributed across machines
- **Embedded:** Bare metal with ring buffers

### ✅ Testing in Isolation

Test the kernel with no modules:

```typescript
describe('Kernel', () => {
  it('connects pipes', () => {
    const kernel = new Kernel();
    const p1 = kernel.createPipe();
    const p2 = kernel.createPipe();
    
    kernel.connect(p1, p2);
    
    p1.write('test');
    expect(p2.read()).toBe('test');
  });
});
```

Test modules with mock kernel:

```typescript
describe('ParserModule', () => {
  it('parses ANSI', () => {
    const mockKernel = { createPipe: () => new PassThrough() };
    const parser = new ANSIParser(mockKernel);
    
    parser.input.write('\x1b[31m');
    expect(parser.output.read()).toEqual({ color: 'red' });
  });
});
```

### ✅ Infinite Extensibility

Add new modules without touching the kernel:

```typescript
// Someone invents a new module type
class HolographicRenderer {
  constructor(kernel: Kernel) {
    this.input = kernel.createPipe();
  }
  
  render(data) {
    // Render to hologram!
  }
}

// Works with existing system - no kernel changes!
kernel.split(pty.output, [
  xterm.input,
  hologram.input  // New renderer!
]);
```

## Comparison: Traditional vs Microkernel

### Traditional MCP Server (Monolithic)

```typescript
class MCPServer {
  // Kernel knows about JSON-RPC
  private rpcHandler: JSONRPCHandler;
  
  // Kernel knows about transports
  private transports: (StdioTransport | HTTPTransport)[];
  
  // Kernel knows about middleware
  private middleware: (Compression | Auth | Metrics)[];
  
  // Kernel knows about subscriptions
  private subscriptions: Map<string, Subscriber[]>;
  
  // To add a feature: modify kernel
  addFeature() { /* change kernel code */ }
}
```

**Problem:** Adding features requires kernel changes.

### Stream Kernel (Microkernel)

```typescript
class Kernel {
  createPipe(): Pipe { ... }
  connect(from, to) { ... }
  split(from, to[]) { ... }
  merge(from[], to) { ... }
  register(name, caps, pipe) { ... }
}

// Features are modules
const jsonrpc = new JSONRPCRouter(kernel);
const stdio = new StdioTransport(kernel);
const http = new HTTPTransport(kernel);
const compression = new CompressionModule(kernel);
const auth = new AuthModule(kernel);
const mcp = new MCPProtocol(kernel);

// Wire them up - no kernel changes!
kernel.connect(stdio.output, jsonrpc.input);
kernel.connect(jsonrpc.output, compression.input);
kernel.connect(compression.output, auth.input);
kernel.connect(auth.output, mcp.input);
```

**Benefit:** Add features by adding modules. Kernel never changes.

## Real-World Inspiration

**Mach:** Stable kernel, everything else in user space  
**L4:** Mechanism vs policy, ~10KB kernel  
**QNX:** Network-transparent IPC  
**Plan 9:** Everything-is-a-file/stream  
**GNU Hurd:** Servers build on minimal kernel  
**Erlang:** Location-transparent message passing  
**Kubernetes:** Service mesh with discovery/routing

**Our contribution:** Apply these principles to terminal I/O and AI agent systems.

## The Payoff

With ~100 lines of kernel code, we get:
- ✅ Works in Node.js and browsers
- ✅ Single process → distributed deployment
- ✅ Any protocol (JSON-RPC, MCP, custom)
- ✅ Any transport (stdio, HTTP, WebSocket, TCP)
- ✅ Testable in isolation
- ✅ Infinitely extensible
- ✅ Never needs kernel changes

**The kernel is done on day 1. Everything else is modules.**
