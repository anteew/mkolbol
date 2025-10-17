# Deployment Flexibility

One of the most powerful features of the stream kernel: **the same code runs in different deployment modes without changes**.

## The Key Insight

**Location is policy, not mechanism!** (L4 microkernel principle)

The kernel provides the mechanism (pipes). Where those pipes connect (local vs remote) is policy (configuration).

## Deployment Modes

### Mode 1: Single Process (Development)

**Use case:** Development, simple applications, single-user tools

```typescript
// All modules in one Node.js process
const kernel = new Kernel();

const keyboard = new KeyboardInput(kernel);
const pty = new LocalPTY(kernel);
const screen = new ScreenRenderer(kernel);

kernel.connect(keyboard.output, pty.input);
kernel.connect(pty.output, screen.input);

// Pipes are PassThrough streams (in-memory)
// Fast, simple, easy to debug
```

**Pipes:** `PassThrough` streams (Node.js in-memory)

**Deployment:**

```bash
# Ship as single executable
pkg index.js --target node18-linux-x64 --output terminal-app

# Users run
./terminal-app
```

**Advantages:**

- ✅ Simplest deployment
- ✅ Fastest (no IPC overhead)
- ✅ Easy to debug
- ✅ Single binary

**Disadvantages:**

- ❌ No crash isolation
- ❌ All modules in same memory space
- ❌ Cannot scale across machines

### Mode 2: Multi-Process (Testing/Isolation)

**Use case:** Testing, crash isolation, resource limits

```typescript
// config.yml
processes:
  main:
    modules:
      - keyboard-input
      - screen-renderer
  pty-process:
    modules:
      - local-pty
    isolation: true
    memory_limit: 512MB
```

```typescript
// Main process
const kernel = new Kernel();
const keyboard = new KeyboardInput(kernel);
const screen = new ScreenRenderer(kernel);

// Connect to PTY in separate process
const ptyPipe = kernel.createPipe('unix'); // Unix domain socket!

kernel.connect(keyboard.output, ptyPipe);
kernel.connect(ptyPipe, screen.input);

// ---

// PTY process
const kernelPTY = new Kernel();
const pty = new LocalPTY(kernelPTY);

const ipcPipe = kernelPTY.createPipe('unix');
kernelPTY.connect(ipcPipe, pty.input);
kernelPTY.connect(pty.output, ipcPipe);
```

**Pipes:** `UnixSocketPipe` (Unix domain sockets)

**Advantages:**

- ✅ Crash isolation (PTY crashes, main process survives)
- ✅ Resource limits per process
- ✅ Security boundaries
- ✅ Still on same machine (fast)

**Disadvantages:**

- ❌ IPC overhead (minimal with Unix sockets)
- ❌ More complex deployment
- ❌ Cannot scale across machines

### Mode 3: Distributed (Production/Scale)

**Use case:** Scale, fault tolerance, specialized hardware

```typescript
// deployment.yml
machines:
  machine-a:  # Laptop (no GPU)
    modules:
      - keyboard-input
      - screen-renderer
      - routing-server
    connects_to:
      - machine-c:9001

  machine-c:  # Server (has GPU)
    modules:
      - gpu-processor
      - routing-server
    listens_on: 9001
```

```typescript
// Machine A
const kernel = new Kernel();
const keyboard = new KeyboardInput(kernel);
const screen = new ScreenRenderer(kernel);
const router = new RoutingServer(kernel);

// Connect to remote machine
const toMachineC = router.createTerminal('machine-c', 'network');

kernel.connect(keyboard.output, toMachineC.input);
kernel.connect(toMachineC.output, screen.input);

// ---

// Machine C
const kernelC = new Kernel();
const gpuProcessor = new GPUProcessor(kernelC);
const routerC = new RoutingServer(kernelC);

const fromMachineA = routerC.createTerminal('machine-a', 'network');

kernelC.connect(fromMachineA.output, gpuProcessor.input);
kernelC.connect(gpuProcessor.output, fromMachineA.input);
```

**Pipes:** `TCPPipe` or `WebSocketPipe` (network)

**Advantages:**

- ✅ Scale across multiple machines
- ✅ Specialized hardware (GPU, storage, compute)
- ✅ Fault tolerance (machine fails, system continues)
- ✅ Geographic distribution

**Disadvantages:**

- ❌ Network latency
- ❌ More complex deployment (Docker, K8s)
- ❌ Network failures to handle

### Mode 4: Bare Metal / Embedded (Future)

**Use case:** Embedded systems, hardware devices

```typescript
// Embedded Linux device
const kernel = new Kernel();

// Use ring buffers instead of Node.js streams
const pipe = kernel.createPipe('ringbuf');

// Direct hardware access
const uart = new UARTInput(kernel, { device: '/dev/ttyS0' });
const lcd = new LCDOutput(kernel, { device: '/dev/fb0' });

kernel.connect(uart.output, lcd.input);
```

**Pipes:** `RingBufferPipe` (zero-copy shared memory)

**Advantages:**

- ✅ Minimal overhead
- ✅ Deterministic latency
- ✅ Direct hardware access
- ✅ Small binary size

## Transport Abstraction

The kernel supports different pipe implementations:

```typescript
class Kernel {
  createPipe(type: 'local' | 'unix' | 'tcp' | 'websocket' | 'ringbuf' = 'local'): Pipe {
    switch (type) {
      case 'local':
        return new PassThrough({ objectMode: true });

      case 'unix':
        return new UnixSocketPipe(socketPath);

      case 'tcp':
        return new TCPPipe(host, port);

      case 'websocket':
        return new WebSocketPipe(url);

      case 'ringbuf':
        return new RingBufferPipe(sharedMemory);
    }
  }
}
```

**Modules never know which transport is used!**

## Configuration-Driven Deployment

Define deployment in YAML, same code runs everywhere:

```yaml
# development.yml
mode: single-process
pipes: local

# testing.yml
mode: multi-process
pipes: unix
processes:
  - name: main
    modules: [keyboard, screen]
  - name: pty
    modules: [pty]
    memory_limit: 512MB

# production.yml
mode: distributed
pipes: tcp
machines:
  - name: frontend
    address: 10.0.0.1
    modules: [keyboard, screen, routing]
  - name: backend
    address: 10.0.0.2
    modules: [pty, gpu, routing]
```

Load configuration:

```typescript
const config = loadConfig('production.yml');
const kernel = new Kernel(config);

// Kernel automatically uses correct pipe types!
```

## Migration Path

```
Week 1: Single Process
  ↓ (add Unix socket pipes)
Week 2: Multi-Process
  ↓ (add TCP pipes)
Week 3: Distributed
  ↓ (add routing server)
Week 4: Service Mesh
```

**No code changes to modules! Only configuration.**

## Docker Compose Example

Multi-process deployment using Docker:

```yaml
# docker-compose.yml
version: '3'
services:
  frontend:
    image: stream-kernel:latest
    environment:
      - CONFIG=frontend.yml
    volumes:
      - ./config:/config
    ports:
      - '8080:8080'

  pty:
    image: stream-kernel:latest
    environment:
      - CONFIG=pty.yml
    volumes:
      - ./config:/config

  gpu:
    image: stream-kernel:latest
    environment:
      - CONFIG=gpu.yml
    runtime: nvidia # GPU access
    volumes:
      - ./config:/config
```

```bash
docker-compose up
# All modules running in separate containers
# Communication via TCP
```

## Kubernetes Example

Full distributed deployment:

```yaml
# frontend-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: terminal-frontend
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: frontend
          image: stream-kernel:latest
          env:
            - name: CONFIG
              value: 'frontend.yml'
            - name: PTY_SERVICE
              value: 'pty-service:9001'

---
# pty-service.yml
apiVersion: v1
kind: Service
metadata:
  name: pty-service
spec:
  selector:
    app: pty
  ports:
    - port: 9001
```

**Kubernetes handles service discovery!**

## Real-World Inspiration

### QNX Neutrino

```c
// Same code, works locally or remotely
fd = open("/dev/serial1", O_RDWR);           // Local
fd = open("/net/node2/dev/serial1", O_RDWR); // Remote

// Application doesn't know or care!
```

### Plan 9

```
# Mount remote filesystem
mount tcp!server!9001 /n/remote

# Access remote files as if local
cat /n/remote/data.txt
```

### Erlang

```erlang
% Send message to process
Pid ! Message

% Process could be on any node in the cluster
% Erlang runtime handles routing
```

## The Magic

**Servers don't change. Only pipe config changes.**

```typescript
// This module runs anywhere
class ParserServer {
  constructor(kernel: Kernel) {
    this.input = kernel.createPipe(); // Local? Unix? TCP? Doesn't care!
    this.output = kernel.createPipe(); // Local? Unix? TCP? Doesn't care!
  }
}
```

Whether it runs:

- In-process
- Different process on same machine
- Different machine across network

**Is determined by configuration, not code.**

## Benefits

✅ **Start simple:** Single binary for development  
✅ **Scale up:** Multi-process for isolation  
✅ **Go distributed:** Multi-machine for scale  
✅ **Same code everywhere:** No rewrites  
✅ **Test easily:** Local deployment for testing  
✅ **Deploy flexibly:** Choose deployment per environment

## Next Steps

See:

- **[Distributed Service Mesh](06-distributed-service-mesh.md)** - Multi-machine routing patterns
- **[Core Architecture](02-core-architecture.md)** - The `createPipe(type)` API
