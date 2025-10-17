# External Server Wrapper Architecture

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** October 11, 2025

## Overview

This RFC defines the architecture for wrapping external executables (npm packages, C programs, arbitrary binaries) as first-class mkolbol servers. The wrapper system enables seamless integration of third-party software into the stream kernel ecosystem while maintaining location transparency, composability, and the kernel's protocol-agnostic design.

## Design Goals

### Primary Goals

1. **Seamless Integration**: External processes appear as native mkolbol servers
2. **Protocol Agnostic**: Wrapper doesn't interpret data flowing through pipes
3. **Location Transparent**: Wrapped servers work locally or distributed
4. **Minimal Boilerplate**: Standard wrapper handles common patterns
5. **Flexible I/O**: Support stdio, PTY, file descriptors, sockets
6. **First-Class Citizens**: Full integration with Hostess, Executor, StateManager

### Non-Goals

- Sandboxing/security (handled by OS/container layer)
- Process scheduling (handled by OS)
- Language-specific features (wrapper is language-agnostic)

## Core Architecture

### ExternalServerWrapper Interface

```typescript
interface ExternalServerWrapper {
  // Module interface (standard for all servers)
  inputPipe: Pipe; // Commands/data to external process
  outputPipe: Pipe; // Output from external process

  // Lifecycle management
  spawn(): Promise<void>;
  shutdown(): Promise<void>;
  restart(): Promise<void>;

  // Status
  isRunning(): boolean;
  getProcessInfo(): ProcessInfo;

  // Configuration
  manifest: ServerManifest;
}

interface ServerManifest {
  // Identity (for Hostess registration)
  name: string; // e.g., "sql-server"
  fqdn: string; // e.g., "localhost"
  class: string; // e.g., "0xFFFF" (external wrapper class)
  owner: string; // e.g., "system" or "user"
  uuid: string; // Unique identifier

  // External process configuration
  command: string; // Executable path or name
  args: string[]; // Command-line arguments
  env: Record<string, string>; // Environment variables
  cwd: string; // Working directory

  // I/O configuration
  ioMode: 'stdio' | 'pty' | 'socket' | 'file';

  // Terminals (for Hostess registration)
  terminals: TerminalDefinition[];

  // Capabilities
  capabilities: ServiceCapabilities;

  // Lifecycle policies
  restart: 'always' | 'on-failure' | 'never';
  restartDelay: number; // ms between restarts
  maxRestarts: number; // Max restart attempts
}

interface TerminalDefinition {
  name: string; // e.g., "input", "output", "error"
  direction: 'input' | 'output' | 'bidirectional';
  protocol: string; // e.g., "raw-bytes", "json-rpc", "sql"
}

interface ProcessInfo {
  pid: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  exitCode?: number;
  restartCount: number;
}
```

## I/O Modes

### Mode 1: stdio (Non-PTY)

For non-interactive programs:

```typescript
class StdioWrapper implements ExternalServerWrapper {
  private process: ChildProcess;

  async spawn(): Promise<void> {
    this.process = spawn(this.manifest.command, this.manifest.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: this.manifest.env,
      cwd: this.manifest.cwd,
    });

    // Connect stdout to outputPipe
    this.process.stdout.pipe(this.outputPipe);

    // Connect inputPipe to stdin
    this.inputPipe.pipe(this.process.stdin);

    // Optional: stderr handling
    this.process.stderr.on('data', (data) => {
      this.errorPipe?.write(data);
    });
  }
}
```

**Use cases:**

- CLI tools that read stdin, write stdout
- Data processors (filters, formatters)
- Batch processing scripts

**Example: Wrap an npm package (sql.js)**

```typescript
const sqlWrapper = new StdioWrapper({
  name: 'sql-server',
  command: 'node',
  args: ['node_modules/.bin/sql-server-cli'],
  env: { DATABASE_PATH: '/data/db.sqlite' },
  ioMode: 'stdio',
  terminals: [
    { name: 'input', direction: 'input', protocol: 'sql' },
    { name: 'output', direction: 'output', protocol: 'json' },
  ],
});
```

### Mode 2: PTY (Interactive)

For TUI applications (see [RFC 12](12-pty-wrapper-patterns.md) for details):

```typescript
class PTYWrapper implements ExternalServerWrapper {
  private ptyProcess: IPty;

  async spawn(): Promise<void> {
    this.ptyProcess = pty.spawn(this.manifest.command, this.manifest.args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      env: this.manifest.env,
      cwd: this.manifest.cwd,
    });

    this.ptyProcess.onData((data) => {
      this.outputPipe.write(Buffer.from(data));
    });

    this.inputPipe.on('data', (data) => {
      this.ptyProcess.write(data.toString());
    });
  }

  resize(cols: number, rows: number): void {
    this.ptyProcess.resize(cols, rows);
  }
}
```

**Use cases:**

- TUI applications (vim, htop, Claude Code)
- Interactive shells (bash, zsh)
- Terminal-based UIs

### Mode 3: Socket

For network services:

```typescript
class SocketWrapper implements ExternalServerWrapper {
  private process: ChildProcess;
  private socket: Socket;

  async spawn(): Promise<void> {
    // Start the external process
    this.process = spawn(this.manifest.command, this.manifest.args, {
      env: this.manifest.env,
      cwd: this.manifest.cwd,
    });

    // Wait for socket to be ready
    await this.waitForSocket(this.manifest.socketPath);

    // Connect to socket
    this.socket = connect(this.manifest.socketPath);

    // Bridge socket ↔ pipes
    this.socket.pipe(this.outputPipe);
    this.inputPipe.pipe(this.socket);
  }
}
```

**Use cases:**

- Database servers (PostgreSQL, Redis)
- Message queues (RabbitMQ)
- Web servers

## Environment Variable Passing

### Standard Environment Variables

Every wrapper provides:

```typescript
const standardEnv = {
  // Identity
  MKOLBOL_SERVER_NAME: manifest.name,
  MKOLBOL_SERVER_UUID: manifest.uuid,
  MKOLBOL_SERVER_CLASS: manifest.class,

  // Hostess information
  MKOLBOL_HOSTESS_URL: hostessUrl,

  // Terminal definitions (JSON)
  MKOLBOL_TERMINALS: JSON.stringify(manifest.terminals),

  // User-provided environment
  ...manifest.env,
};
```

### Example: npm package with configuration

```typescript
const wrapper = new StdioWrapper({
  name: 'api-server',
  command: 'node',
  args: ['node_modules/.bin/my-api-server'],
  env: {
    PORT: '8080',
    DATABASE_URL: 'sqlite:///data/db.sqlite',
    LOG_LEVEL: 'info',
    // Standard vars added automatically
  },
});
```

## CLI Argument Handling

### Argument Templates

Support template strings for dynamic values:

```typescript
const wrapper = new StdioWrapper({
  name: 'transcoder',
  command: 'ffmpeg',
  args: [
    '-i',
    '${INPUT_FILE}', // Template replaced at spawn
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-f',
    'mp4',
    '${OUTPUT_FILE}',
  ],
  env: {
    INPUT_FILE: '/tmp/input.mov',
    OUTPUT_FILE: '/tmp/output.mp4',
  },
});
```

### Argument Injection

Pass arguments from inputPipe:

```typescript
// Send command via pipe
wrapper.inputPipe.write(
  JSON.stringify({
    command: 'transcode',
    args: {
      INPUT_FILE: '/videos/source.mov',
      OUTPUT_FILE: '/videos/output.mp4',
    },
  }),
);

// Wrapper spawns new process with injected args
```

## Server Manifests

### Compile-Time Manifests

Embedded in the wrapper binary:

```typescript
// manifest.ts
export const SERVER_MANIFEST: ServerManifest = {
  name: 'video-processor',
  fqdn: 'localhost',
  class: '0x1001',
  owner: 'system',
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  command: 'ffmpeg',
  args: ['-version'], // Default args
  env: {},
  cwd: '/opt/video-processor',
  ioMode: 'stdio',
  terminals: [
    { name: 'input', direction: 'input', protocol: 'video-commands' },
    { name: 'output', direction: 'output', protocol: 'video-stream' },
  ],
  capabilities: {
    type: 'transform',
    accepts: ['video/mp4', 'video/mov'],
    produces: ['video/mp4'],
    features: ['transcode', 'resize', 'compress'],
  },
  restart: 'on-failure',
  restartDelay: 5000,
  maxRestarts: 3,
};
```

### Runtime Manifests

Load from configuration files:

```yaml
# wrapper-config.yaml
name: sql-server
fqdn: localhost
class: 0x2001
owner: system
command: node
args:
  - node_modules/.bin/sql-server
env:
  DATABASE_PATH: /data/db.sqlite
  MAX_CONNECTIONS: '100'
ioMode: stdio
terminals:
  - name: input
    direction: input
    protocol: sql
  - name: output
    direction: output
    protocol: json
capabilities:
  type: source
  accepts:
    - sql-query
  produces:
    - json-result
  features:
    - transactions
    - prepared-statements
restart: always
restartDelay: 5000
maxRestarts: 10
```

## Registration with Hostess

### Registration Flow

```
1. Executor spawns ExternalServerWrapper
2. Wrapper spawns external process
3. Wrapper registers with Hostess
4. Hostess adds to guest book
5. Wrapper ready for connections
```

### Registration API

```typescript
class ExternalServerWrapper {
  private async registerWithHostess(): Promise<void> {
    const entry: GuestBookEntry = {
      id: this.manifest.uuid,
      fqdn: this.manifest.fqdn,
      servername: this.manifest.name,
      class: this.manifest.class,
      owner: this.manifest.owner,
      uuid: this.manifest.uuid,
      terminals: this.manifest.terminals.map((t) => ({
        name: t.name,
        direction: t.direction,
        protocol: t.protocol,
        inUse: false,
        connectomeId: null,
      })),
      capabilities: this.manifest.capabilities,
      metadata: {
        pid: this.getProcessInfo().pid,
        uptime: this.getProcessInfo().uptime,
        wrapperType: this.manifest.ioMode,
      },
    };

    await hostess.register(entry);

    // Start heartbeat
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    setInterval(() => {
      hostess.heartbeat(this.manifest.uuid);
    }, 5000);
  }
}
```

### Server Identity Format

```
fqdn:servername:class:owner:auth:mechanism:uuid
localhost:sql-wrapper:0xFFFF:system:no:none:550e8400-e29b-41d4-a716-446655440000
```

Class `0xFFFF` reserved for external wrappers.

## Translation Layers

### Protocol Translation Pattern

For external servers that don't speak mkolbol protocols:

```typescript
class TranslationLayer {
  inputPipe: Pipe; // Receives mkolbol protocol
  outputPipe: Pipe; // Sends mkolbol protocol

  private externalWrapper: ExternalServerWrapper;

  constructor(wrapper: ExternalServerWrapper, translator: Translator) {
    this.externalWrapper = wrapper;

    // Translate mkolbol → external protocol
    this.inputPipe.on('data', (mkolbolData) => {
      const externalData = translator.toExternal(mkolbolData);
      wrapper.inputPipe.write(externalData);
    });

    // Translate external → mkolbol protocol
    wrapper.outputPipe.on('data', (externalData) => {
      const mkolbolData = translator.fromExternal(externalData);
      this.outputPipe.write(mkolbolData);
    });
  }
}
```

### Example: SQL Server Translation

```typescript
// External SQL server speaks custom binary protocol
const sqlWrapper = new StdioWrapper({
  name: 'sql-server',
  command: 'sql-server-binary',
  args: [],
  ioMode: 'stdio',
});

// Translation layer converts JSON → binary
const translator = new SQLTranslator();
const translatedServer = new TranslationLayer(sqlWrapper, translator);

// Now other servers can send JSON
kernel.connect(clientServer.output, translatedServer.input);
kernel.connect(translatedServer.output, clientServer.input);
```

### Standard Translators

Built-in translators for common protocols:

- `JSONTranslator`: JSON ↔ binary
- `HTTPTranslator`: HTTP requests ↔ stream data
- `SQLTranslator`: SQL queries ↔ database-specific protocol
- `ProtobufTranslator`: Protobuf ↔ JSON

## Examples

### Example 1: Wrap npm SQL Server

```typescript
// Install npm package
// npm install better-sqlite3-server

const sqlServer = new StdioWrapper({
  name: 'sqlite-server',
  fqdn: 'localhost',
  class: '0xFFFF',
  owner: 'system',
  uuid: uuidv4(),
  command: 'node',
  args: ['node_modules/.bin/sqlite-server', '--db', 'data.db'],
  env: {
    MAX_CONNECTIONS: '10',
    LOG_LEVEL: 'info',
  },
  cwd: '/opt/db',
  ioMode: 'stdio',
  terminals: [
    { name: 'query', direction: 'input', protocol: 'sql' },
    { name: 'results', direction: 'output', protocol: 'json' },
  ],
  capabilities: {
    type: 'source',
    accepts: ['sql-query'],
    produces: ['json-result'],
    features: ['transactions', 'prepared-statements'],
  },
  restart: 'on-failure',
  restartDelay: 5000,
  maxRestarts: 3,
});

// Spawn and register
await sqlServer.spawn();
await executor.registerServer(sqlServer);

// Now it's a first-class mkolbol server!
const servers = await hostess.query({ class: '0xFFFF' });
console.log(servers); // [{ name: 'sqlite-server', ... }]
```

### Example 2: Wrap C Program

```typescript
// Wrap an existing C program (e.g., ImageMagick)
const imageProcessor = new StdioWrapper({
  name: 'image-processor',
  fqdn: 'localhost',
  class: '0xFFFF',
  owner: 'user',
  uuid: uuidv4(),
  command: '/usr/bin/convert', // ImageMagick
  args: [
    '-', // Read from stdin
    '-resize',
    '800x600',
    '-quality',
    '85',
    'png:-', // Write to stdout
  ],
  env: {},
  cwd: '/tmp',
  ioMode: 'stdio',
  terminals: [
    { name: 'input', direction: 'input', protocol: 'image-binary' },
    { name: 'output', direction: 'output', protocol: 'image-binary' },
  ],
  capabilities: {
    type: 'transform',
    accepts: ['image/jpeg', 'image/png', 'image/gif'],
    produces: ['image/png'],
    features: ['resize', 'convert', 'compress'],
  },
  restart: 'never',
  restartDelay: 0,
  maxRestarts: 0,
});

// Use in pipeline
kernel.connect(imageSource.output, imageProcessor.input);
kernel.connect(imageProcessor.output, imageSink.input);
```

### Example 3: Wrap with Translation Layer

```typescript
// REST API → Stream Server
const restAPI = new SocketWrapper({
  name: 'rest-api',
  command: 'node',
  args: ['api-server.js'],
  env: { PORT: '3000' },
  ioMode: 'socket',
  socketPath: 'http://localhost:3000',
});

// Translate HTTP ↔ Streams
const httpTranslator = new HTTPTranslator();
const streamAPI = new TranslationLayer(restAPI, httpTranslator);

// Now other servers can communicate via streams
kernel.connect(clientServer.output, streamAPI.input);
```

## Testing

### Unit Tests

Test wrapper in isolation:

```typescript
describe('StdioWrapper', () => {
  it('should spawn external process', async () => {
    const wrapper = new StdioWrapper({
      name: 'test',
      command: 'cat',
      args: [],
      ioMode: 'stdio',
    });

    await wrapper.spawn();

    expect(wrapper.isRunning()).toBe(true);
    expect(wrapper.getProcessInfo().pid).toBeGreaterThan(0);
  });

  it('should pipe data through external process', async () => {
    const wrapper = new StdioWrapper({
      name: 'test',
      command: 'cat', // Echo stdin to stdout
      args: [],
      ioMode: 'stdio',
    });

    await wrapper.spawn();

    const output: Buffer[] = [];
    wrapper.outputPipe.on('data', (data) => output.push(data));

    wrapper.inputPipe.write('Hello, World!');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(Buffer.concat(output).toString()).toBe('Hello, World!');
  });

  it('should restart on failure when configured', async () => {
    const wrapper = new StdioWrapper({
      name: 'test',
      command: 'bash',
      args: ['-c', 'exit 1'], // Exits immediately
      ioMode: 'stdio',
      restart: 'on-failure',
      restartDelay: 100,
      maxRestarts: 3,
    });

    await wrapper.spawn();

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(wrapper.getProcessInfo().restartCount).toBeGreaterThan(0);
  });
});
```

### Integration Tests

Test with Hostess and Executor:

```typescript
it('should register with Hostess on spawn', async () => {
  const executor = new Executor(kernel, hostess);

  const wrapper = new StdioWrapper({
    name: 'test-server',
    command: 'cat',
    ioMode: 'stdio',
  });

  await executor.spawnWrapper(wrapper);

  const servers = await hostess.query({ name: 'test-server' });
  expect(servers).toHaveLength(1);
  expect(servers[0].name).toBe('test-server');
});
```

## Integration Points

### With Executor (RFC 10)

Executor manages wrapper lifecycle:

```typescript
class Executor {
  async spawnWrapper(wrapper: ExternalServerWrapper): Promise<void> {
    // Spawn external process
    await wrapper.spawn();

    // Register with Hostess
    await this.hostess.register({
      id: wrapper.manifest.uuid,
      servername: wrapper.manifest.name,
      class: wrapper.manifest.class,
      terminals: wrapper.manifest.terminals,
      capabilities: wrapper.manifest.capabilities,
    });

    // Monitor health
    this.monitorWrapper(wrapper);
  }

  private monitorWrapper(wrapper: ExternalServerWrapper): void {
    setInterval(() => {
      if (!wrapper.isRunning() && wrapper.manifest.restart !== 'never') {
        console.log(`Restarting ${wrapper.manifest.name}...`);
        wrapper.restart();
      }
    }, 1000);
  }
}
```

### With Hostess (RFC 08)

Wrappers register as external servers:

```typescript
// Query for external wrappers
const wrappers = await hostess.query({
  class: '0xFFFF', // External wrapper class
});

// Query by capability
const sqlServers = await hostess.query({
  capabilities: {
    accepts: ['sql-query'],
  },
});
```

### With StateManager (RFC 07)

Wrappers appear in topology:

```typescript
// Wiring config includes external wrappers
const config: WiringConfig = {
  connections: [
    {
      source: 'client-server.output',
      target: 'sql-wrapper.query', // External wrapper terminal
    },
    {
      source: 'sql-wrapper.results',
      target: 'client-server.input',
    },
  ],
};

// Topology visualization shows wrapped processes
const mermaid = stateManager.exportMermaid();
// client-server --> sql-wrapper(External: sqlite)
// sql-wrapper --> client-server
```

## Security Considerations

### Sandboxing (Out of Scope)

Wrapper doesn't provide sandboxing. Use OS-level mechanisms:

- Docker containers
- systemd units with restrictions
- AppArmor/SELinux profiles
- User permissions

### Environment Variable Safety

Never pass secrets in environment variables visible to `ps`:

```typescript
// BAD: Secret visible in process list
const wrapper = new StdioWrapper({
  env: { DATABASE_PASSWORD: 'secret123' },
});

// GOOD: Pass secrets via secure input
const wrapper = new StdioWrapper({
  env: { DATABASE_PASSWORD_FILE: '/run/secrets/db_password' },
});
```

### Input Validation

Translation layers should validate external data:

```typescript
class SQLTranslator implements Translator {
  toExternal(mkolbolData: any): string {
    // Validate and sanitize SQL queries
    if (!this.isValidSQL(mkolbolData.query)) {
      throw new Error('Invalid SQL query');
    }
    return mkolbolData.query;
  }
}
```

## Performance Considerations

### Process Overhead

Each wrapper spawns a process:

- Typical overhead: 5-10 MB RAM
- Startup time: 10-100 ms
- Consider pooling for short-lived tasks

### Pipe Buffering

Node.js streams buffer automatically:

- Default buffer: 16 KB
- Adjust with `highWaterMark` option
- Monitor backpressure

### Translation Overhead

Translation layers add latency:

- Typical overhead: 0.1-1 ms per message
- Use binary protocols when possible
- Cache translations for repeated data

## Future Enhancements

### Phase 2: Advanced Features

- **Capability negotiation**: Automatic translator selection
- **Health checks**: Wrapper-specific health check protocols
- **Resource limits**: CPU/memory/network limits per wrapper
- **Hot reload**: Restart wrapper without dropping connections

### Phase 3: Container Integration

- **Docker wrapper**: Spawn containers instead of processes
- **Kubernetes wrapper**: Deploy as K8s pods
- **Resource management**: Container-based resource limits

## Summary

The External Server Wrapper architecture enables:

1. ✅ **Seamless npm package integration** - Wrap any npm package as a server
2. ✅ **C program wrapping** - Run any binary as a server
3. ✅ **First-class citizens** - External servers integrate fully with Hostess/Executor
4. ✅ **Protocol translation** - Bridge between different protocols
5. ✅ **Location transparency** - Works locally or distributed
6. ✅ **Standard lifecycle** - Spawn, restart, shutdown, monitoring

**Key principles:**

- Wrapper is just another module type
- Follows microkernel philosophy (mechanism, not policy)
- Testable in isolation
- Composable with other modules

**Integration:**

- Executor spawns wrappers
- Hostess tracks wrapped servers
- StateManager wires wrapper terminals
- Kernel provides pipe plumbing (unchanged)

See also:

- **[RFC 12: PTY Wrapper Patterns](12-pty-wrapper-patterns.md)** - Wrapping interactive TUI applications
- **[RFC 10: Executor Server](10-executor-server.md)** - External process lifecycle management
- **[RFC 08: Registry Server](08-registry-server.md)** - Server registration and discovery
