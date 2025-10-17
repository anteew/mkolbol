# Executor Server

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** October 11, 2025

## Overview

The **Executor** is a server (not kernel code) responsible for **service lifecycle management**. It brings up services when the kernel starts, spawns probe servers for connection testing, and will eventually support spawning external processes.

**Key principle:** The Executor is just another server. The kernel doesn't know or care about service startup - that's policy, not mechanism.

## Responsibilities

The Executor has three primary responsibilities:

### 1. Service Startup (Phase 1)

When the kernel starts, the Executor:

1. Reads service configuration (initially hardcoded, later from config file)
2. Instantiates service instances
3. Registers services with the Hostess
4. Reports readiness to the StateManager

### 2. Probe Spawning (Phase 2)

For connection testing, the Executor:

1. Spawns probe servers in separate processes on request
2. Passes connection testing instructions to probes
3. Coordinates probe/beacon authentication
4. Collects and caches connection test results

### 3. External Process Management (Phase 3)

Future capability to:

1. Spawn arbitrary external processes
2. Monitor process health
3. Restart failed processes
4. Manage process lifecycle

## Architecture

### Not Part of Kernel

The Executor is a **server built on the kernel**, not kernel code:

```
Applications
   ↓
Servers (including Executor) ← Just another server!
   ↓
STREAM KERNEL (Pure plumbing)
```

**Why this matters:**

- Can be replaced with different implementations
- Can run on a separate machine
- Can be tested in isolation
- Follows microkernel philosophy: mechanism (kernel) vs policy (Executor)

### Separation of Concerns

The Executor is distinct from other infrastructure servers:

| Server           | Responsibility                                           |
| ---------------- | -------------------------------------------------------- |
| **Kernel**       | Pipes, connections, basic registry                       |
| **Executor**     | Service startup, probe spawning, process management      |
| **Hostess**      | Server registry, capability tracking, availability       |
| **StateManager** | Topology tracking, wiring configs, connection management |
| **Probe**        | Connection method testing                                |
| **Beacon**       | Connection endpoint listening, authentication            |

## Phase 1: Service Startup

### Minimal Implementation

The initial Executor is ~50-100 lines that:

1. Instantiates services from hardcoded list
2. Calls `hostess.register()` for each service
3. Waits for all services to be ready

### Example

```typescript
class Executor {
  constructor(
    private kernel: Kernel,
    private hostess: HostessServer,
  ) {}

  async start() {
    const services = this.getServiceList();

    for (const serviceDef of services) {
      const service = this.instantiate(serviceDef);
      await service.initialize();

      await this.hostess.register({
        name: serviceDef.name,
        fqdn: serviceDef.fqdn,
        class: serviceDef.class,
        owner: serviceDef.owner,
        auth: serviceDef.auth,
        mechanism: serviceDef.authMechanism,
        uuid: serviceDef.uuid,
        terminals: service.getTerminals(),
      });
    }

    console.log(`Executor: Started ${services.length} services`);
  }

  private getServiceList(): ServiceDefinition[] {
    return [
      {
        name: 'pty-server',
        fqdn: 'localhost',
        class: '0x0001', // PTY class
        owner: 'system',
        auth: 'no',
        authMechanism: 'none',
        uuid: crypto.randomUUID(),
        factory: () => new PTYServer(this.kernel),
      },
      {
        name: 'renderer-server',
        fqdn: 'localhost',
        class: '0x0002', // Renderer class
        owner: 'system',
        auth: 'no',
        authMechanism: 'none',
        uuid: crypto.randomUUID(),
        factory: () => new RendererServer(this.kernel),
      },
    ];
  }

  private instantiate(def: ServiceDefinition): Server {
    return def.factory();
  }
}
```

### Compile-Time Service Configuration

Services are initially specified in code:

```typescript
const executor = new Executor(kernel, hostess);
await executor.start();
```

**Advantages:**

- Simple to implement
- Easy to test
- No config file parsing
- Type-safe

**Future enhancement:** Load from YAML/JSON config file

## Phase 2: Probe Spawning

### Connection Testing Architecture

When the Hostess needs to test connectivity, it requests the Executor to spawn a probe:

```typescript
interface ProbeRequest {
  ipAddresses: string[];
  portRange: { start: number; end: number };
  beaconHash: string;
  probeHash: string;
  passphrase: string;
}

class Executor {
  async spawnProbe(request: ProbeRequest): Promise<ProbeResults> {
    const probe = this.spawnProcess({
      command: 'node',
      args: ['probe-server.js'],
      env: {
        IP_ADDRESSES: JSON.stringify(request.ipAddresses),
        PORT_START: request.portRange.start.toString(),
        PORT_END: request.portRange.end.toString(),
        PROBE_HASH: request.probeHash,
        PASSPHRASE: request.passphrase,
        EXPECTED_BEACON_HASH: request.beaconHash,
      },
    });

    return await probe.waitForResults();
  }

  private spawnProcess(config: ProcessConfig): Process {
    const child = spawn(config.command, config.args, {
      env: { ...process.env, ...config.env },
    });

    return new Process(child);
  }
}
```

### Probe Lifecycle

1. **Hostess requests probe** → `executor.spawnProbe(request)`
2. **Executor spawns probe process** → New Node.js process starts
3. **Probe tests connections** → Tries IP/port matrix
4. **Probe reports to beacon** → Sends results on first working port
5. **Beacon terminates probe** → Sends hashed "terminate" message
6. **Probe exits** → Process ends
7. **Results cached** → Hostess saves working connection methods

### Why Executor Spawns Probes

**Security:** The probe runs in a separate process with limited privileges

**Isolation:** If probe crashes/hangs, it doesn't affect other servers

**Scalability:** Can spawn multiple probes in parallel for testing multiple remote systems

**Testability:** Probe logic is separate from Executor logic

## Phase 3: External Process Management

Future capability to spawn and manage arbitrary external processes:

```typescript
class Executor {
  async spawnExternal(config: ExternalProcessConfig): Promise<ManagedProcess> {
    const process = this.spawnProcess({
      command: config.command,
      args: config.args,
      env: config.env,
      cwd: config.cwd,
    });

    this.monitorProcess(process);

    return new ManagedProcess(process, config);
  }

  private monitorProcess(process: Process) {
    process.on('exit', (code) => {
      if (config.restart && code !== 0) {
        console.log(`Restarting process ${process.pid}...`);
        this.spawnExternal(config);
      }
    });
  }
}
```

### Use Cases

**Docker containers:** Spawn containerized services

```typescript
await executor.spawnExternal({
  command: 'docker',
  args: ['run', '-p', '8080:8080', 'my-service'],
});
```

**GPU servers:** Start remote GPU processing

```typescript
await executor.spawnExternal({
  command: 'python',
  args: ['gpu_server.py'],
});
```

**PTY applications:** Launch terminal applications

```typescript
await executor.spawnExternal({
  command: 'bash',
  env: { TERM: 'xterm-256color' },
});
```

## Integration with Other Servers

### With Hostess

The Executor and Hostess work together:

1. **Startup:** Executor instantiates services → registers with Hostess
2. **Discovery:** Hostess maintains guest book → StateManager queries for services
3. **Connection testing:** Hostess requests probe → Executor spawns probe

```
Executor: "I'm starting pty-server"
   ↓
Hostess: "Got it, added to guest book: localhost:pty-server:0x0001:system:no:none:UUID"
   ↓
StateManager: "Hostess, give me all PTY servers"
   ↓
Hostess: "Here's 1: localhost:pty-server:..."
```

### With StateManager

The StateManager doesn't care HOW services started:

```
StateManager: "I need to wire pty-output → renderer-input"
   ↓
Hostess: "pty-server is at localhost, renderer-server is at localhost"
   ↓
StateManager: Creates connection via kernel.connect()
```

**The Executor's job is done once services are registered.**

### With Probe/Beacon

For connection testing:

```
Hostess: "I need to test connectivity to Machine B"
   ↓
Executor (Machine A): Spawns probe locally
   ↓
Probe (Machine A): Tests connections to Beacon (Machine B)
   ↓
Beacon (Machine B): Responds with hash authentication
   ↓
Probe (Machine A): Reports working methods back to Beacon
   ↓
Beacon (Machine B): Caches results, terminates probe
   ↓
Hostess (Machine B): Advertises working connection methods
```

## Configuration

### Phase 1: Hardcoded Services

Services are specified in code:

```typescript
const services = [
  { name: 'pty-server', class: '0x0001', factory: () => new PTYServer(kernel) },
  { name: 'renderer', class: '0x0002', factory: () => new RendererServer(kernel) },
];
```

### Phase 2: Config File

Load services from YAML:

```yaml
# executor-config.yaml
services:
  - name: pty-server
    fqdn: localhost
    class: 0x0001
    owner: system
    auth: no
    auth_mechanism: none
    command: node
    args: [pty-server.js]

  - name: renderer-server
    fqdn: localhost
    class: 0x0002
    owner: system
    auth: optional
    auth_mechanism: preshared-secret
    command: node
    args: [renderer-server.js]
```

### Phase 3: Dynamic Configuration

Support runtime service addition:

```typescript
await executor.addService({
  name: 'gpu-server',
  class: '0x0003',
  command: 'python',
  args: ['gpu_server.py'],
});
```

## Compile-Time Wiring Validation

The Executor can validate wiring configs at compile time:

```typescript
class Executor {
  validateWiringConfig(config: WiringConfig): ValidationResult {
    const availableServices = this.getServiceList();
    const errors: string[] = [];

    for (const connection of config.connections) {
      const sourceExists = availableServices.some((s) => s.name === connection.source);
      const targetExists = availableServices.some((s) => s.name === connection.target);

      if (!sourceExists) {
        errors.push(`Source service not found: ${connection.source}`);
      }
      if (!targetExists) {
        errors.push(`Target service not found: ${connection.target}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

**Enables:** Catch wiring errors before runtime

## Testing

### Unit Tests

Test Executor in isolation:

```typescript
describe('Executor', () => {
  it('should start all configured services', async () => {
    const kernel = new MockKernel();
    const hostess = new MockHostess();
    const executor = new Executor(kernel, hostess);

    await executor.start();

    expect(hostess.registeredServices).toHaveLength(2);
    expect(hostess.registeredServices[0].name).toBe('pty-server');
  });

  it('should spawn probe with correct configuration', async () => {
    const executor = new Executor(kernel, hostess);
    const request: ProbeRequest = {
      ipAddresses: ['192.168.1.100', '10.0.0.50'],
      portRange: { start: 10000, end: 10100 },
      beaconHash: 'abc123',
      probeHash: 'def456',
      passphrase: 'secret',
    };

    const mockSpawn = jest.spyOn(executor as any, 'spawnProcess');
    await executor.spawnProbe(request);

    expect(mockSpawn).toHaveBeenCalledWith(
      expect.objectContaining({
        env: expect.objectContaining({
          PROBE_HASH: 'def456',
          PASSPHRASE: 'secret',
        }),
      }),
    );
  });
});
```

### Integration Tests

Test Executor with real Hostess:

```typescript
it('should register services with hostess on startup', async () => {
  const kernel = new Kernel();
  const hostess = new HostessServer(kernel);
  const executor = new Executor(kernel, hostess);

  await executor.start();

  const services = await hostess.listServices();
  expect(services).toContainEqual(expect.objectContaining({ name: 'pty-server' }));
});
```

## Deployment Workflows

### Workflow 1: Static Multi-Machine Mesh

**Scenario:** User ships two systems, wants them to discover each other

**Machine A:**

```typescript
const executor = new Executor(kernel, hostess);
await executor.start();
```

**Machine B:**

```typescript
const executor = new Executor(kernel, hostess);
await executor.start();
```

Both Executors start their local services. Hostesses communicate via LLDP. Connection testing happens via Executor-spawned probes.

### Workflow 2: Dynamic Wiring

**Scenario:** User needs compile-time wiring specification

**wiring-config.yaml:**

```yaml
connections:
  - source: pty-server.output
    target: renderer-server.input
  - source: keyboard-input.output
    target: pty-server.input
```

**Startup:**

```typescript
const executor = new Executor(kernel, hostess);
await executor.start();

const wiringConfig = loadWiringConfig('wiring-config.yaml');
const validation = executor.validateWiringConfig(wiringConfig);

if (!validation.valid) {
  throw new Error(`Invalid wiring: ${validation.errors.join(', ')}`);
}

await stateManager.applyWiring(wiringConfig);
```

## Restaurant Metaphor

**The Executor is like the restaurant's opening manager:**

- **Arrives before guests** - Starts services before system is ready
- **Unlocks doors** - Makes services available
- **Tells hostess who's working** - Registers services with Hostess
- **Hires staff** - Spawns processes (servers)
- **Checks references** - Spawns probes to test connections
- **Sets up floor plan** - Validates wiring configs

**Not the kitchen, not the hostess, not the maitre d' - just the opening manager.**

## Key Design Decisions

### Why Not in Kernel?

Service startup is **policy**, not **mechanism**:

- Different systems need different services
- Service configuration changes, kernel doesn't
- Testing: Can test kernel without any services
- Flexibility: Swap Executor implementations without touching kernel

### Why Spawn Probes in Separate Processes?

**Security:** Probe has limited privileges

**Isolation:** Probe failure doesn't crash Executor

**Scalability:** Parallel probe spawning

**Simplicity:** Probe code is independent

### Why Not Supervisor Pattern?

The Executor **starts** services, but doesn't **supervise** them:

- Supervision = monitoring, restarting on failure
- That's a different concern (SupervisorServer)
- Executor does one thing: lifecycle management

## Implementation Checklist

**Phase 1: Minimal Service Startup**

- [ ] Executor class with hardcoded service list
- [ ] Service instantiation
- [ ] Hostess registration
- [ ] Unit tests
- [ ] Integration test with Hostess

**Phase 2: Probe Spawning**

- [ ] ProbeRequest interface
- [ ] Process spawning utility
- [ ] Probe lifecycle management
- [ ] Integration with Hostess connection testing
- [ ] Unit tests for probe spawning
- [ ] Integration test: Executor → Probe → Beacon

**Phase 3: Config File Loading**

- [ ] YAML config parser
- [ ] Service definition validation
- [ ] Config-driven service instantiation
- [ ] Wiring config validation
- [ ] Unit tests for config loading

**Phase 4: External Process Management**

- [ ] External process spawning
- [ ] Process health monitoring
- [ ] Restart on failure
- [ ] Graceful shutdown
- [ ] Integration tests with Docker, PTY apps

## Summary

The Executor is a minimal server (~50-100 lines initially) that:

1. ✅ **Starts services** when the kernel boots
2. ✅ **Registers services** with the Hostess
3. ✅ **Spawns probes** for connection testing
4. ✅ **Validates wiring** at compile time
5. ✅ **Manages process lifecycle** (future)

**Key principles:**

- Not kernel code - just another server
- Follows microkernel philosophy
- Testable in isolation
- Swappable implementation

**Integration:**

- Works with Hostess for service registry
- Works with StateManager for topology wiring
- Spawns Probe for connection testing
- Doesn't touch the kernel directly (only creates servers that use kernel)

The Executor completes the infrastructure server trio: **StateManager** (topology), **Hostess** (registry), **Executor** (lifecycle).
