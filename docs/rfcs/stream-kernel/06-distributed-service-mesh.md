# Distributed Service Mesh

The stream kernel supports distributed service mesh architectures where servers span multiple machines with automatic service discovery and routing.

**Key insight:** Routing is just another server! The kernel doesn't know about routing.

## The "Terminal" Concept

Think of a routing server as an **airport** with **terminals** (connection points).

```
┌─────────────────────────────────────────────────┐
│  Machine A (Routing Server = "Airport")        │
│  ┌───────────────────────────────────────────┐ │
│  │  Terminal 1 ← local PTY server            │ │
│  │  Terminal 2 ← network (to Machine B)      │ │
│  │  Terminal 3 ← network (to Machine C)      │ │
│  │  Terminal 4 ← local MP4 server            │ │
│  │                                           │ │
│  │  Routing Table:                           │ │
│  │  - parser-server → Machine B, Terminal 2  │ │
│  │  - gpu-server    → Machine C, Terminal 3  │ │
│  │  - mp4-server    → local, Terminal 4      │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Terminals** are connection points:

- **Local:** Connect to servers in same process/machine
- **Network:** Connect to remote machines via TCP/WebSocket
- **Loopback:** For testing or hairpin scenarios

**The routing server is just a module!** The kernel provides pipes; routing server uses them.

## Routing Server Implementation

```typescript
interface Terminal {
  name: string;
  type: 'local' | 'network' | 'loopback';
  inputPipe: Pipe;
  outputPipe: Pipe;
  remoteAddress?: string;
}

interface Route {
  serviceName: string;
  terminal: string;
  machineId?: string;
  hops: number;
}

interface Envelope {
  source: string;
  destination: string;
  replyTo?: string;
  data: any;
}

class RoutingServer {
  private kernel: Kernel;
  private terminals = new Map<string, Terminal>();
  private routes = new Map<string, Route>();
  private machineId: string;

  constructor(kernel: Kernel, machineId: string) {
    this.kernel = kernel;
    this.machineId = machineId;

    kernel.register(
      'router',
      {
        type: 'routing',
        features: ['service-discovery', 'multi-hop'],
      },
      kernel.createPipe(),
    );
  }

  /**
   * Create a terminal (connection point)
   */
  createTerminal(name: string, type: 'local' | 'network' | 'loopback', address?: string): Terminal {
    const terminal: Terminal = {
      name,
      type,
      inputPipe: this.kernel.createPipe(),
      outputPipe: this.kernel.createPipe(),
      remoteAddress: address,
    };

    terminal.inputPipe.on('data', (envelope: Envelope) => {
      this.route(envelope, terminal);
    });

    this.terminals.set(name, terminal);
    return terminal;
  }

  /**
   * Route data from source terminal to destination
   */
  private route(envelope: Envelope, fromTerminal: Terminal): void {
    const route = this.routes.get(envelope.destination);

    if (!route) {
      console.error(`[Router] No route to ${envelope.destination}`);
      return;
    }

    const destTerminal = this.terminals.get(route.terminal);

    if (!destTerminal) {
      console.error(`[Router] Terminal ${route.terminal} not found`);
      return;
    }

    console.log(`[Router] ${fromTerminal.name} → ${destTerminal.name} (${envelope.destination})`);
    destTerminal.outputPipe.write(envelope);
  }

  /**
   * Add a route (service discovery result)
   */
  addRoute(serviceName: string, terminal: string, machineId?: string, hops: number = 0): void {
    this.routes.set(serviceName, {
      serviceName,
      terminal,
      machineId,
      hops,
    });

    console.log(`[Router] Route added: ${serviceName} → ${terminal} (${hops} hops)`);
  }

  /**
   * Announce local services (for service discovery)
   */
  getLocalServices(): string[] {
    const services: string[] = [];

    for (const [name, { caps }] of this.kernel.lookup({})) {
      if (caps.type !== 'routing') {
        services.push(name);
      }
    }

    return services;
  }

  /**
   * Get all known routes (for re-broadcasting)
   */
  getKnownRoutes(): Route[] {
    return Array.from(this.routes.values());
  }
}
```

## Multi-Machine Example: GPU Processing

**Scenario:** PTY on Machine A needs GPU processing on Machine C, then display result back on Machine A.

### The Flow (Hairpin/Loopback)

```
Machine A (no GPU)          Machine C (has GPU)
┌──────────────────┐        ┌──────────────────┐
│  PTY Server      │        │  GPU Server      │
│      ↓           │        │      ↑           │
│  Router          │        │  Router          │
│  Terminal-C ─────┼────────┼──→ Terminal-A    │
│    (send)        │  net   │    (recv)        │
│      ↑           │        │      ↓           │
│  Terminal-C ←────┼────────┼─── Terminal-A    │
│    (recv)        │  net   │    (send)        │
│      ↓           │        └──────────────────┘
│  MP4 Encoder     │
└──────────────────┘
```

**Steps:**

1. PTY on Machine A generates frame data
2. Router on A sees `destination: "gpu-server"`
3. Router looks up route: `"gpu-server" → Terminal-C (network to Machine C)`
4. Sends envelope to Machine C via network
5. Router on C receives at Terminal-A (from Machine A)
6. Router on C routes to local `gpu-server`
7. GPU server processes the frame
8. GPU server sends result with `replyTo: "mp4-encoder@machine-a"`
9. Router on C sees `destination: "mp4-encoder@machine-a"`
10. Router on C sends back via Terminal-A (network to Machine A)
11. Router on A receives at Terminal-C (from Machine C)
12. Router on A routes to local `mp4-encoder`
13. MP4 encoder gets GPU-processed frame!

### Code Example

**Machine A:**

```typescript
const kernel = new Kernel();
const router = new RoutingServer(kernel, 'machine-a');

// Local services
const pty = new PTY(kernel);
const mp4 = new MP4Encoder(kernel);

// Register local services
kernel.register('pty-server', { type: 'source' }, pty.output);
kernel.register('mp4-encoder', { type: 'output' }, mp4.input);

// Terminal to Machine C
const terminalC = router.createTerminal('to-machine-c', 'network', '10.0.0.3:9001');

// Add route: gpu-server is on Machine C
router.addRoute('gpu-server', 'to-machine-c', 'machine-c', 1);

// PTY generates frame
const frame = pty.captureFrame();

// Wrap in envelope
const envelope = {
  source: 'pty-server@machine-a',
  destination: 'gpu-server',
  replyTo: 'mp4-encoder@machine-a',
  data: frame,
};

// Send to router
router.route(envelope);
```

**Machine C:**

```typescript
const kernelC = new Kernel();
const routerC = new RoutingServer(kernelC, 'machine-c');

// Local GPU service
const gpu = new GPUProcessor(kernelC);

// Register GPU service
kernelC.register('gpu-server', { type: 'transform' }, gpu.input);

// Terminal from Machine A
const terminalA = routerC.createTerminal('from-machine-a', 'network');

// GPU server processes and replies
gpu.input.on('data', (envelope) => {
  const processed = gpu.processOnGPU(envelope.data);

  const reply = {
    source: 'gpu-server@machine-c',
    destination: envelope.replyTo, // "mp4-encoder@machine-a"
    data: processed,
  };

  routerC.route(reply);
});
```

**Result:** Seamless remote GPU processing with local display!

## Service Discovery

How do machines find each other?

### Approach 1: Broadcast Announcements (Mesh Network)

Machines periodically broadcast their services:

```typescript
class RoutingServer {
  startHeartbeat(interval: number = 5000): void {
    setInterval(() => {
      this.announceServices();
    }, interval);
  }

  private announceServices(): void {
    const announcement = {
      type: 'service-announcement',
      machineId: this.machineId,
      services: this.getLocalServices(),
      routes: this.getKnownRoutes(),
      hops: 0,
    };

    this.broadcastToNetwork(announcement);
  }

  onAnnouncementReceived(announcement: any, fromTerminal: Terminal): void {
    // Learn about services on announcing machine
    for (const service of announcement.services) {
      this.addRoute(service, fromTerminal.name, announcement.machineId, announcement.hops + 1);
    }

    // Learn about multi-hop routes
    for (const route of announcement.routes) {
      const newHops = route.hops + 1;
      const existing = this.routes.get(route.serviceName);

      // Only add if closer route
      if (!existing || newHops < existing.hops) {
        this.addRoute(route.serviceName, fromTerminal.name, route.machineId, newHops);
      }
    }
  }

  private broadcastToNetwork(announcement: any): void {
    for (const [name, terminal] of this.terminals) {
      if (terminal.type === 'network') {
        terminal.outputPipe.write(announcement);
      }
    }
  }
}
```

**Result:** Automatic mesh network with route learning!

**After announcements propagate:**

**Machine A knows:**

- `pty-server` (local, 0 hops)
- `parser-server` (via B, 1 hop)
- `gpu-server` (via C, 1 hop)
- `mp4-server` (local, 0 hops)

**Machine B knows:**

- `parser-server` (local, 0 hops)
- `pty-server` (via A, 1 hop)
- `gpu-server` (via C, 1 hop)
- `gpu-server` (via A→C, 2 hops) ← Alternative route!

**Machine C knows:**

- `gpu-server` (local, 0 hops)
- `pty-server` (via A, 1 hop)
- `parser-server` (via B, 1 hop)

### Approach 2: Central Registry (Simpler)

```typescript
class RegistryServer {
  private services = new Map<string, ServiceLocation>();

  register(service: string, machineId: string, address: string): void {
    this.services.set(service, { machineId, address });
    this.notifySubscribers(service);
  }

  lookup(service: string): ServiceLocation | null {
    return this.services.get(service) || null;
  }

  subscribe(service: string, callback: (location: ServiceLocation) => void): void {
    // Notify when service becomes available
  }
}

// Each machine queries registry on startup
const location = await registryServer.lookup('gpu-server');
if (location) {
  router.addRoute('gpu-server', location.machineId, location.address);
}
```

## Configuration-Driven Topology

Define machine topology in YAML:

```yaml
# deployment.yml
machines:
  machine-a:
    services:
      - pty-server
      - display-server
      - mp4-encoder
    terminals:
      - name: to-machine-b
        type: network
        address: 10.0.0.2:9001
      - name: to-machine-c
        type: network
        address: 10.0.0.3:9001

  machine-b:
    services:
      - parser-server
    terminals:
      - name: to-machine-a
        type: network
        address: 10.0.0.1:9001
      - name: to-machine-c
        type: network
        address: 10.0.0.3:9002

  machine-c:
    services:
      - gpu-server
      - encoder-server
    terminals:
      - name: to-machine-a
        type: network
        address: 10.0.0.1:9002
      - name: to-machine-b
        type: network
        address: 10.0.0.2:9002
# Service discovery is automatic!
```

Load configuration:

```typescript
const config = loadYAML('deployment.yml');
const machineConfig = config.machines['machine-a'];

const kernel = new Kernel();
const router = new RoutingServer(kernel, 'machine-a');

// Create terminals from config
for (const terminalConfig of machineConfig.terminals) {
  router.createTerminal(terminalConfig.name, terminalConfig.type, terminalConfig.address);
}

// Start service discovery
router.startHeartbeat();
```

## Real-World Inspirations

### Plan 9's Distributed Filesystem

```
/net/tcp!server!9001/data  ← Network connection as a file
```

Exactly like our terminals! Plan 9 called them "network dialers."

### QNX Neutrino's Network IPC

```c
fd = open("/net/machine2/dev/serial1", O_RDWR);
// Automatically routed to machine2
```

### Erlang's Distributed Processes

```erlang
% Send message to process on any node
{gpu_server, 'machine_c@cluster'} ! {process_frame, Frame}
% Erlang runtime routes automatically
```

### Kubernetes Service Mesh

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gpu-server
spec:
  selector:
    app: gpu
  ports:
    - port: 9001
# K8s routes to any pod with label app=gpu
```

## Our Advantages

✅ **Configuration-driven** - Same code, different topology  
✅ **Kernel agnostic** - Routing is just another server!  
✅ **Transport agnostic** - Unix sockets, TCP, WebSocket  
✅ **Automatic discovery** - Service mesh finds routes  
✅ **Location transparency** - Servers don't know where peers are  
✅ **Multi-hop routing** - Data flows through multiple machines  
✅ **Hairpin/loopback** - Remote processing, local return

**The routing server is policy, not mechanism.** The kernel provides pipes; routing server implements distributed routing as a module.

## Next Steps

See:

- **[Deployment Flexibility](05-deployment-flexibility.md)** - Single → multi → distributed progression
- **[Service Registry](07-service-registry.md)** - Capability-based discovery
- **[PTY Use Cases](04-pty-use-cases.md)** - Example: Remote GPU processing
