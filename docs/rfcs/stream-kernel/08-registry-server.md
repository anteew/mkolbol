# Registry Server (The Hostess)

## Overview

The **Registry Server** (affectionately called "The Hostess") is a server that maintains the "guest book" of all servers in the system. It tracks server identities, capabilities, port availability, and provides discovery interfaces for both local and remote systems.

**Key insight:** The Hostess is **a server, not kernel code**. She sits alongside other servers and provides registry/discovery services through standard pipe interfaces.

## The Metaphor

Imagine a sophisticated dinner party:

- **Servers are guests** - They arrive and sign the guest book
- **The Hostess** - Greets guests, tracks who's here, manages seating (port assignments)
- **The StateManager** - Plans the seating chart and conversation flow (connection topology)
- **The Routing Server** - Ensures conversations reach the right guests (message routing)

The Hostess knows **who is here** and **what they can do**.  
The StateManager knows **how they should be connected**.  
The Routing Server knows **how to deliver messages**.

Three different servers, three different concerns.

## Two Workflows

### Workflow 1: Dynamic Multi-Machine Mesh

**Scenario:** User ships system as single binary with enough capability baked in so mesh would work. Second system on another machine does the same. User decides "I want each system to know about capabilities of the other system."

**Flow:**

1. System A boots, servers register with local Hostess A
2. System B boots, servers register with local Hostess B
3. Hostess A exposes registry via HTTP/LLDP interface
4. Hostess B discovers Hostess A (and vice versa)
5. Each StateManager queries local Hostess for remote capabilities
6. StateManagers establish cross-machine connections as needed

### Workflow 2: Static Compile-Time Wiring

**Scenario:** User ships single system, plans it to be static, needs way to tell kernel how to "wire" things up at startup.

**Flow:**

1. Compile-time manifest defines: server names, terminals, flow direction
2. Manifest compiled into each server binary
3. Servers boot and register with Hostess using compiled manifest data
4. StateManager reads wiring config (YAML/JSON)
5. StateManager queries Hostess: "Give me 4 servers of type XYZ"
6. Hostess returns server IDs that match the filter
7. StateManager creates connections according to wiring config
8. StateManager reports connectome back to Hostess

## Server Naming Convention

Each server is identified by a structured name in the guest book:

```
fqdn:servername:hexcode:owner:authentication:auth_mechanism:UUID
```

### Field Breakdown

| Field            | Description                                          | Example                                               |
| ---------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| `fqdn`           | Fully qualified domain name or hostname              | `machine-a.local`, `192.168.1.100`, `localhost`       |
| `servername`     | Hurd-style server name (what it does)                | `pty-server`, `gpu-renderer`, `audio-out`             |
| `hexcode`        | Class of server (category/type)                      | `0x0001` (PTY), `0x0002` (Renderer), `0x0003` (Audio) |
| `owner`          | Owner identity (compile-time, changeable at runtime) | `user-alice`, `system`, `container-xyz`               |
| `authentication` | Whether auth is required                             | `yes`, `no`, `optional`                               |
| `auth_mechanism` | How to authenticate                                  | `preshared-secret`, `tls-cert`, `none`                |
| `UUID`           | Random unique identifier                             | `550e8400-e29b-41d4-a716-446655440000`                |

### Example Names

```
localhost:pty-server:0x0001:system:no:none:550e8400-e29b-41d4-a716-446655440000
machine-a.local:gpu-renderer:0x0002:alice:yes:preshared-secret:6ba7b810-9dad-11d1-80b4-00c04fd430c8
192.168.1.100:audio-out:0x0003:system:optional:tls-cert:6ba7b814-9dad-11d1-80b4-00c04fd430c8
```

### Why This Format?

- **Hierarchical:** Easy to filter/query by any field
- **Globally unique:** FQDN + UUID guarantees uniqueness across machines
- **Self-describing:** Name tells you what it is, who owns it, how to auth
- **Extensible:** Can add fields without breaking existing parsers

## Compile-Time Manifests

Each server includes a manifest compiled into its binary at build time:

### Manifest Schema

```typescript
interface ServerManifest {
  name: string; // Human-readable server name
  class: string; // Hex code (e.g., "0x0001")
  owner: string; // Owner identity
  authentication: {
    required: 'yes' | 'no' | 'optional';
    mechanism: string; // "preshared-secret", "tls-cert", "none"
  };
  terminals: Terminal[]; // Exposed connection points
  metadata: Record<string, any>; // Additional info
}

interface Terminal {
  name: string; // Terminal identifier (e.g., "input", "output")
  direction: 'input' | 'output' | 'bidirectional';
  multiplexing: 'none' | 'fanout' | 'fanin'; // Flow pattern
  protocol?: string; // Optional protocol hint (e.g., "json-rpc")
  metadata?: Record<string, any>;
}
```

### Example Manifest

```typescript
// PTY Server Manifest (compiled into binary)
const manifest: ServerManifest = {
  name: 'pty-server',
  class: '0x0001',
  owner: 'system',
  authentication: {
    required: 'no',
    mechanism: 'none',
  },
  terminals: [
    {
      name: 'stdin',
      direction: 'input',
      multiplexing: 'none',
      protocol: 'raw-bytes',
    },
    {
      name: 'stdout',
      direction: 'output',
      multiplexing: 'fanout', // Can send to multiple renderers
      protocol: 'ansi-escape',
    },
    {
      name: 'stderr',
      direction: 'output',
      multiplexing: 'fanout',
      protocol: 'ansi-escape',
    },
  ],
  metadata: {
    version: '1.0.0',
    description: 'PTY server for terminal emulation',
  },
};
```

## The Guest Book

When a server starts, it registers with the Hostess by signing the guest book:

### Guest Book Entry Schema

```typescript
interface GuestBookEntry {
  // Identity
  id: string; // Full name (fqdn:servername:hex:owner:auth:mechanism:UUID)
  fqdn: string;
  servername: string;
  class: string;
  owner: string;
  uuid: string;

  // Authentication
  authentication: {
    required: 'yes' | 'no' | 'optional';
    mechanism: string;
  };

  // Terminals (connection points)
  terminals: {
    [terminalName: string]: {
      direction: 'input' | 'output' | 'bidirectional';
      multiplexing: 'none' | 'fanout' | 'fanin';
      inUse: boolean; // Track availability
      connectedTo?: string[]; // Connectome IDs (from StateManager)
      metadata: Record<string, any>;
    };
  };

  // Metadata
  registeredAt: number; // Timestamp
  lastHeartbeat: number; // For liveness checking
  metadata: Record<string, any>;

  // Capabilities (what this server can do)
  capabilities: string[]; // e.g., ["pty", "ansi-parsing", "vt100"]
}
```

### Registration Flow

```typescript
// Server registers itself on startup
class PTYServer {
  async start() {
    // Generate UUID
    const uuid = crypto.randomUUID();

    // Build full name
    const hostname = os.hostname();
    const fullName = `${hostname}:pty-server:0x0001:system:no:none:${uuid}`;

    // Register with Hostess
    await hostess.register({
      id: fullName,
      fqdn: hostname,
      servername: 'pty-server',
      class: '0x0001',
      owner: 'system',
      uuid: uuid,
      authentication: {
        required: 'no',
        mechanism: 'none',
      },
      terminals: {
        stdin: {
          direction: 'input',
          multiplexing: 'none',
          inUse: false,
          metadata: { protocol: 'raw-bytes' },
        },
        stdout: {
          direction: 'output',
          multiplexing: 'fanout',
          inUse: false,
          metadata: { protocol: 'ansi-escape' },
        },
      },
      capabilities: ['pty', 'vt100', 'ansi-parsing'],
      metadata: { version: '1.0.0' },
    });

    // Start heartbeat
    setInterval(() => hostess.heartbeat(fullName), 5000);
  }
}
```

## Hostess API

The Hostess exposes a simple API via her input/output terminals:

### Query Interface

```typescript
interface HostessAPI {
  // Register a server
  register(entry: GuestBookEntry): Promise<void>;

  // Unregister a server
  unregister(serverId: string): Promise<void>;

  // Query servers by filter
  query(filter: ServerFilter): Promise<GuestBookEntry[]>;

  // Mark terminal as in use
  markInUse(serverId: string, terminalName: string, connectomeId: string): Promise<void>;

  // Mark terminal as available
  markAvailable(serverId: string, terminalName: string): Promise<void>;

  // Get specific server details
  getServer(serverId: string): Promise<GuestBookEntry | null>;

  // Heartbeat (liveness check)
  heartbeat(serverId: string): Promise<void>;

  // List all registered servers
  listAll(): Promise<GuestBookEntry[]>;
}

interface ServerFilter {
  fqdn?: string; // Filter by hostname
  servername?: string; // Filter by server name
  class?: string; // Filter by hex class
  owner?: string; // Filter by owner
  capabilities?: string[]; // Must have ALL these capabilities
  availableTerminals?: number; // Must have N available terminals
}
```

### Example Usage by StateManager

```typescript
// StateManager needs 4 GPU renderers for wiring plan
class StateManager {
  async executeWiringPlan(plan: WiringPlan) {
    // Query Hostess for available GPU renderers
    const gpuServers = await hostess.query({
      class: '0x0002', // GPU renderer class
      capabilities: ['gpu', 'h264'],
      availableTerminals: 1, // Need at least 1 free terminal
    });

    if (gpuServers.length < 4) {
      throw new Error('Insufficient GPU servers available');
    }

    // Take first 4 servers
    const selected = gpuServers.slice(0, 4);

    // Create connections
    for (const server of selected) {
      const connection = await this.createConnection(plan.source, server.id, 'input');

      // Report back to Hostess
      await hostess.markInUse(server.id, 'input', connection.connectomeId);
    }
  }
}
```

## Separation of Concerns

### Hostess vs StateManager

| Concern              | Hostess                                | StateManager                      |
| -------------------- | -------------------------------------- | --------------------------------- |
| **Purpose**          | Registry & availability tracking       | Connection topology & wiring      |
| **Tracks**           | What servers exist, their capabilities | How servers are connected         |
| **Source of truth**  | Server registry, port availability     | Connection graph (connectome)     |
| **Queries**          | "Give me 4 GPU servers"                | "What's connected to PTY output?" |
| **Responsibilities** | Registration, heartbeat, liveness      | Wiring, flow control, topology    |

### The Conversation

```
StateManager: "Hey Hostess, I need 4 servers of type 0x0002 (GPU renderer)."

Hostess: "I have 6 registered. Here are their IDs:
  - machine-a.local:gpu-renderer:0x0002:alice:yes:psk:uuid1
  - machine-a.local:gpu-renderer:0x0002:alice:yes:psk:uuid2
  - machine-b.local:gpu-renderer:0x0002:bob:no:none:uuid3
  - machine-b.local:gpu-renderer:0x0002:bob:no:none:uuid4
  - machine-c.local:gpu-renderer:0x0002:system:yes:psk:uuid5
  - machine-c.local:gpu-renderer:0x0002:system:yes:psk:uuid6"

StateManager: "Perfect. I'll use the first 4. Here are the connectome IDs
               for their input terminals:
  - uuid1.input → connectome-id-100
  - uuid2.input → connectome-id-101
  - uuid3.input → connectome-id-102
  - uuid4.input → connectome-id-103"

Hostess: "Got it. I've marked those terminals as in use and recorded the
          connectome mappings."
```

**Key insight:** StateManager is the source of truth for **connections**. Hostess is the source of truth for **availability**.

## LLDP-Inspired Discovery

The Hostess can expose her guest book via multiple interfaces for mesh networking:

### Discovery Interfaces

```typescript
class Hostess {
  // Local pipe interface (default)
  inputPipe: Pipe; // Receives commands
  outputPipe: Pipe; // Sends responses

  // Optional: HTTP interface for remote discovery
  httpInterface?: HTTPInterface;

  // Optional: Shared memory interface for same-machine IPC
  shmemInterface?: SharedMemoryInterface;

  // Optional: LLDP-style broadcast announcements
  lldpInterface?: LLDPInterface;
}
```

### HTTP Discovery Interface

Expose guest book over HTTP for remote systems:

```typescript
// HTTP interface for Hostess
class HTTPInterface {
  constructor(private hostess: Hostess) {}

  start(port: number) {
    const app = express();

    // GET /servers - List all servers
    app.get('/servers', async (req, res) => {
      const servers = await this.hostess.listAll();
      res.json(servers);
    });

    // GET /servers/:id - Get specific server
    app.get('/servers/:id', async (req, res) => {
      const server = await this.hostess.getServer(req.params.id);
      res.json(server || { error: 'Not found' });
    });

    // POST /query - Query with filter
    app.post('/query', async (req, res) => {
      const results = await this.hostess.query(req.body);
      res.json(results);
    });

    // POST /register - Remote registration
    app.post('/register', async (req, res) => {
      await this.hostess.register(req.body);
      res.json({ success: true });
    });

    app.listen(port);
  }
}
```

### LLDP-Style Broadcast Announcements

Inspired by LLDP (Link Layer Discovery Protocol), the Hostess can broadcast periodic announcements about registered servers:

```typescript
class LLDPInterface {
  constructor(private hostess: Hostess) {}

  startBroadcast(intervalMs: number = 30000) {
    setInterval(async () => {
      const servers = await this.hostess.listAll();

      // Broadcast announcement packet
      const announcement = {
        type: 'HOSTESS_ANNOUNCEMENT',
        timestamp: Date.now(),
        fqdn: os.hostname(),
        hostessId: this.hostess.id,
        serverCount: servers.length,
        capabilities: this.aggregateCapabilities(servers),
        endpoint: `http://${os.hostname()}:${this.port}/servers`,
      };

      // Send via UDP multicast or other broadcast mechanism
      this.broadcast(announcement);
    }, intervalMs);
  }

  private aggregateCapabilities(servers: GuestBookEntry[]): string[] {
    const caps = new Set<string>();
    for (const server of servers) {
      server.capabilities.forEach((c) => caps.add(c));
    }
    return Array.from(caps);
  }
}
```

### Discovery Example: Multi-Machine Mesh

```typescript
// Machine A
const hostessA = new Hostess();
hostessA.enableHTTP(8080);
hostessA.enableLLDP();

// Machine B
const hostessB = new Hostess();
hostessB.enableHTTP(8080);
hostessB.enableLLDP();

// Machine B discovers Machine A via LLDP
hostessB.on('discovery', async (announcement) => {
  console.log(`Discovered Hostess on ${announcement.fqdn}`);
  console.log(`Capabilities: ${announcement.capabilities.join(', ')}`);

  // Query remote Hostess for GPU servers
  const response = await fetch(`${announcement.endpoint}`, {
    method: 'POST',
    body: JSON.stringify({
      class: '0x0002', // GPU renderers
      capabilities: ['gpu', 'h264'],
    }),
  });

  const remoteGPUs = await response.json();
  console.log(`Found ${remoteGPUs.length} GPU servers on ${announcement.fqdn}`);
});
```

## Shared Memory Interface

For ultra-low-latency same-machine discovery:

```typescript
class SharedMemoryInterface {
  private shmem: SharedMemoryBuffer;

  constructor(private hostess: Hostess) {
    // Create shared memory region
    this.shmem = new SharedMemoryBuffer('/hostess-registry', 1024 * 1024); // 1MB
  }

  async sync() {
    const servers = await this.hostess.listAll();

    // Serialize to shared memory
    const data = msgpack.encode(servers);
    this.shmem.write(data);
  }

  // Other processes can read directly from shared memory
  // without network overhead
}
```

## Building an Information Mesh

By exposing the Hostess via multiple interfaces, you create an **information mesh**:

```
┌─────────────────────────────────────────────────────────────┐
│                       Information Mesh                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Machine A                    Machine B                      │
│  ┌─────────────┐             ┌─────────────┐                │
│  │  Hostess A  │◄───HTTP────►│  Hostess B  │                │
│  │  (Registry) │             │  (Registry) │                │
│  └──────┬──────┘             └──────┬──────┘                │
│         │                           │                        │
│         │ Shared Memory             │ LLDP Broadcast         │
│         ▼                           ▼                        │
│  ┌─────────────┐             ┌─────────────┐                │
│  │   Local     │             │   Local     │                │
│  │   Servers   │             │   Servers   │                │
│  └─────────────┘             └─────────────┘                │
│                                                               │
│  Any server on Machine A can discover and connect to         │
│  any server on Machine B through the information mesh        │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of Information Mesh

1. **Automatic Discovery** - Servers find each other without manual configuration
2. **Location Transparency** - Don't need to know which machine has a capability
3. **Fault Tolerance** - If one Hostess fails, others continue
4. **Scalability** - Add machines without reconfiguring existing ones
5. **Multi-Protocol** - HTTP for remote, shared memory for local, LLDP for broadcast

## Implementation Notes

### The Hostess is Just a Server

```typescript
// Hostess implementation (simplified)
class Hostess {
  private guestBook: Map<string, GuestBookEntry> = new Map();

  inputPipe: Pipe;
  outputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe();
    this.outputPipe = kernel.createPipe();

    // Listen for commands on input pipe
    this.inputPipe.on('data', (msg) => this.handleCommand(msg));
  }

  async handleCommand(msg: any) {
    switch (msg.command) {
      case 'register':
        await this.register(msg.entry);
        this.outputPipe.write({ success: true });
        break;

      case 'query':
        const results = await this.query(msg.filter);
        this.outputPipe.write({ results });
        break;

      case 'markInUse':
        await this.markInUse(msg.serverId, msg.terminal, msg.connectomeId);
        this.outputPipe.write({ success: true });
        break;
    }
  }

  async query(filter: ServerFilter): Promise<GuestBookEntry[]> {
    const entries = Array.from(this.guestBook.values());

    return entries.filter((entry) => {
      if (filter.fqdn && entry.fqdn !== filter.fqdn) return false;
      if (filter.class && entry.class !== filter.class) return false;
      if (filter.capabilities) {
        const hasAll = filter.capabilities.every((c) => entry.capabilities.includes(c));
        if (!hasAll) return false;
      }
      if (filter.availableTerminals !== undefined) {
        const available = Object.values(entry.terminals).filter((t) => !t.inUse).length;
        if (available < filter.availableTerminals) return false;
      }
      return true;
    });
  }

  async markInUse(serverId: string, terminalName: string, connectomeId: string) {
    const entry = this.guestBook.get(serverId);
    if (!entry) throw new Error(`Server ${serverId} not found`);

    const terminal = entry.terminals[terminalName];
    if (!terminal) throw new Error(`Terminal ${terminalName} not found`);

    terminal.inUse = true;
    terminal.connectedTo = terminal.connectedTo || [];
    terminal.connectedTo.push(connectomeId);
  }
}
```

**Key insight:** The Hostess uses the **same kernel primitives** as any other server. She's not special kernel code - she's just a well-known server that provides registry services.

## Wiring It All Together

### Example: Complete System Bootstrap

```typescript
// 1. Kernel starts (just pipes and connections)
const kernel = new Kernel();

// 2. Start the Hostess (registry server)
const hostess = new Hostess(kernel);
hostess.enableHTTP(8080);
hostess.enableLLDP();

// 3. Start the StateManager (topology server)
const stateManager = new StateManager(kernel, hostess);

// 4. Load wiring config
const wiringConfig = loadYAML('./wiring.yaml');

// 5. Start application servers
const ptyServer = new PTYServer();
await ptyServer.start(); // Registers with Hostess

const gpuRenderer1 = new GPURenderer();
await gpuRenderer1.start(); // Registers with Hostess

const gpuRenderer2 = new GPURenderer();
await gpuRenderer2.start(); // Registers with Hostess

// 6. Execute wiring plan
await stateManager.executeWiringPlan(wiringConfig);

// Now everything is wired up and running!
```

### Example Wiring Config (YAML)

```yaml
# wiring.yaml - Compile-time wiring specification
version: '1.0'

connections:
  # PTY stdout → 2 GPU renderers (fanout)
  - source:
      server: '*.pty-server.*' # Glob pattern
      terminal: 'stdout'
    targets:
      - server: '*.gpu-renderer.*:1' # First GPU renderer
        terminal: 'input'
      - server: '*.gpu-renderer.*:2' # Second GPU renderer
        terminal: 'input'

  # GPU outputs → MP4 encoder (fanin)
  - source:
      servers:
        - '*.gpu-renderer.*:1'
        - '*.gpu-renderer.*:2'
      terminal: 'output'
    target:
      server: '*.mp4-encoder.*'
      terminal: 'input'
      mode: 'merge' # Combine multiple inputs

validation:
  # Ensure these server types exist before wiring
  required_servers:
    - class: '0x0001' # PTY
      count: 1
    - class: '0x0002' # GPU renderer
      count: 2
    - class: '0x0005' # MP4 encoder
      count: 1
```

## Compile-Time Validation

Before building the system, validate the wiring config:

```typescript
class WiringValidator {
  async validate(config: WiringConfig, manifests: ServerManifest[]) {
    // Check all required servers are defined
    for (const req of config.validation.required_servers) {
      const matching = manifests.filter((m) => m.class === req.class);
      if (matching.length < req.count) {
        throw new Error(
          `Wiring config requires ${req.count} servers of class ${req.class}, ` +
            `but only ${matching.length} are defined`,
        );
      }
    }

    // Check all connections are valid
    for (const conn of config.connections) {
      // Validate source terminals exist
      // Validate target terminals exist
      // Validate flow directions match
      // etc.
    }

    return { valid: true };
  }
}
```

## Reservations Interface

The Hostess doesn't just track who's here - she also accepts "reservations" for server capabilities, both locally and remotely.

### The Restaurant Metaphor Extended

Imagine the Hostess running a restaurant:

**Local Walk-Ins (Local Reservations):**

- Local StateManager: "Hey, I need a table for 4 GPU renderers"
- Hostess: "Let me check... yes, I have 6 GPU servers available. Here are 4 for you."

**Remote Phone Calls (Remote Reservations via LLDP):**

- Remote Hostess B calls: "Hi! I've got a customer asking for shrimp scampi, but we specialize in Mexican food. I heard you have seafood capabilities?"
- Hostess A: "Yes! We have a GPURenderer with H264 encoding. I can open a pipe between us so your customers can access it."

**Inter-Restaurant Sharing:**

- Hostesses advertise their "menu" (server capabilities) to other Hostesses
- Remote systems discover what's available without manual configuration
- Cross-machine capability sharing becomes automatic

### Reservations API

The Hostess exposes a reservations interface that handles both local and remote requests:

```typescript
interface ReservationsAPI {
  // Local reservation (walk-in)
  reserveLocal(request: ReservationRequest): Promise<Reservation>;

  // Remote reservation (via LLDP/HTTP)
  reserveRemote(request: RemoteReservationRequest): Promise<Reservation>;

  // Query available capabilities (for remote Hostesses)
  queryCapabilities(filter: CapabilityFilter): Promise<CapabilityAdvertisement>;

  // Cancel reservation
  cancelReservation(reservationId: string): Promise<void>;

  // List active reservations
  listReservations(): Promise<Reservation[]>;
}

interface ReservationRequest {
  requestedBy: string; // Who's making the reservation
  serverFilter: ServerFilter; // What kind of servers needed
  count: number; // How many servers
  duration?: number; // How long (ms), undefined = indefinite
  priority?: number; // Priority level (higher = more important)
}

interface RemoteReservationRequest extends ReservationRequest {
  remoteFqdn: string; // Which remote system is requesting
  connectionInfo: ConnectionInfo; // How to reach back to requester
}

interface Reservation {
  id: string; // Unique reservation ID
  servers: GuestBookEntry[]; // Reserved servers
  requestedBy: string;
  expiresAt?: number; // Timestamp when reservation expires
  status: 'active' | 'expired' | 'cancelled';
}
```

### Local Reservations (Walk-Ins)

Local StateManager or other servers can reserve capabilities:

```typescript
// StateManager needs GPU servers for wiring plan
class StateManager {
  async executeWiringPlan(plan: WiringPlan) {
    // Make a reservation
    const reservation = await hostess.reserveLocal({
      requestedBy: 'StateManager',
      serverFilter: {
        class: '0x0002', // GPU renderer
        capabilities: ['gpu', 'h264'],
        availableTerminals: 1,
      },
      count: 4,
      duration: 60000, // Hold for 60 seconds while wiring
      priority: 10,
    });

    // Use the reserved servers
    for (const server of reservation.servers) {
      await this.createConnection(plan.source, server.id, 'input');
    }

    // Reservation auto-released after duration or when cancelled
  }
}
```

### Remote Reservations (LLDP Phone Calls)

Remote Hostesses can request capabilities from other Hostesses:

```typescript
// Hostess B discovers Hostess A has GPU capabilities
class HostessB {
  async handleRemoteCapabilityNeed() {
    // Query remote Hostess A for GPU servers
    const response = await fetch('http://machine-a.local:8080/capabilities', {
      method: 'POST',
      body: JSON.stringify({
        class: '0x0002',
        capabilities: ['gpu', 'h264'],
      }),
    });

    const capabilities = await response.json();

    if (capabilities.available > 0) {
      // Make remote reservation
      const reservation = await fetch('http://machine-a.local:8080/reserve', {
        method: 'POST',
        body: JSON.stringify({
          requestedBy: 'HostessB@machine-b.local',
          remoteFqdn: 'machine-b.local',
          serverFilter: {
            class: '0x0002',
            capabilities: ['gpu', 'h264'],
          },
          count: 2,
          connectionInfo: {
            preferredMethods: ['websocket', 'tcp'],
            endpoint: 'ws://machine-b.local:9090',
          },
        }),
      });

      // Now can connect local servers to remote GPU servers
    }
  }
}
```

### Inter-Hostess Capability Sharing

Hostesses periodically advertise their capabilities to other Hostesses via LLDP:

```typescript
class LLDPInterface {
  startCapabilitySharing(intervalMs: number = 60000) {
    setInterval(async () => {
      const servers = await this.hostess.listAll();

      // Aggregate capabilities by class
      const capabilitiesByClass = this.aggregateByClass(servers);

      // Broadcast capability advertisement
      const advertisement = {
        type: 'CAPABILITY_ADVERTISEMENT',
        timestamp: Date.now(),
        fqdn: os.hostname(),
        hostessId: this.hostess.id,
        endpoint: `http://${os.hostname()}:${this.port}`,
        capabilities: capabilitiesByClass,
        connectionMethods: this.cachedConnectionMethods, // From probing
      };

      // Send to known peers or multicast
      this.broadcast(advertisement);
    }, intervalMs);
  }

  private aggregateByClass(servers: GuestBookEntry[]) {
    const byClass = new Map<
      string,
      {
        count: number;
        availableCount: number;
        capabilities: Set<string>;
      }
    >();

    for (const server of servers) {
      if (!byClass.has(server.class)) {
        byClass.set(server.class, {
          count: 0,
          availableCount: 0,
          capabilities: new Set(),
        });
      }

      const entry = byClass.get(server.class)!;
      entry.count++;

      // Check if server has available terminals
      const hasAvailable = Object.values(server.terminals).some((t) => !t.inUse);
      if (hasAvailable) entry.availableCount++;

      // Aggregate capabilities
      server.capabilities.forEach((c) => entry.capabilities.add(c));
    }

    return Array.from(byClass.entries()).map(([cls, info]) => ({
      class: cls,
      totalCount: info.count,
      availableCount: info.availableCount,
      capabilities: Array.from(info.capabilities),
    }));
  }
}
```

### Connection Probing and Caching

#### Why Self-Probing Doesn't Work

You **cannot probe yourself** to determine which connection methods work from the outside:

**The Firewall Problem:**

- Your machine might have firewall rules blocking certain ports/protocols
- From inside your machine, you can't tell if external machines can reach you
- Testing `localhost` or `127.0.0.1` tells you nothing about external connectivity
- NAT, firewalls, VPNs all affect what's reachable from outside

**The Solution:**
You need a **remote** system to probe **you**, while you run a **beacon** that reports success/failure back.

#### Executor/Probe/Beacon Architecture

Three separate servers work together to test connectivity:

**1. Executor Server (on target machine)**

- Spawns the Probe Server locally in a new process
- Provides instructions to the Probe
- Manages Probe lifecycle

**2. Beacon Server (on target machine)**

- Listens on unprivileged port range (e.g., 10000-65535)
- Skips ports already in use
- Responds to Probe connection attempts with authentication
- Collects and reports working connection methods
- Terminates Probe when complete

**3. Probe Server (spawned locally by Executor)**

- Tests all IP addresses on the target machine
- Scans across the port range
- Authenticates with Beacon using hash + passphrase
- Reports working connection points back to Beacon

**Key Insight:** The Probe is spawned **locally** (not remotely) because we're starting with same-machine testing to develop and prove the mechanisms. Future versions will support off-machine probing.

#### Hash-Based Authentication

The Probe and Beacon use hash-based authentication to prevent spoofing:

```typescript
interface ProbeInstructions {
  targetIpAddresses: string[]; // All IPs on this machine
  portRangeStart: number; // e.g., 10000
  portRangeEnd: number; // e.g., 65535
  probeHash: string; // Hash for probe to send
  expectedResponseHash: string; // What probe expects back
  passphrase: string; // Shared secret (known by probe only)
}

interface BeaconConfig {
  portRangeStart: number;
  portRangeEnd: number;
  beaconHash: string; // Different from probe hash
  passphrase: string; // Same passphrase as probe
}

// Authentication protocol
class Beacon {
  async handleProbeConnection(conn: Connection) {
    // 1. Receive hash from probe
    const probeHash = await conn.receive();

    // 2. Hash it with our passphrase
    const response = crypto
      .createHash('sha256')
      .update(probeHash + this.passphrase)
      .digest('hex');

    // 3. Send hashed response back
    await conn.send(response);

    // Probe will verify this matches its expectedResponseHash
  }
}

class Probe {
  async testConnection(ip: string, port: number) {
    try {
      const conn = await connect(ip, port);

      // 1. Send our hash to beacon
      await conn.send(this.probeHash);

      // 2. Receive hashed response
      const response = await conn.receive();

      // 3. Verify it matches expected (proves beacon has passphrase)
      if (response === this.expectedResponseHash) {
        return { success: true, ip, port, latency: conn.latency };
      } else {
        return { success: false, reason: 'auth_failed' };
      }
    } catch (err) {
      return { success: false, reason: err.message };
    }
  }
}
```

**Why different hashes?**

- Beacon has `beaconHash` and `passphrase`
- Probe has `probeHash` and `expectedResponseHash` (which equals `hash(probeHash + passphrase)`)
- This proves both sides know the passphrase without transmitting it
- Prevents replay attacks or spoofed beacons

#### Multi-IP/Port Testing Matrix

The Probe must test **all IP addresses** on the machine across the **full port range**:

```typescript
class Executor {
  async spawnProbe() {
    // Get all IP addresses on this machine
    const ipAddresses = this.getAllLocalIPs();
    // ['192.168.1.100', '10.0.0.5', '172.16.0.1', '127.0.0.1']

    // Start beacon server
    const beacon = new Beacon({
      portRangeStart: 10000,
      portRangeEnd: 65535,
      beaconHash: generateHash(),
      passphrase: generatePassphrase(),
    });
    await beacon.start();

    // Calculate expected response
    const probeHash = generateHash();
    const expectedResponseHash = crypto
      .createHash('sha256')
      .update(probeHash + beacon.passphrase)
      .digest('hex');

    // Spawn probe in separate process
    const probe = spawn('node', ['probe-server.js'], {
      env: {
        TARGET_IPS: ipAddresses.join(','),
        PORT_RANGE_START: '10000',
        PORT_RANGE_END: '65535',
        PROBE_HASH: probeHash,
        EXPECTED_RESPONSE_HASH: expectedResponseHash,
        PASSPHRASE: beacon.passphrase,
      },
    });

    // Wait for probe to complete
    await beacon.waitForCompletion();

    // Get results
    return beacon.getResults();
  }

  private getAllLocalIPs(): string[] {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      for (const addr of addrs || []) {
        if (addr.family === 'IPv4') {
          ips.push(addr.address);
        }
      }
    }

    return ips;
  }
}
```

#### Communication Protocol

The Probe and Beacon follow a specific communication protocol:

```typescript
class Probe {
  async run() {
    const ips = process.env.TARGET_IPS!.split(',');
    const portStart = parseInt(process.env.PORT_RANGE_START!);
    const portEnd = parseInt(process.env.PORT_RANGE_END!);

    let firstWorkingConnection: Connection | null = null;
    const results: ConnectionTestResult[] = [];

    // Test all IP/port combinations
    for (const ip of ips) {
      for (let port = portStart; port <= portEnd; port++) {
        const result = await this.testConnection(ip, port);
        results.push(result);

        // Save first working connection for reporting
        if (result.success && !firstWorkingConnection) {
          firstWorkingConnection = result.connection;
        }
      }
    }

    // Report all results to beacon on first working connection
    if (firstWorkingConnection) {
      await firstWorkingConnection.send({
        type: 'PROBE_RESULTS',
        results: results.filter((r) => r.success),
        testedMatrix: {
          ips,
          portRange: [portStart, portEnd],
          totalTests: results.length,
          successfulTests: results.filter((r) => r.success).length,
        },
      });

      // Signal completion
      await firstWorkingConnection.send({
        type: 'PROBE_COMPLETE',
      });

      // Wait for termination signal from beacon
      const terminationSignal = await firstWorkingConnection.receive();

      // Verify termination is authenticated
      const expectedTermination = crypto
        .createHash('sha256')
        .update('terminate' + process.env.PASSPHRASE!)
        .digest('hex');

      if (terminationSignal.hash === expectedTermination) {
        console.log('Authenticated termination received. Exiting.');
        process.exit(0);
      }
    } else {
      console.log('No working connections found. Exiting with error.');
      process.exit(1);
    }
  }
}

class Beacon {
  private results: ConnectionTestResult[] = [];
  private completionPromise: Promise<void>;

  async handleConnection(conn: Connection) {
    // Authenticate
    const authenticated = await this.authenticate(conn);
    if (!authenticated) {
      conn.close();
      return;
    }

    // Listen for messages
    while (true) {
      const msg = await conn.receive();

      if (msg.type === 'PROBE_RESULTS') {
        this.results = msg.results;
        console.log(`Received ${msg.results.length} working connections`);
        console.log(`Tested matrix: ${JSON.stringify(msg.testedMatrix)}`);
      }

      if (msg.type === 'PROBE_COMPLETE') {
        console.log('Probe signaled completion');

        // Send authenticated termination
        const terminationHash = crypto
          .createHash('sha256')
          .update('terminate' + this.passphrase)
          .digest('hex');

        await conn.send({
          type: 'TERMINATE',
          hash: terminationHash,
        });

        this.completionResolve();
        break;
      }
    }
  }

  async waitForCompletion(): Promise<void> {
    return this.completionPromise;
  }

  getResults(): ConnectionTestResult[] {
    return this.results;
  }
}
```

#### Example: Full Probe/Beacon Workflow

```typescript
// Machine A wants to know which connection methods work

// 1. Executor spawns Beacon
const executor = new Executor();
const beacon = await executor.startBeacon({
  portRange: [10000, 65535],
  passphrase: 'secret-xyz-123',
});

// 2. Executor spawns Probe with instructions
const probe = await executor.spawnProbe({
  targetIps: ['192.168.1.100', '10.0.0.5', '172.16.0.1'],
  portRange: [10000, 65535],
  beaconPassphrase: 'secret-xyz-123',
});

// 3. Probe tests all IP/port combinations
//    Tests: 192.168.1.100:10000, 192.168.1.100:10001, ..., 172.16.0.1:65535
//    Total: 3 IPs × ~55,000 ports = ~165,000 tests (can be optimized)

// 4. Probe finds working connections:
//    ✅ 192.168.1.100:10500 (latency: 2ms)
//    ✅ 192.168.1.100:10501 (latency: 3ms)
//    ✅ 10.0.0.5:10500 (latency: 1ms)
//    ❌ 172.16.0.1:* (all ports blocked by firewall)

// 5. Probe reports results to Beacon on 192.168.1.100:10500
await probe.reportToBeacon(results);

// 6. Beacon collects results and sends authenticated termination
await beacon.terminateProbe();

// 7. Executor caches results for LLDP advertisement
const workingMethods = beacon.getResults();
executor.cacheConnectionMethods(workingMethods);

// Now LLDP can advertise:
// "I'm reachable at 10.0.0.5:10500 (1ms latency, TCP)"
```

#### Future: Off-Machine Testing

This architecture can be expanded to **remote probing**:

**Current (Same-Machine):**

```
Machine A:
  Executor → spawns Probe locally
  Beacon ← listens for Probe
  Probe → tests Beacon
```

**Future (Cross-Machine):**

```
Machine A (target):
  Executor → sends instructions to Machine B
  Beacon ← listens for remote Probe

Machine B (prober):
  Receives instructions from Machine A's Executor
  Spawns Probe locally
  Probe → tests Machine A's Beacon over network
  Reports results back to Machine A
```

**Expansion Strategy:**

1. **Phase 1 (Current):** Same-machine testing to prove hash authentication and protocol
2. **Phase 2:** Probe tests Beacon on different process on same machine (isolation)
3. **Phase 3:** Probe on Machine B tests Beacon on Machine A (LAN)
4. **Phase 4:** Probe on Machine C tests Beacon on Machine A (WAN/Internet)

Each phase builds on the previous mechanisms, slowly developing robust cross-network testing.

### Caching Connection Methods in LLDP

Once a Probe Server tests connection methods, the Hostess caches and advertises them:

```typescript
interface ConnectionMethod {
  type: 'websocket' | 'tcp' | 'http' | 'unix-socket';
  endpoint: string;
  latency: number; // Measured latency in ms
  throughput?: number; // Measured throughput in bytes/sec
  testedAt: number; // Timestamp when tested
}

class Hostess {
  private connectionMethodCache: Map<string, ConnectionMethod[]> = new Map();

  async cacheConnectionMethods(remoteFqdn: string, methods: ConnectionMethod[]) {
    this.connectionMethodCache.set(remoteFqdn, methods);
  }

  async getConnectionMethods(remoteFqdn: string): Promise<ConnectionMethod[] | null> {
    const cached = this.connectionMethodCache.get(remoteFqdn);

    // Return cached methods if they're recent (< 5 minutes old)
    if (cached && cached[0].testedAt > Date.now() - 300000) {
      return cached;
    }

    // Otherwise, need to re-probe
    return null;
  }
}
```

### Enhanced LLDP Advertisement with Connection Info

LLDP advertisements now include tested connection methods:

```typescript
interface LLDPAdvertisement {
  type: 'HOSTESS_ANNOUNCEMENT';
  timestamp: number;
  fqdn: string;
  hostessId: string;
  endpoint: string;                    // Primary HTTP endpoint
  capabilities: CapabilityInfo[];      // What servers are available
  connectionMethods: ConnectionMethod[]; // HOW to connect (cached from probing)
}

// Example advertisement
{
  type: 'HOSTESS_ANNOUNCEMENT',
  timestamp: 1728677440000,
  fqdn: 'machine-a.local',
  hostessId: 'hostess-uuid-1234',
  endpoint: 'http://machine-a.local:8080',
  capabilities: [
    {
      class: '0x0002',           // GPU renderer
      totalCount: 4,
      availableCount: 3,
      capabilities: ['gpu', 'h264', 'cuda']
    },
    {
      class: '0x0001',           // PTY
      totalCount: 2,
      availableCount: 1,
      capabilities: ['pty', 'vt100']
    }
  ],
  connectionMethods: [
    {
      type: 'websocket',
      endpoint: 'ws://machine-a.local:8080',
      latency: 5,
      testedAt: 1728677400000
    },
    {
      type: 'tcp',
      endpoint: 'tcp://machine-a.local:9090',
      latency: 3,
      testedAt: 1728677400000
    },
    {
      type: 'http',
      endpoint: 'http://machine-a.local:8080',
      latency: 8,
      testedAt: 1728677400000
    }
  ]
}
```

### Optimized Connection Establishment

When a remote Hostess wants to connect, it uses the cached connection methods:

```typescript
class RemoteConnectionManager {
  async connectToRemoteHostess(advertisement: LLDPAdvertisement) {
    // Try connection methods in order of latency (cached from LLDP)
    for (const method of advertisement.connectionMethods) {
      try {
        const connection = await this.tryConnectionMethod(method);
        if (connection) {
          console.log(`Connected via ${method.type} (${method.latency}ms latency)`);
          return connection;
        }
      } catch (err) {
        // This method failed, try next one
        continue;
      }
    }

    // If all cached methods fail, trigger new probe
    console.log('All cached methods failed, triggering new probe...');
    const probeResults = await this.probeServer.probeRemoteHostess(advertisement.fqdn, 8080);

    // Cache the new results
    await this.hostess.cacheConnectionMethods(advertisement.fqdn, probeResults);

    // Try the new methods
    for (const method of probeResults) {
      try {
        return await this.tryConnectionMethod(method);
      } catch (err) {
        continue;
      }
    }

    throw new Error('Unable to connect to remote Hostess');
  }
}
```

### Benefits of Reservations Interface

1. ✅ **Resource Guarantees** - Servers can reserve capabilities before using them
2. ✅ **Remote Discovery** - Hostesses advertise capabilities to each other
3. ✅ **Optimized Connections** - Cached probe results avoid repeated connection testing
4. ✅ **Transparent Cross-Machine Access** - Local servers can reserve remote capabilities
5. ✅ **Automatic Failover** - If preferred method fails, try next cached method
6. ✅ **Time-Bound Reservations** - Automatic cleanup via expiration
7. ✅ **Priority Handling** - High-priority reservations can preempt low-priority ones

### Restaurant Metaphor Summary

```
Hostess A (Mexican Restaurant):
  "We have tacos, burritos, enchiladas (PTY, Audio servers)"
  "We DON'T have seafood (GPU rendering)"

Hostess B (Seafood Restaurant):
  "We have shrimp, lobster, fish (GPU, H264, CUDA)"
  "We DON'T have Mexican food"

Via LLDP Advertisement:
  Hostess A: "Oh! Hostess B has seafood! Let me cache that info and their connection methods"
  Hostess B: "Oh! Hostess A has Mexican food! Let me cache that too"

When Local Customer at Restaurant A wants Shrimp:
  Customer (StateManager): "I need shrimp scampi"
  Hostess A: "We don't have seafood, but Restaurant B does! Let me make a reservation there for you"
  Hostess A → calls Hostess B (using cached connection: WebSocket, 5ms latency)
  Hostess B: "Yes! Table for 2 GPU servers ready. Here's the pipe to connect."
  Customer: Gets shrimp scampi, doesn't know it came from another restaurant!

Connection Discovery (Executor/Probe/Beacon Pattern):
  Hostess A (first time connecting to B): "I need to find out how to reach Restaurant B"

  Executor on Machine A: "Let me start a Beacon and spawn a Probe"
    → Beacon: Listens on ports 10000-65535 with hash authentication
    → Probe: Tests all IPs (192.168.1.100, 10.0.0.5, etc.) across port range

  Probe discovers working connections:
    ✅ 192.168.1.100:10500 (TCP, 2ms latency) ← authenticated with beacon
    ✅ 10.0.0.5:10500 (TCP, 1ms latency) ← authenticated with beacon
    ❌ 172.16.0.1:* (blocked by firewall)

  Probe → reports to Beacon on first working port (192.168.1.100:10500)
  Beacon → collects all results, terminates Probe with hashed "terminate" signal

  Hostess A (caches results): "Machine B is reachable at 10.0.0.5:10500 (1ms, TCP)"

  Next Visit: Skip probing entirely, use cached 10.0.0.5:10500 immediately!
```

## Summary

The **Hostess/Registry Server** provides:

1. ✅ **Server registry** - Guest book of all servers
2. ✅ **Port tracking** - Which terminals are in use vs available
3. ✅ **Discovery** - Query servers by capabilities, class, owner, etc.
4. ✅ **Naming convention** - Structured, globally unique server identities
5. ✅ **Compile-time manifests** - Static server configuration
6. ✅ **LLDP-inspired discovery** - HTTP, shared memory, broadcast interfaces
7. ✅ **Information mesh** - Multi-machine discovery without central config
8. ✅ **Reservations interface** - Local walk-ins and remote LLDP reservations
9. ✅ **Inter-hostess capability sharing** - Restaurants sharing menus across machines
10. ✅ **Executor/Probe/Beacon architecture** - Three-server pattern for connectivity testing
11. ✅ **Hash-based authentication** - Prevents spoofing with passphrase verification
12. ✅ **Multi-IP/port testing** - Tests all IP addresses across unprivileged port range
13. ✅ **Connection method caching** - Cache and advertise working connection paths in LLDP
14. ✅ **Optimized connection establishment** - Try cached methods first, avoid re-probing
15. ✅ **Separation from StateManager** - Registry ≠ Topology
16. ✅ **Microkernel philosophy** - All servers (Hostess, Executor, Probe, Beacon) are servers, not kernel code

The Hostess knows **who is here** and **how to reach them**.  
The StateManager knows **how they connect**.  
The Executor/Probe/Beacon pattern discovers **what connection methods work**.  
The kernel provides **the pipes**.

Six simple, composable servers (Kernel, Hostess, Executor, Probe, Beacon, StateManager) that together enable sophisticated distributed systems.

## References

- **LLDP (Link Layer Discovery Protocol):** IEEE 802.1AB
- **Service Discovery:** DNS-SD, mDNS, Consul, etcd
- **QNX Neutrino:** Network-transparent resource managers
- **Plan 9:** Network-transparent namespace
- **Erlang:** Process registry and discovery
- **Kubernetes:** Service registry and discovery
