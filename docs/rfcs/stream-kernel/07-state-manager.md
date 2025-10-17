# StateManager/ControlPlane Server

## Overview

The **StateManager** (also called **ControlPlane**) is a server that tracks all kernel pipes, connections, and data flows, providing both compile-time wiring configuration and runtime introspection/control capabilities.

**Think of it as:** The HMI (Human-Machine Interface) control room for a refinery with thousands of pipes, valves, and flow meters.

**Key Point:** StateManager is **NOT kernel code** - it's a server built on top of the kernel that provides policy and control over the kernel's mechanism.

## The Refinery Analogy

Imagine a massive oil refinery:

- **Pipes everywhere** - Thousands of connections moving different products
- **Control room** - Central HMI showing current state of all pipes, valves, flow rates
- **Dials and controls** - Operators can modify routing and flow without entering the plant
- **Initial configuration** - Plant wiring is designed and validated before construction begins
- **Monitoring** - Flow rates, pressures, temperatures tracked in real-time
- **Visualization** - Diagrams show how everything connects

**StateManager is the digital equivalent for your stream kernel.**

## Two Key Workflows

### Workflow 1: Multi-Machine Mesh (Dynamic)

**Scenario:** User ships two systems as single binaries to different machines, then wants them to discover each other's capabilities and communicate.

**Example:**

```typescript
// Machine A - has PTY and Screen capabilities
const kernelA = new Kernel();
const stateA = new StateManager(kernelA);
const pty = new PTY(kernelA);
const screen = new ScreenRenderer(kernelA);

stateA.register(pty, { capabilities: ['pty', 'input'] });
stateA.register(screen, { capabilities: ['render', 'screen'] });

// Announce capabilities to mesh
stateA.announceTo('tcp://machine-b:9000');
```

```typescript
// Machine B - has GPU processing capabilities
const kernelB = new Kernel();
const stateB = new StateManager(kernelB);
const gpu = new GPUProcessor(kernelB);

stateB.register(gpu, { capabilities: ['gpu', 'ml-inference'] });

// Discover Machine A's capabilities
const remoteCaps = await stateB.discoverFrom('tcp://machine-a:9000');
// remoteCaps: ['pty', 'input', 'render', 'screen']

// Now can route data: Machine B → Machine A
stateB.connect(gpu.output, 'tcp://machine-a:9000/screen/input');
```

**Key features:**

- Dynamic capability discovery between systems
- Runtime connection establishment across machines
- No compile-time knowledge of topology

### Workflow 2: Static Compile-Time Wiring (Baked-In)

**Scenario:** User builds a single system with all routing pre-configured and compiled in. No runtime discovery needed.

**Example wiring config** (`wiring.yaml`):

```yaml
servers:
  - id: keyboard-1
    type: KeyboardInput
    capabilities: [input, keyboard]

  - id: pty-1
    type: PTY
    capabilities: [pty, terminal]

  - id: parser-1
    type: ANSIParser
    capabilities: [parse, ansi]

  - id: screen-1
    type: ScreenRenderer
    capabilities: [render, screen]

  - id: ai-formatter-1
    type: AIFormatter
    capabilities: [format, ai-text]

connections:
  # Keyboard → PTY
  - from: keyboard-1.output
    to: pty-1.input

  # PTY → Parser
  - from: pty-1.output
    to: parser-1.input

  # Parser → Screen (split)
  - from: parser-1.output
    to: screen-1.input

  # Parser → AI Formatter (split)
  - from: parser-1.output
    to: ai-formatter-1.input
```

**Compile-time validation:**

```bash
# Lint the wiring config before building
$ mkolbol lint wiring.yaml
✓ All connections valid
✓ All servers have unique IDs
✓ No cycles detected
✓ All capabilities satisfied

# Build with baked-in wiring
$ mkolbol build --wiring wiring.yaml
Compiling system with static topology...
✓ Generated 5 servers
✓ Established 4 connections (2 splits)
✓ Binary: ./system.bin
```

**Runtime startup:**

```typescript
// The compiled binary loads the wiring automatically
const kernel = new Kernel();
const state = new StateManager(kernel);

// Load pre-configured topology
await state.loadWiringFromCompiled(); // Reads embedded config

// Everything is already connected - just start
state.startAll();
```

**Key features:**

- No runtime discovery needed
- Config validated at compile time
- Fast startup (no dynamic wiring)
- Single binary with everything baked in

## Core Responsibilities

### 1. Pipe & Connection Tracking

StateManager maintains complete state of kernel topology:

```typescript
interface PipeMetadata {
  id: string; // Unique pipe identifier
  serverId: string; // Which server owns this pipe
  direction: 'input' | 'output';
  address: string; // Addressable endpoint (e.g., 'pty-1.output')
  flowRate?: number; // Bytes/sec (runtime metric)
  connected: boolean; // Is pipe currently connected?
}

interface ConnectionMetadata {
  id: string; // Unique connection identifier
  from: string; // Source pipe address
  to: string[]; // Destination pipe address(es) - array for split()
  type: 'direct' | 'split' | 'merge';
  establishedAt: Date;
  bytesTransferred?: number;
}

class StateManager {
  private pipes: Map<string, PipeMetadata> = new Map();
  private connections: Map<string, ConnectionMetadata> = new Map();
  private servers: Map<string, ServerMetadata> = new Map();

  // Track a new pipe
  registerPipe(pipe: Pipe, metadata: PipeMetadata): void {
    this.pipes.set(metadata.id, metadata);
  }

  // Track a new connection
  registerConnection(from: string, to: string[]): void {
    const conn: ConnectionMetadata = {
      id: `${from}→${to.join(',')}`,
      from,
      to,
      type: to.length > 1 ? 'split' : 'direct',
      establishedAt: new Date(),
    };
    this.connections.set(conn.id, conn);
  }
}
```

### 2. Server Registry & Metadata

StateManager tracks all servers in the system:

```typescript
interface ServerMetadata {
  id: string; // Unique server identifier (e.g., 'pty-1')
  type: string; // Server class name (e.g., 'PTY')
  capabilities: string[]; // What this server can do
  humanReadable: string; // Description for humans/AI
  inputPipes: string[]; // IDs of input pipes
  outputPipes: string[]; // IDs of output pipes
  location?: string; // 'local' | 'tcp://host:port'
  status: 'running' | 'stopped' | 'error';
}

class StateManager {
  register(server: any, metadata: Partial<ServerMetadata>): void {
    const id = metadata.id || this.generateId(server);
    const fullMeta: ServerMetadata = {
      id,
      type: server.constructor.name,
      capabilities: metadata.capabilities || [],
      humanReadable: metadata.humanReadable || `${server.constructor.name} instance`,
      inputPipes: this.detectPipes(server, 'input'),
      outputPipes: this.detectPipes(server, 'output'),
      location: metadata.location || 'local',
      status: 'running',
    };
    this.servers.set(id, fullMeta);
  }
}
```

### 3. Runtime Introspection API

Other servers (or humans/AI) can query the current state:

```typescript
class StateManager {
  // Get current topology
  getTopology(): TopologySnapshot {
    return {
      servers: Array.from(this.servers.values()),
      pipes: Array.from(this.pipes.values()),
      connections: Array.from(this.connections.values()),
    };
  }

  // Find servers by capability
  findByCapability(capability: string): ServerMetadata[] {
    return Array.from(this.servers.values()).filter((s) => s.capabilities.includes(capability));
  }

  // Get flow metrics
  getFlowMetrics(pipeId: string): FlowMetrics {
    const pipe = this.pipes.get(pipeId);
    return {
      bytesPerSecond: pipe?.flowRate || 0,
      totalBytes: this.calculateTotalBytes(pipeId),
      lastActivity: this.getLastActivity(pipeId),
    };
  }

  // Trace data flow path
  tracePath(fromPipeId: string, toPipeId: string): Connection[] {
    // BFS to find path through connections
    return this.findPath(fromPipeId, toPipeId);
  }
}
```

### 4. Runtime Control API

Modify topology at runtime:

```typescript
class StateManager {
  // Establish new connection
  async connect(fromAddress: string, toAddress: string): Promise<void> {
    const fromPipe = this.resolvePipe(fromAddress);
    const toPipe = this.resolvePipe(toAddress);

    // Use kernel to make connection
    this.kernel.connect(fromPipe, toPipe);

    // Track in state
    this.registerConnection(fromAddress, [toAddress]);
  }

  // Split to multiple destinations
  async split(fromAddress: string, toAddresses: string[]): Promise<void> {
    const fromPipe = this.resolvePipe(fromAddress);
    const toPipes = toAddresses.map((addr) => this.resolvePipe(addr));

    this.kernel.split(fromPipe, toPipes);
    this.registerConnection(fromAddress, toAddresses);
  }

  // Disconnect
  async disconnect(fromAddress: string, toAddress: string): Promise<void> {
    const connId = `${fromAddress}→${toAddress}`;
    const conn = this.connections.get(connId);
    if (conn) {
      // Kernel doesn't have disconnect yet - might need to recreate pipes
      this.connections.delete(connId);
    }
  }
}
```

### 5. Visualization & Diagram Export

StateManager provides data in formats suitable for rendering:

```typescript
class StateManager {
  // Export as Mermaid diagram
  exportMermaid(): string {
    let diagram = 'graph LR\n';

    for (const server of this.servers.values()) {
      diagram += `  ${server.id}["${server.humanReadable}"]\n`;
    }

    for (const conn of this.connections.values()) {
      for (const to of conn.to) {
        diagram += `  ${conn.from} --> ${to}\n`;
      }
    }

    return diagram;
  }

  // Export as JSON for custom renderers
  exportJSON(): string {
    return JSON.stringify(this.getTopology(), null, 2);
  }

  // Export as DOT (Graphviz)
  exportDOT(): string {
    let dot = 'digraph Topology {\n';

    for (const server of this.servers.values()) {
      dot += `  "${server.id}" [label="${server.humanReadable}"];\n`;
    }

    for (const conn of this.connections.values()) {
      for (const to of conn.to) {
        dot += `  "${conn.from}" -> "${to}";\n`;
      }
    }

    dot += '}';
    return dot;
  }
}
```

## Compile-Time Wiring Specification

### Wiring File Format

YAML format for specifying static topology:

```yaml
# wiring.yaml
version: '1.0'

# Define all servers
servers:
  - id: keyboard-1
    type: KeyboardInput
    config:
      device: /dev/input/keyboard0
    capabilities: [input, keyboard]

  - id: pty-1
    type: PTY
    config:
      shell: /bin/bash
      rows: 24
      cols: 80
    capabilities: [pty, terminal]

  - id: parser-1
    type: ANSIParser
    capabilities: [parse, ansi]

  - id: screen-1
    type: ScreenRenderer
    config:
      terminal: xterm-256color
    capabilities: [render, screen]

# Define all connections
connections:
  # Simple connections
  - from: keyboard-1.output
    to: pty-1.input

  - from: pty-1.output
    to: parser-1.input

  # Split (one-to-many)
  - from: parser-1.output
    to:
      - screen-1.input
      - ai-formatter-1.input
    type: split

  # Merge (many-to-one)
  - from:
      - voice-1.output
      - keyboard-1.output
    to: pty-1.input
    type: merge

# Optional: Flow routing rules
routing:
  - match: { capability: gpu }
    route_to: tcp://gpu-machine:9000
```

### Compile-Time Validation

```typescript
class WiringValidator {
  validate(config: WiringConfig): ValidationResult {
    const errors: string[] = [];

    // Check unique IDs
    const ids = new Set<string>();
    for (const server of config.servers) {
      if (ids.has(server.id)) {
        errors.push(`Duplicate server ID: ${server.id}`);
      }
      ids.add(server.id);
    }

    // Check connections reference valid servers
    for (const conn of config.connections) {
      const from = this.parsePipeAddress(conn.from);
      if (!ids.has(from.serverId)) {
        errors.push(`Unknown server in connection: ${from.serverId}`);
      }

      for (const to of Array.isArray(conn.to) ? conn.to : [conn.to]) {
        const toParsed = this.parsePipeAddress(to);
        if (!ids.has(toParsed.serverId)) {
          errors.push(`Unknown server in connection: ${toParsed.serverId}`);
        }
      }
    }

    // Check for cycles (would cause deadlocks)
    if (this.hasCycles(config)) {
      errors.push('Topology contains cycles');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

## Addressing Scheme

Every pipe in the system has a unique address:

```typescript
// Format: {server-id}.{pipe-direction}
// Examples:
'pty-1.output'; // PTY server's output pipe
'parser-1.input'; // Parser server's input pipe
'screen-1.input'; // Screen renderer's input pipe

// For remote servers:
'tcp://machine-b:9000/gpu-1.output'; // Remote GPU server

// For terminal-based routing:
'router-1.terminal-A'; // Router's terminal A
'router-1.terminal-B'; // Router's terminal B
```

**Uniqueness guaranteed by:**

1. Server IDs must be unique within a system
2. Pipe directions (input/output) are unique per server
3. Terminals on routing servers have unique names

## Flow Monitoring

StateManager can track metrics about data flowing through pipes:

```typescript
class StateManager {
  private metrics: Map<string, PipeMetrics> = new Map();

  // Monitor pipe activity
  monitorPipe(pipeId: string): void {
    const pipe = this.resolvePipe(pipeId);

    let bytesTransferred = 0;
    let lastActivity = Date.now();

    pipe.on('data', (chunk) => {
      bytesTransferred += chunk.length;
      lastActivity = Date.now();

      this.metrics.set(pipeId, {
        bytesTransferred,
        bytesPerSecond: this.calculateRate(pipeId),
        lastActivity: new Date(lastActivity),
        active: true,
      });
    });
  }

  // Get current metrics
  getMetrics(pipeId: string): PipeMetrics {
    return (
      this.metrics.get(pipeId) || {
        bytesTransferred: 0,
        bytesPerSecond: 0,
        lastActivity: null,
        active: false,
      }
    );
  }
}
```

## Integration with Other Servers

StateManager provides an interface for other servers to interact with the topology:

### Routing Server Integration

```typescript
class RoutingServer {
  constructor(
    private kernel: Kernel,
    private stateManager: StateManager,
  ) {}

  async routeToCapability(data: any, capability: string): Promise<void> {
    // Ask StateManager where to send data
    const servers = this.stateManager.findByCapability(capability);

    if (servers.length === 0) {
      throw new Error(`No server with capability: ${capability}`);
    }

    // Route to first available
    const target = servers[0];
    const targetPipe = this.stateManager.resolvePipe(`${target.id}.input`);

    // Send data
    targetPipe.write(data);
  }
}
```

### Discovery Server Integration

```typescript
class DiscoveryServer {
  constructor(
    private kernel: Kernel,
    private stateManager: StateManager,
  ) {}

  async announceCapabilities(): Promise<void> {
    const topology = this.stateManager.getTopology();

    // Broadcast to mesh network
    const announcement = {
      capabilities: this.extractAllCapabilities(topology),
      servers: topology.servers.map((s) => ({
        id: s.id,
        type: s.type,
        capabilities: s.capabilities,
      })),
    };

    this.broadcastToMesh(announcement);
  }
}
```

## StateManager is NOT the Kernel

**Critical distinction:**

```typescript
// ❌ WRONG - StateManager in kernel
class Kernel {
  private stateManager: StateManager; // NO!

  createPipe(): Pipe {
    const pipe = new PassThrough();
    this.stateManager.track(pipe); // Kernel shouldn't know about StateManager!
    return pipe;
  }
}

// ✅ CORRECT - StateManager is separate server
class Kernel {
  createPipe(): Pipe {
    return new PassThrough(); // Kernel just creates pipes, period
  }
}

class StateManager {
  constructor(private kernel: Kernel) {
    // StateManager uses kernel, not vice versa
  }

  createAndTrackPipe(): Pipe {
    const pipe = this.kernel.createPipe(); // Use kernel's mechanism
    this.trackPipe(pipe); // Add our policy/tracking
    return pipe;
  }
}
```

**Why this matters:**

- Kernel stays minimal (~100 lines)
- StateManager is optional (you can run without it)
- Multiple StateManagers possible (different policies)
- Easy to test in isolation

## Separation: StateManager vs Routing vs Discovery

These are **three different servers**:

```typescript
// StateManager: Tracks state, provides introspection/control
class StateManager {
  getTopology(): Topology {
    /* ... */
  }
  connect(from, to): void {
    /* ... */
  }
  getMetrics(pipe): Metrics {
    /* ... */
  }
}

// RoutingServer: Routes data based on addresses/capabilities
class RoutingServer {
  route(data, destination): void {
    /* ... */
  }
  routeByCapability(data, cap): void {
    /* ... */
  }
}

// DiscoveryServer: Helps servers find each other
class DiscoveryServer {
  announce(capabilities): void {
    /* ... */
  }
  discover(query): Server[] {
    /* ... */
  }
}
```

**They work together:**

```typescript
// RoutingServer queries StateManager to find destinations
const servers = stateManager.findByCapability('gpu');
router.routeTo(data, servers[0].id);

// DiscoveryServer uses StateManager to announce capabilities
const caps = stateManager.getTopology().servers.flatMap((s) => s.capabilities);
discovery.announce(caps);
```

## Example: Complete System with StateManager

```typescript
// Create kernel (mechanism)
const kernel = new Kernel();

// Create StateManager (policy/tracking)
const state = new StateManager(kernel);

// Create servers
const keyboard = new KeyboardInput(kernel);
const pty = new PTY(kernel);
const parser = new ANSIParser(kernel);
const screen = new ScreenRenderer(kernel);

// Register with StateManager
state.register(keyboard, {
  id: 'keyboard-1',
  capabilities: ['input', 'keyboard'],
  humanReadable: 'Primary keyboard input',
});

state.register(pty, {
  id: 'pty-1',
  capabilities: ['pty', 'terminal'],
  humanReadable: 'Bash shell PTY',
});

state.register(parser, {
  id: 'parser-1',
  capabilities: ['parse', 'ansi'],
  humanReadable: 'ANSI escape code parser',
});

state.register(screen, {
  id: 'screen-1',
  capabilities: ['render', 'screen'],
  humanReadable: 'Screen renderer (xterm.js)',
});

// Wire up using StateManager
state.connect('keyboard-1.output', 'pty-1.input');
state.connect('pty-1.output', 'parser-1.input');
state.split('parser-1.output', ['screen-1.input', 'ai-formatter-1.input']);

// Export topology for visualization
console.log(state.exportMermaid());
// Output:
// graph LR
//   keyboard-1["Primary keyboard input"]
//   pty-1["Bash shell PTY"]
//   parser-1["ANSI escape code parser"]
//   screen-1["Screen renderer (xterm.js)"]
//   keyboard-1.output --> pty-1.input
//   pty-1.output --> parser-1.input
//   parser-1.output --> screen-1.input
//   parser-1.output --> ai-formatter-1.input

// Monitor flow
state.monitorPipe('pty-1.output');
setInterval(() => {
  const metrics = state.getMetrics('pty-1.output');
  console.log(`PTY output: ${metrics.bytesPerSecond} bytes/sec`);
}, 1000);
```

## Testing & Validation

StateManager makes the system testable:

```typescript
describe('Topology Validation', () => {
  it('validates wiring config', () => {
    const config = loadWiringConfig('wiring.yaml');
    const validator = new WiringValidator();
    const result = validator.validate(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('detects cycles', () => {
    const config = {
      servers: [
        { id: 'a', type: 'ServerA' },
        { id: 'b', type: 'ServerB' },
      ],
      connections: [
        { from: 'a.output', to: 'b.input' },
        { from: 'b.output', to: 'a.input' }, // Cycle!
      ],
    };

    const validator = new WiringValidator();
    const result = validator.validate(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Topology contains cycles');
  });
});

describe('StateManager Runtime', () => {
  it('tracks connections', () => {
    const kernel = new Kernel();
    const state = new StateManager(kernel);

    const p1 = kernel.createPipe();
    const p2 = kernel.createPipe();

    state.registerPipe(p1, { id: 'p1', serverId: 's1', direction: 'output' });
    state.registerPipe(p2, { id: 'p2', serverId: 's2', direction: 'input' });

    kernel.connect(p1, p2);
    state.registerConnection('p1', ['p2']);

    const topology = state.getTopology();
    expect(topology.connections).toHaveLength(1);
    expect(topology.connections[0].from).toBe('p1');
    expect(topology.connections[0].to).toEqual(['p2']);
  });
});
```

## Summary

**StateManager/ControlPlane is:**

- ✅ A server built on top of the kernel
- ✅ The "HMI control room" for your pipe topology
- ✅ Supports both compile-time (static) and runtime (dynamic) wiring
- ✅ Provides introspection, control, visualization, and monitoring
- ✅ Tracks all pipes, connections, servers, flow metrics, and addresses
- ✅ Enables other servers (routing, discovery) to query/modify topology
- ✅ Validates wiring configs at compile time
- ✅ Testable and swappable (different StateManager implementations possible)

**StateManager is NOT:**

- ❌ Part of the kernel itself
- ❌ A routing server (that's separate)
- ❌ A discovery server (that's separate)
- ❌ Required (kernel works fine without it)

**The kernel remains ~100 lines. StateManager is policy on top of mechanism.**
