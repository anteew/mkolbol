# StdIO Path: External Process Communication without PTY Overhead

## Overview

The **StdIO path** in mkolbol provides a lightweight way to communicate with external processes using standard UNIX pipes (`stdin`, `stdout`, `stderr`). This approach avoids the overhead of pseudo-terminal (PTY) emulation when you don't need terminal features like ANSI escape sequences, terminal control, or interactive shell behavior.

## When to Use StdIO vs PTY

### Use StdIO when:
- Your external process is a simple filter or transformer (e.g., `cat`, `jq`, `sed`)
- You're piping plain text or binary data
- You don't need terminal control sequences (cursor movement, colors, etc.)
- You want maximum performance with minimal overhead
- Your process doesn't require a controlling terminal

### Use PTY when:
- You need to run an interactive shell (e.g., `bash`, `zsh`)
- Your process expects terminal capabilities (e.g., `vim`, `less`, `top`)
- You need to handle ANSI escape sequences for colors/formatting
- You require terminal window size (rows/cols) support
- You want the process to behave as if it's in an interactive terminal

## Architecture

```
┌──────────────┐
│   Kernel     │
│  createPipe()│
└──────────────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌──────────┐   ┌──────────┐
│ Input    │   │ Output   │
│  Pipe    │   │  Pipe    │
└──────────┘   └──────────┘
       │             ▲
       │             │
       ▼             │
┌─────────────────────────┐
│ ExternalServerWrapper   │
│  spawn(ioMode: 'stdio') │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│  child_process.spawn()  │
│  stdio: ['pipe','pipe'] │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│   External Process      │
│   (e.g., /bin/cat)      │
└─────────────────────────┘
```

## Key Components

### 1. ExternalServerWrapper with StdIO Mode

The `ExternalServerWrapper` spawns external processes and manages their lifecycle. When `ioMode: 'stdio'` is specified, it uses Node.js's `child_process.spawn()` with piped stdio streams:

```typescript
import { ExternalServerManifest } from 'mkolbol';

const manifest: ExternalServerManifest = {
  fqdn: 'localhost',
  servername: 'my-filter',
  classHex: '0xFFFF',
  owner: 'system',
  auth: 'no',
  authMechanism: 'none',
  terminals: [
    { name: 'input', type: 'local', direction: 'input' },
    { name: 'output', type: 'local', direction: 'output' },
    { name: 'error', type: 'local', direction: 'output' }
  ],
  capabilities: {
    type: 'transform',
    accepts: ['text'],
    produces: ['text'],
    features: ['passthrough']
  },
  command: '/bin/cat',
  args: [],
  env: {},
  cwd: process.cwd(),
  ioMode: 'stdio',  // ← StdIO mode
  restart: 'never'
};
```

### 2. Kernel Pipes

The kernel creates standard Node.js `Duplex` streams that connect your application to the external process:

- **inputPipe**: Write data here to send to the process's stdin
- **outputPipe**: Read data from the process's stdout
- **errorPipe**: Read data from the process's stderr

### 3. No PTY Emulation

Unlike PTY mode, StdIO mode:
- Does **not** allocate a pseudo-terminal device
- Does **not** handle terminal control sequences
- Does **not** maintain terminal state (cursor position, scrollback, etc.)
- Has **lower latency** and **less overhead**

## Example: Echo Demo

See [src/examples/stdio-echo-demo.ts](../../src/examples/stdio-echo-demo.ts) for a complete working example:

```bash
# Build the project
npm run build

# Run the StdIO echo demo
node dist/examples/stdio-echo-demo.js

# Inspecting Active StdIO Endpoints

When you launch a topology with `mkctl run`, the executor now publishes endpoint announcements to the in-process RoutingServer. A snapshot is stored under `reports/router-endpoints.json`, and you can view it with:

```bash
mkctl run --file examples/configs/external-stdio.yaml --duration 2
mkctl endpoints
```

Typical output lists endpoint IDs, coordinates, and the timestamp of the last announcement so you can confirm your StdIO adapters came online.
```

### Expected Output

```
[stdio-echo-demo] Starting echo demo with stdio mode...

[SEND] Hello from StdIO!
[OUTPUT] Hello from StdIO!
[SEND] Round-trip complete.
[OUTPUT] Round-trip complete.

[stdio-echo-demo] Demo completed successfully!
[SUMMARY] Sent 2 messages, received 2 lines
```

## Performance Characteristics

| Aspect | StdIO Mode | PTY Mode |
|--------|-----------|----------|
| Latency | **Low** (~100μs) | Higher (~500μs) |
| Memory | **Minimal** | More (terminal state) |
| CPU | **Low** | Higher (ANSI parsing) |
| Overhead | **Lowest** | Medium |
| Use Case | Filters, pipes | Interactive shells |

## Common Patterns

### 1. Simple Filter

```typescript
const filterManifest: ExternalServerManifest = {
  // ... manifest fields
  command: '/usr/bin/jq',
  args: ['-r', '.name'],
  ioMode: 'stdio'
};

wrapper.inputPipe.write(JSON.stringify({ name: 'test' }));
wrapper.outputPipe.on('data', (data) => {
  console.log('Filtered:', data.toString());
});
```

### 2. Batch Processor

```typescript
const processor: ExternalServerManifest = {
  // ... manifest fields
  command: '/usr/bin/sed',
  args: ['s/foo/bar/g'],
  ioMode: 'stdio'
};

// Send multiple lines
wrapper.inputPipe.write('foo line 1\n');
wrapper.inputPipe.write('foo line 2\n');
wrapper.inputPipe.end(); // Signal EOF
```

### 3. Binary Data Pipeline

```typescript
const compressor: ExternalServerManifest = {
  // ... manifest fields
  command: '/usr/bin/gzip',
  args: ['-c'],
  ioMode: 'stdio'
};

wrapper.inputPipe.write(Buffer.from('binary data'));
wrapper.outputPipe.on('data', (chunk) => {
  // Handle compressed output
});
```

## Error Handling

StdIO mode provides a separate error stream:

```typescript
wrapper.errorPipe.on('data', (data) => {
  console.error('Process stderr:', data.toString());
});

wrapper.outputPipe.on('end', () => {
  console.log('Process completed');
});
```

## Lifecycle Management

```typescript
// Check if running
if (wrapper.isRunning()) {
  console.log('Process is active');
}

// Graceful shutdown (SIGTERM)
await wrapper.shutdown();

// Force kill after timeout
await wrapper.shutdown(2000); // 2 second timeout
```

## Comparison with Other Patterns

### vs PTY Mode
- **StdIO**: Direct pipes, no terminal emulation, best for data processing
- **PTY**: Terminal emulation, ANSI support, best for interactive programs

### vs Worker Threads
- **StdIO**: External processes, separate memory space, any language
- **Worker Threads**: JavaScript only, shared memory, lower startup cost

### vs HTTP/WebSocket
- **StdIO**: Local processes, low latency, no network overhead
- **HTTP/WebSocket**: Network-capable, higher latency, standard protocols

## Best Practices

1. **Choose StdIO for data pipelines**: When you're processing data through external tools
2. **Use PTY for shells**: When you need terminal features
3. **Handle backpressure**: Monitor pipe buffer states
4. **Set restart policies**: Configure appropriate restart behavior
5. **Close cleanly**: Always call `shutdown()` to avoid zombie processes
6. **Monitor stderr**: Don't ignore the error pipe

## Discovering Running Processes with mkctl

Once you have external processes running in a topology, you can inspect them using `mkctl endpoints`:

```bash
# After running a topology with external processes
node dist/scripts/mkctl.js endpoints
```

This will show all registered endpoints, including their **ioMode**:

```
Registered Endpoints:

ID:          localhost:my-filter:0xFFFF:test:no:none:abc123
Type:        external
Coordinates: /usr/bin/jq
IO Mode:     stdio
Metadata:    {"command":"/usr/bin/jq","args":["-r",".name"],"ioMode":"stdio"}

ID:          localhost:bash-interactive:0xFFFF:test:no:none:def456
Type:        pty
Coordinates: pid:1234567
IO Mode:     pty
Metadata:    {"cols":80,"rows":24,"terminalType":"xterm-256color","ioMode":"pty"}
```

**Key fields:**
- **IO Mode: stdio** - Lightweight pipe-based process (no terminal emulation)
- **IO Mode: pty** - Pseudo-terminal process (interactive, terminal emulation)
- **Type: external** - External process (vs inproc, worker)
- **Coordinates** - How to reach the process (command/PID)

See [mkctl CLI documentation](../../README.md#mkctl---microkernel-control-cli) for complete endpoint discovery details.

## Related Documentation

- [Early Adopter Guide](./early-adopter-guide.md) - Overview of mkolbol concepts
- [Quickstart: PTY Demo](./quickstart.md) - PTY mode example
- [Wiring and Testing Guide](./wiring-and-tests.md) - Configuration and running topologies
- [ExternalServerWrapper Source](../../src/wrappers/ExternalServerWrapper.ts) - Implementation details

## See Also

- [PTYServerWrapper](../../src/wrappers/PTYServerWrapper.ts) - PTY mode implementation
- [Executor](../../src/executor/Executor.ts) - Wrapper spawning interface
- [Kernel Pipes](../../src/kernel/Kernel.ts) - Stream management
- [mkctl run](../../README.md#config-loader) - Running config files with mkctl
