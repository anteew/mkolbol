# Core Architecture

## The Kernel API

The complete kernel API in ~100 lines:

```typescript
import { PassThrough, Duplex } from 'stream';

type Pipe = Duplex;

interface ServiceCapabilities {
  type: 'input' | 'source' | 'transform' | 'output' | 'routing';
  accepts?: string[];
  produces?: string[];
  features?: string[];
}

class Kernel {
  private services = new Map<string, { caps: ServiceCapabilities; pipe: Pipe }>();

  /**
   * Create a new pipe (data channel)
   */
  createPipe(type: 'local' | 'unix' | 'tcp' = 'local'): Pipe {
    switch (type) {
      case 'local':
        return new PassThrough({ objectMode: true });
      case 'unix':
        // TODO: UnixSocketPipe implementation
        throw new Error('Not implemented');
      case 'tcp':
        // TODO: TCPPipe implementation
        throw new Error('Not implemented');
    }
  }

  /**
   * Connect two pipes: from.output → to.input
   */
  connect(from: Pipe, to: Pipe): void {
    from.pipe(to);
  }

  /**
   * Split: one source → multiple destinations (fan-out)
   */
  split(from: Pipe, to: Pipe[]): void {
    for (const dest of to) {
      from.pipe(dest);
    }
  }

  /**
   * Merge: multiple sources → one destination (fan-in)
   */
  merge(from: Pipe[], to: Pipe): void {
    for (const source of from) {
      source.pipe(to);
    }
  }

  /**
   * Register a service with capabilities
   */
  register(name: string, capabilities: ServiceCapabilities, pipe: Pipe): void {
    this.services.set(name, { caps: capabilities, pipe });
  }

  /**
   * Look up services by capabilities
   */
  lookup(query: Partial<ServiceCapabilities>): Map<string, Pipe> {
    const results = new Map<string, Pipe>();

    for (const [name, { caps, pipe }] of this.services) {
      let matches = true;

      if (query.type && caps.type !== query.type) {
        matches = false;
      }

      if (query.accepts && caps.accepts) {
        const hasAccepts = query.accepts.some((a) => caps.accepts!.includes(a));
        if (!hasAccepts) matches = false;
      }

      if (query.produces && caps.produces) {
        const hasProduces = query.produces.some((p) => caps.produces!.includes(p));
        if (!hasProduces) matches = false;
      }

      if (matches) {
        results.set(name, pipe);
      }
    }

    return results;
  }
}

export { Kernel, Pipe, ServiceCapabilities };
```

**Total: ~100 lines. This is the entire kernel.**

## Core Operations

### createPipe()

Creates a bidirectional data channel:

```typescript
const pipe = kernel.createPipe();

// Write to pipe
pipe.write({ type: 'data', value: 42 });

// Read from pipe
pipe.on('data', (data) => {
  console.log(data); // { type: 'data', value: 42 }
});
```

**Uses Node.js Duplex streams internally** - battle-tested, automatic backpressure.

### connect(from, to)

Pipes data from one pipe to another:

```typescript
const source = kernel.createPipe();
const dest = kernel.createPipe();

kernel.connect(source, dest);

source.write('hello');
// 'hello' automatically flows to dest
```

**Implementation:** Just `from.pipe(to)` - Node.js handles everything!

### split(source, [dest1, dest2, ...])

Fan-out: one source → multiple destinations

```typescript
const pty = kernel.createPipe();
const xterm = kernel.createPipe();
const canvas = kernel.createPipe();
const ai = kernel.createPipe();

kernel.split(pty, [xterm, canvas, ai]);

pty.write('data');
// All three destinations receive 'data' simultaneously
```

**Use case:** Multi-modal output (one PTY → many renderers)

### merge([source1, source2, ...], dest)

Fan-in: multiple sources → one destination

```typescript
const keyboard = kernel.createPipe();
const voice = kernel.createPipe();
const ai = kernel.createPipe();
const pty = kernel.createPipe();

kernel.merge([keyboard, voice, ai], pty);

keyboard.write('ls\n'); // PTY receives 'ls\n'
voice.write('cd /\n'); // PTY receives 'cd /\n'
ai.write('pwd\n'); // PTY receives 'pwd\n'
```

**Use case:** Multi-input (keyboard + voice + AI → single PTY)

### register(name, capabilities, pipe)

Advertise a service for discovery:

```typescript
kernel.register(
  'xterm-parser',
  {
    type: 'transform',
    accepts: ['raw-ansi'],
    produces: ['terminal-state'],
    features: ['vt100', 'xterm-256color'],
  },
  parserPipe,
);
```

**Use case:** Dynamic service discovery, capability-based routing

### lookup(query)

Find services by capabilities:

```typescript
// Find all parsers that produce terminal-state
const parsers = kernel.lookup({
  produces: ['terminal-state'],
});

// Find all AI-compatible modules
const aiModules = kernel.lookup({
  produces: ['ai-text'],
});
```

**Use case:** Dynamic composition, plugin discovery

### CI Enforcement (Process Mode)

Process-mode adapters run in a dedicated vitest lane. The GitHub Actions workflow (`.github/workflows/tests.yml`) requires this lane on every supported Node version. The job executes with `MK_PROCESS_EXPERIMENTAL=1`, writes raw output to `reports/process_raw.log`, and exposes failures immediately (no continue-on-error), keeping process-mode parity aligned with in-process adapters.

## Pipe Lifecycle

```
┌─────────────────────────────────────┐
│ 1. Create pipes                     │
│    const p1 = kernel.createPipe()   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 2. Connect pipes                    │
│    kernel.connect(p1, p2)           │
│    kernel.split(p1, [p2, p3])       │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 3. Data flows automatically         │
│    p1.write('data')                 │
│    → p2/p3 receive via 'data' event │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 4. Backpressure handled by Node.js  │
│    If p2 is slow, p1.write() blocks │
└─────────────────────────────────────┘
```

## Data Flow Example

```typescript
// Create kernel
const kernel = new Kernel();

// Create modules
const keyboard = new KeyboardInput(kernel);
const pty = new PTY(kernel);
const parser = new ANSIParser(kernel);
const screen = new ScreenRenderer(kernel);

// Wire up the flow
kernel.connect(keyboard.output, pty.input); // Keyboard → PTY
kernel.connect(pty.output, parser.input); // PTY → Parser
kernel.connect(parser.output, screen.input); // Parser → Screen

// Start typing
// keyboard → pty → parser → screen
// User sees their typing rendered to screen!
```

**The kernel just provides the plumbing. Modules do all the work.**

## Key Insights

### 1. Node.js Streams Do the Heavy Lifting

We don't implement:

- Buffering (Node.js does it)
- Backpressure (Node.js does it)
- Error propagation (Node.js does it)
- Pause/resume (Node.js does it)

**The kernel is a thin wrapper over Node.js streams.**

### 2. The Kernel Never Changes

To add a new feature:

1. ❌ Don't modify the kernel
2. ✅ Create a new module
3. ✅ Wire it up with connect/split/merge

**The kernel API is stable from day 1.**

### 3. Pipes are Bidirectional

A single `Pipe` can both read and write:

```typescript
// Write to pipe
pipe.write(data);

// Read from pipe
pipe.on('data', (data) => { ... });
```

This enables request/response patterns without multiple pipes.

### 4. Object Mode by Default

```typescript
createPipe({ objectMode: true });
```

Pipes carry **objects** (not just bytes), which is perfect for:

- JSON-RPC messages
- MCP protocol
- Structured terminal state
- Any JavaScript object

For raw bytes (PTY output), modules can convert:

```typescript
class PTY {
  constructor(kernel) {
    this.output = kernel.createPipe();

    pty.stdout.on('data', (buffer: Buffer) => {
      this.output.write(buffer); // Buffer flows through pipe
    });
  }
}
```

## Platform Support

### Node.js (Primary)

```typescript
import { Kernel } from './kernel';

const kernel = new Kernel();
// Full Node.js stream support
```

### Browser (Future)

```typescript
import { Kernel } from './kernel';

const kernel = new Kernel();
// Uses browser-compatible stream polyfill
// Or TransformStream (Streams API)
```

Same API, different stream implementation!

## What the Kernel Does NOT Do

❌ Parse data formats  
❌ Understand protocols  
❌ Route messages (except basic fan-out/fan-in)  
❌ Transform data  
❌ Handle errors (beyond stream errors)  
❌ Supervise modules  
❌ Manage lifecycles  
❌ Implement transports  
❌ Compress/encrypt  
❌ Authenticate  
❌ Log events

**All of those are module responsibilities.**

## Endpoints

### Overview

Endpoints provide addressability and metadata for modules in the system. Each registered module has an associated endpoint that describes:

- **Type** - The execution environment (inproc, worker, external, pty)
- **Coordinates** - Location/identifier for reaching the module
- **Metadata** - Additional context specific to the endpoint type

### Endpoint Model

```typescript
interface HostessEndpoint {
  type: string; // Execution environment type
  coordinates: string; // Location/identifier
  metadata?: Record<string, any>; // Type-specific metadata
}
```

### Endpoint Types

**inproc** - In-process modules

```typescript
{
  type: 'inproc',
  coordinates: 'node:timer-source',
  metadata: {
    module: 'TimerSource',
    runMode: 'inproc'
  }
}
```

**worker** - Worker thread modules

```typescript
{
  type: 'worker',
  coordinates: 'node:transform-worker',
  metadata: {
    module: 'UppercaseTransform',
    runMode: 'worker'
  }
}
```

**external** - External process via stdio

```typescript
{
  type: 'external',
  coordinates: '/usr/bin/python3 script.py',
  metadata: {
    cwd: '/path/to/working/dir',
    ioMode: 'stdio'
  }
}
```

**pty** - PTY-based process

```typescript
{
  type: 'pty',
  coordinates: 'pid:12345',
  metadata: {
    cols: 80,
    rows: 24,
    terminalType: 'xterm-256color'
  }
}
```

### Registration

Endpoints are registered automatically when modules are instantiated:

**Via Executor:**

```typescript
// Executor registers endpoints during node instantiation
const executor = new Executor(kernel, hostess, stateManager);
executor.load(topologyConfig);
await executor.up(); // Registers endpoints for all nodes
```

**Via Wrappers:**

```typescript
// PTY wrapper registers on spawn
const ptyWrapper = new PTYServerWrapper(kernel, hostess, manifest);
await ptyWrapper.spawn(); // Registers pty endpoint

// External wrapper registers on spawn
const extWrapper = new ExternalServerWrapper(kernel, hostess, manifest);
await extWrapper.spawn(); // Registers external endpoint
```

### Discovery Pattern

The Hostess provides discovery of registered endpoints:

```typescript
// Get all endpoints
const endpoints = hostess.listEndpoints();

// Iterate over endpoints
for (const [id, endpoint] of endpoints) {
  console.log(`${endpoint.type}: ${endpoint.coordinates}`);
}
```

**CLI Discovery:**

```bash
# List all registered endpoints
node dist/scripts/mkctl.js endpoints
```

### Use Cases

**Dynamic routing** - Discover available endpoints at runtime and route connections dynamically

**Health monitoring** - Track which endpoints are registered and available

**Debugging** - Inspect endpoint metadata to understand system topology

**Tool integration** - External tools can query endpoints to understand system structure

## Process I/O Adapters

### Overview

Process adapters enable kernel pipes to communicate with external processes over Unix domain sockets. Two adapter types handle different responsibilities:

- **UnixPipeAdapter** - Data plane (bidirectional streaming)
- **UnixControlAdapter** - Control plane (pub/sub + heartbeat)

### UnixPipeAdapter

Implements bidirectional data streaming over Unix domain sockets by wrapping a `Socket` in a Node.js `Duplex` stream.

**Key Features:**

- Automatic backpressure via `socket.pause()`/`socket.resume()`
- Graceful shutdown with `_final()` hook
- Socket lifecycle tied to stream lifecycle

**Implementation:**

```typescript
class UnixPipeAdapterDuplex extends Duplex {
  private socket: Socket;

  _read(size: number): void {
    this.socket.resume();
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    const canContinue = this.socket.write(chunk, encoding);
    if (canContinue) {
      callback();
    } else {
      this.socket.once('drain', () => callback());
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    this.socket.end(() => callback());
  }

  _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    this.socket.destroy();
    callback(error);
  }
}
```

**Usage:**

```typescript
// Server side
const adapter = new UnixPipeAdapter('/tmp/module.sock');
await adapter.listen();
const pipe = adapter.createDuplex({ objectMode: true });

// Client side
const adapter = new UnixPipeAdapter('/tmp/module.sock');
await adapter.connect();
const pipe = adapter.createDuplex({ objectMode: true });

// Wire to kernel
kernel.connect(sourcePipe, pipe);
```

**Backpressure Flow:**

```
Writer                  Adapter                 Socket
  │                       │                       │
  │ write(chunk)          │                       │
  ├─────────────────────→ │                       │
  │                       │ socket.write()        │
  │                       ├─────────────────────→ │
  │                       │                       │
  │                       │ ← returns false       │
  │                       │   (buffer full)       │
  │                       │                       │
  │                       │ wait for 'drain'      │
  │                       │ ←─────────────────────│
  │                       │                       │
  │ ← callback()          │                       │
  │   (write complete)    │                       │
```

### UnixControlAdapter

Implements control-plane messaging over Unix domain sockets using JSON-line protocol.

**Key Features:**

- Pub/sub for control messages
- Automatic heartbeat (1000ms interval)
- Graceful shutdown signaling
- Newline-delimited JSON messages

**Message Protocol:**

```typescript
interface ControlMessage {
  type: 'control';
  topic: string;
  data: unknown;
}

// Examples:
{ type: 'control', topic: 'control.heartbeat', data: { ts: 1234567890 } }
{ type: 'control', topic: 'control.shutdown', data: { ts: 1234567890 } }
{ type: 'control', topic: 'app.config', data: { key: 'value' } }
```

**Usage:**

```typescript
// Server side
const control = new UnixControlAdapter('/tmp/control.sock', true);
control.subscribe('control.heartbeat', (data) => {
  console.log('Heartbeat received:', data);
});

// Client side
const control = new UnixControlAdapter('/tmp/control.sock', false);
control.subscribe('app.config', (data) => {
  updateConfig(data);
});

// Publish messages
control.publish('app.status', { status: 'ready' });

// Shutdown
control.shutdown(); // Sends shutdown signal, then closes
```

**Heartbeat Mechanism:**

```
Client                  Control Adapter              Server
  │                           │                         │
  │ startHeartbeat()          │                         │
  │ ├─────────────────────────┤                         │
  │ │   setInterval(1000ms)   │                         │
  │ │                         │                         │
  │ │ ← interval tick         │                         │
  │ │ publish('heartbeat')    │                         │
  │ │ ────────────────────────┼────────────────────────→│
  │ │                         │   { ts: 1234567890 }    │
  │ │                         │                         │ update lastHeartbeat
  │ │                         │                         │
  │ │ ← interval tick         │                         │
  │ │ publish('heartbeat')    │                         │
  │ │ ────────────────────────┼────────────────────────→│
  │ │                         │                         │
  │                           │                         │
  │                           │      [Timeout Check]    │
  │                           │      if (now - lastHeartbeat > threshold) {
  │                           │        evict()          │
  │                           │      }                  │
```

Heartbeat timeout defaults to 30s. Configured via `heartbeatTimeout` parameter.

### Cutover Sequence

The executor implements blue/green cutover for process-based modules using a 3-phase sequence:

**1. Drain Phase** (5s timeout)

Wait for output pipe to finish emitting buffered data:

```typescript
const drainPromise = new Promise<void>((resolve) => {
  const timeout = setTimeout(() => {
    debug.emit('executor', 'process.drain.timeout', { nodeId });
    resolve();
  }, 5000);

  if (outputPipe) {
    outputPipe.once('end', () => {
      clearTimeout(timeout);
      resolve();
    });
  } else {
    resolve();
  }
});
await drainPromise;
```

**2. Switch Phase**

Emit event signaling cutover point (no action required):

```typescript
debug.emit('executor', 'process.switch', { nodeId });
```

**3. Teardown Phase** (5s timeout)

Gracefully terminate process:

```typescript
return new Promise((resolve) => {
  const killTimer = setTimeout(() => {
    if (proc && !proc.killed) {
      proc.kill('SIGKILL'); // Force kill
    }
  }, 5000);

  proc.once('exit', () => {
    clearTimeout(killTimer);
    resolve();
  });

  proc.kill('SIGTERM'); // Graceful termination
});
```

**Full Cutover Flow:**

```
┌─────────────────────────┐
│  Active Process         │
│  (reading/writing data) │
└───────────┬─────────────┘
            │
            │ down() called
            ▼
┌─────────────────────────┐
│  1. DRAIN PHASE         │
│  Wait for outputPipe    │
│  'end' event            │
│  Timeout: 5s            │
└───────────┬─────────────┘
            │
            │ Drain complete or timeout
            ▼
┌─────────────────────────┐
│  2. SWITCH PHASE        │
│  Emit cutover event     │
│  (coordination point)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  3. TEARDOWN PHASE      │
│  Send SIGTERM           │
│  Wait for exit          │
│  Timeout → SIGKILL      │
│  Timeout: 5s            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Process Terminated     │
│  Resources Released     │
└─────────────────────────┘
```

**Rationale:**

- **Drain** ensures no data loss during shutdown
- **Switch** provides coordination point for future blue/green deployments
- **Teardown** ensures process cleanup even if graceful shutdown fails

### Adapter Comparison

| Feature           | UnixPipeAdapter      | UnixControlAdapter    |
| ----------------- | -------------------- | --------------------- |
| **Purpose**       | Data streaming       | Control messaging     |
| **Protocol**      | Raw bytes/objects    | JSON-line             |
| **Backpressure**  | Native stream        | N/A                   |
| **Heartbeat**     | No                   | Yes (1000ms)          |
| **Bidirectional** | Yes                  | Yes                   |
| **Use Case**      | High-throughput data | Low-frequency control |

### Error Handling

**UnixPipeAdapter:**

```typescript
adapter.createDuplex().on('error', (err) => {
  // Socket errors propagate to stream
  console.error('Pipe error:', err);
});
```

**UnixControlAdapter:**

```typescript
// Errors suppressed during shutdown
control.subscribe('control.error', (err) => {
  console.error('Control error:', err);
});
```

### Performance

**UnixPipeAdapter:**

- Throughput: ~500K msgs/sec (object mode)
- Latency: <1ms (same machine)
- Overhead: Socket + stream wrapping

**UnixControlAdapter:**

- Throughput: ~10K msgs/sec
- Latency: 1-2ms
- Overhead: JSON serialization + parsing

## Next Steps

See:

- **[Module Types](03-module-types.md)** - How to build modules on this kernel
- **[PTY Use Cases](04-pty-use-cases.md)** - Real-world examples
- **[Worker Mode](worker-mode.md)** - Worker vs Process adapter comparison
- **[Service Registry](07-service-registry.md)** - Using register/lookup for discovery
