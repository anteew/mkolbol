# Worker Mode Data Pipes

## Overview

Worker mode enables kernel modules to run in separate Worker threads while maintaining the same pipe-based communication model as in-process modules. The `WorkerPipeAdapter` provides a Duplex stream interface over `MessagePort`, enabling transparent bidirectional data flow with backpressure handling.

## Architecture

### WorkerPipeAdapter

The `WorkerPipeAdapter` wraps a `MessagePort` to create a Node.js Duplex stream, implementing the same `ProcessPipeAdapter` interface as other transport adapters.

```typescript
export class WorkerPipeAdapter implements ProcessPipeAdapter {
  private port: MessagePort;

  constructor(port: MessagePort) {
    this.port = port;
  }

  createDuplex(options?: StreamOptions): Pipe {
    return new WorkerPipeAdapterDuplex({
      ...options,
      port: this.port,
    });
  }
}
```

### MessagePort Transport

Worker pipes use structured message protocol over `MessagePort`:

```typescript
// Control messages
{ type: 'pause' }   // Signal backpressure
{ type: 'resume' }  // Resume data flow
{ type: 'end' }     // Signal stream end

// Data messages
{ type: 'data', payload: any }  // Object mode data
rawData                          // Legacy format (auto-wrapped)
```

### Configuration Example

```typescript
// Main thread - create worker with pipe ports
const { port1: inputPort1, port2: inputPort2 } = new MessageChannel();
const { port1: outputPort1, port2: outputPort2 } = new MessageChannel();

const worker = new Worker('./module.js', {
  workerData: {
    inputPort: inputPort2,
    outputPort: outputPort2
  },
  transferList: [inputPort2, outputPort2]
});

// Create pipes from main-thread ports
const inputPipe = new WorkerPipeAdapter(inputPort1).createDuplex({ objectMode: true });
const outputPipe = new WorkerPipeAdapter(outputPort1).createDuplex({ objectMode: true });

// Wire to kernel
kernel.connect(sourcePipe, inputPipe);
kernel.connect(outputPipe, destPipe);
```

```typescript
// Worker thread - receive ports and create adapters
const { inputPort, outputPort } = workerData;

const inputPipe = new WorkerPipeAdapter(inputPort).createDuplex({ objectMode: true });
const outputPipe = new WorkerPipeAdapter(outputPort).createDuplex({ objectMode: true });

// Use pipes as normal Duplex streams
inputPipe.on('data', (data) => {
  const transformed = transform(data);
  outputPipe.write(transformed);
});
```

## Comparison: Worker vs Process Pipes

| Feature | Worker Pipes (MessagePort) | Process Pipes (stdio) |
|---------|---------------------------|------------------------|
| **Transport** | Structured messages via `MessagePort` | Byte streams via stdin/stdout |
| **Object Mode** | Native support (serialization via structured clone) | Requires manual serialization (JSON/msgpack) |
| **Backpressure** | Protocol-level (`pause`/`resume` messages) | Native stream backpressure |
| **Latency** | Lower (same process, shared memory for transferables) | Higher (IPC overhead, kernel involvement) |
| **Isolation** | Shared memory space, lighter isolation | Full process isolation |
| **Setup** | `MessageChannel` pair | `spawn()` with `stdio: ['pipe', 'pipe', 'pipe']` |
| **Teardown** | `port.close()` | `process.kill()`, wait for exit |

### Process Pipe Example (External Module)

```typescript
// Spawn external process with stdio pipes
const process = spawn(command, args, {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Direct stream piping (Node.js native)
inputPipe.pipe(process.stdin);     // Kernel → Process
process.stdout.pipe(outputPipe);   // Process → Kernel

// Native backpressure via Node.js streams
// No explicit protocol needed
```

### Key Differences

**Worker Pipes:**
- Require explicit backpressure protocol (`pause`/`resume` messages)
- Support structured clone for object mode (dates, typed arrays, etc.)
- Lower overhead for high-frequency message passing
- Automatic serialization of complex objects

**Process Pipes:**
- Native backpressure via kernel buffer management
- Raw byte streams (Buffer by default)
- Higher isolation and crash resilience
- Standard Unix pipe semantics

## Backpressure Handling

### Worker Pipe Protocol

```typescript
class WorkerPipeAdapterDuplex extends Duplex {
  _read(size: number): void {
    // Signal we're ready for more data
    this.port.postMessage({ type: 'resume' });
  }

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    if (this.paused) {
      // Buffer writes during backpressure
      this.buffer.push(chunk);
      callback();
    } else {
      this.port.postMessage({ type: 'data', payload: chunk });
      callback();
    }
  }

  // Receive data from port
  port.on('message', (data) => {
    if (data.type === 'data') {
      if (!this.push(data.payload)) {
        // Downstream is full, signal backpressure
        this.port.postMessage({ type: 'pause' });
      }
    } else if (data.type === 'resume') {
      this.paused = false;
      this.drainBuffer();
    }
  });
}
```

### Backpressure Flow

```
┌─────────────┐                     ┌─────────────┐
│  Writer A   │                     │  Writer B   │
│  (Worker)   │                     │  (Worker)   │
└──────┬──────┘                     └──────┬──────┘
       │ write()                            │ write()
       ▼                                    ▼
┌──────────────────────────────────────────────────┐
│            WorkerPipeAdapter (Port)              │
│  Buffer: [chunk1, chunk2, ...]                   │
└──────┬───────────────────────────────────────┬───┘
       │ { type: 'data', payload }             │
       │                                       │
       │ (if !push() returns false)            │
       │ { type: 'pause' } ──────────────────► │ paused = true
       │                                       │
       │                                       │ Buffer incoming writes
       │                                       │
       │ ◄──────────────────── _read() called  │
       │ { type: 'resume' }                    │ paused = false
       │                                       │ drainBuffer()
       ▼                                       ▼
┌─────────────────────────────────────────────────┐
│             Downstream Consumer                 │
└─────────────────────────────────────────────────┘
```

### Process Pipe Backpressure

Process pipes use native Node.js stream backpressure:

```typescript
// Node.js handles backpressure automatically
inputPipe.pipe(process.stdin);        // Automatic pause/resume
process.stdout.pipe(outputPipe);      // Automatic buffering

// No explicit protocol needed
// write() returns false when buffer is full
// 'drain' event fires when buffer is empty
```

## Stream Lifecycle

### Worker Pipe Lifecycle

```
┌──────────────────────────┐
│  1. MessageChannel       │
│     const {port1, port2} │
│       = new Channel()    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  2. Transfer to Worker   │
│     transferList:        │
│       [port2]            │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  3. Create Adapters      │
│     new WorkerPipe       │
│       Adapter(port)      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  4. Data Flow            │
│     write → postMessage  │
│     message → push       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  5. Teardown             │
│     port.close()         │
│     'close' event        │
└──────────────────────────┘
```

### Process Pipe Lifecycle

```
┌──────────────────────────┐
│  1. Spawn Process        │
│     spawn(cmd, args, {   │
│       stdio: 'pipe'      │
│     })                   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  2. Pipe stdio Streams   │
│     pipe(process.stdin)  │
│     process.stdout.pipe()│
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  3. Data Flow            │
│     write → stdin        │
│     stdout → push        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  4. Teardown             │
│     process.kill()       │
│     wait for 'exit'      │
└──────────────────────────┘
```

## Error Handling

### Worker Pipes

```typescript
// Port errors
port.on('messageerror', () => {
  this.destroy(new Error('MessagePort error'));
});

port.on('close', () => {
  this.destroy();
});

// Stream errors propagate through Duplex
pipe.on('error', (err) => {
  console.error('Pipe error:', err);
});
```

### Process Pipes

```typescript
// Stream errors
process.stdin.on('error', handleError);
process.stdout.on('error', handleError);

// Process errors
process.on('error', (err) => {
  console.error('Process error:', err);
});

process.on('exit', (code, signal) => {
  if (code !== 0) {
    handleProcessCrash(code, signal);
  }
});
```

## Performance Characteristics

### Worker Pipes
- **Throughput**: ~1M messages/sec (object mode)
- **Latency**: <1ms (same process)
- **Overhead**: Structured clone serialization
- **Best for**: High-frequency, structured data

### Process Pipes
- **Throughput**: ~100K messages/sec (depends on serialization)
- **Latency**: 1-5ms (IPC overhead)
- **Overhead**: Process spawn, context switches
- **Best for**: Isolation, long-running services

## Use Cases

### When to Use Worker Pipes
- Transform modules processing structured objects
- High-frequency data pipelines
- Shared memory via transferables (TypedArrays, ArrayBuffers)
- Modules requiring thread-level isolation only

### When to Use Process Pipes
- External executables (Python, Go, etc.)
- Modules requiring full crash isolation
- PTY-based modules (shells, editors)
- Long-running services with independent lifecycle

## Implementation Status

**Implemented:**
- ✅ WorkerPipeAdapter (MessagePort Duplex)
- ✅ Backpressure protocol (pause/resume)
- ✅ Bidirectional data flow
- ✅ Error propagation
- ✅ Unit tests
- ✅ Integration with Executor

**Planned:**
- ⏳ UnixPipeAdapter (Unix domain sockets)
- ⏳ TCPPipeAdapter (TCP sockets)
- ⏳ WebSocketPipeAdapter (browser support)

## See Also

- [Core Architecture](02-core-architecture.md) - Kernel pipe model
- [Module Types](03-module-types.md) - How modules use pipes
- [External Wrapper](11-external-wrapper.md) - Process-based modules
