# Stream Kernel RFC

> **📖 Modular Version Available:** This RFC has been split into multiple files for easier navigation and maintenance. See **[docs/rfcs/stream-kernel/00-index.md](docs/rfcs/stream-kernel/00-index.md)** for the modular version with clear separation of concerns.

**Version:** 1.0  
**Date:** 2025-10-11  
**Status:** Draft  
**Purpose:** Define a minimal stream-based microkernel for building flexible PTY I/O systems

---

## Executive Summary

This RFC defines a **microkernel architecture** based on pure stream plumbing that enables:

- **PTY I/O hijacking** - Intercept and transform terminal I/O from any application
- **Multi-modal rendering** - Display terminal output as HTML5 canvas, AI-friendly text, screenshots, audio (TTS), video
- **Multi-source input** - Accept input from keyboard, voice (STT), AI agents, network, scripts
- **Protocol agnostic** - Pipes carry any data; kernel doesn't understand protocols
- **Modular composition** - Build complex behaviors from simple stream modules
- **Platform flexible** - TypeScript-first, runs in Node.js and browsers

### Core Philosophy

**The kernel is the physical layer.** Like pneumatic tubes moving packages or Ethernet cables moving bits, the kernel provides the plumbing infrastructure without understanding what flows through it. All semantics, protocols, and processing logic live in independently composable modules.

---

## Problem Statement

### Current State: Monolithic Terminal Systems

Traditional terminal emulators, multiplexers, and PTY wrappers are monolithic:

```
┌─────────────────────────────────┐
│   Monolithic Terminal           │
├─────────────────────────────────┤
│ • PTY management (hardcoded)    │
│ • ANSI parsing (hardcoded)      │
│ • Rendering (hardcoded)         │
│ • Input handling (hardcoded)    │
│ • Recording (external tool)     │
│ • AI integration (impossible)   │
└─────────────────────────────────┘
```

**Limitations:**

- Can't add new input sources without recompiling
- Can't render output in multiple formats simultaneously
- Can't intercept and transform I/O streams
- Can't expose terminal data to AI systems effectively
- Can't test components in isolation

### What We Need: Composable PTY Plumbing

```
┌─────────────────────────────────────────┐
│  Stream Kernel (minimal, stable)        │
│  • createPipe()                         │
│  • connect(from, to)                    │
│  • split(source, [destinations])        │
│  • merge([sources], destination)        │
│  • Service registry                     │
└─────────────────────────────────────────┘
              ↓ (modules plug in)
┌─────────────────────────────────────────┐
│  Modules (all optional, swappable)      │
│  Inputs:  Keyboard, Voice, AI, Network  │
│  Source:  PTY, Docker, SSH              │
│  Transforms: ANSI Parser, Filters       │
│  Outputs: Canvas, xterm.js, TTS, AI     │
└─────────────────────────────────────────┘
```

---

## Design Principles

### 1. Minimal Kernel (~100 lines)

The kernel provides **only** pipes and service discovery:

```typescript
interface Kernel {
  // Pipe management
  createPipe(options?: StreamOptions): Pipe;
  connect(from: Pipe, to: Pipe): void;

  // Stream operations
  split(source: Pipe, destinations: Pipe[]): void; // Fan-out
  merge(sources: Pipe[], destination: Pipe): void; // Fan-in

  // Service registry
  register(name: string, capabilities: Capabilities, pipe: Pipe): void;
  lookup(query: CapabilityQuery): Pipe[];
}
```

**What the kernel does NOT do:**

- ❌ Understand message formats or protocols
- ❌ Parse ANSI codes or terminal semantics
- ❌ Handle authentication or authorization
- ❌ Implement backpressure policies (Node.js streams do this)
- ❌ Know about PTY, JSON-RPC, MCP, or any protocol

### 2. Pure Stream Plumbing

A `Pipe` is just a Node.js `Duplex` stream:

```typescript
// That's it - no custom abstractions
type Pipe = Duplex;

// Create pipes using standard Node.js streams
const pipe = new PassThrough();
```

**Why standard streams?**

- Battle-tested (15+ years in Node.js)
- Automatic backpressure handling
- Composable via `.pipe()`
- Can wrap anything: sockets, files, PTYs, memory buffers
- Object mode OR byte mode

### 3. Physical Layer Metaphor

The kernel is the **physical layer** in networking terms:

| OSI Layer    | Responsibility       | In Our System              |
| ------------ | -------------------- | -------------------------- |
| Application  | Business logic       | Your code using the system |
| Presentation | Data formatting      | Parser/formatter modules   |
| Session      | Connection mgmt      | Session modules            |
| Transport    | Flow control         | Congestion control modules |
| Network      | Routing              | Routing modules            |
| Data Link    | Framing              | Framing modules            |
| **Physical** | **Bit transmission** | **THE KERNEL**             |

**The kernel answers only:**

- ✅ Is there a carrier? (Does a pipe exist?)
- ✅ Can data flow? (Are pipes connected?)
- ✅ Who provides what? (Service registry)

### 4. Protocol Agnostic

The kernel moves data without understanding it:

```typescript
// These all work identically through the kernel:

// Raw bytes (terminal ANSI codes)
pipe.write(Buffer.from('\x1b[32mHello\x1b[0m'));

// JSON-RPC messages
pipe.write(JSON.stringify({ jsonrpc: '2.0', method: 'test' }));

// MCP protocol
pipe.write(JSON.stringify({ method: 'tools/list' }));

// Binary protocols
pipe.write(msgpack.encode({ data: 'anything' }));

// Custom protocols
pipe.write(yourProtocol.serialize({ ... }));
```

The kernel doesn't care. It's just moving data through pipes.

### 5. Module Composability

Complex systems emerge from simple compositions:

```typescript
// Minimal: Keyboard → PTY → Screen
kernel.connect(keyboard.outputPipe, pty.inputPipe);
kernel.connect(pty.outputPipe, screen.inputPipe);

// Advanced: Multi-input, multi-output, with transforms
kernel.merge([keyboard.outputPipe, voice.outputPipe, ai.outputPipe], pty.inputPipe);

kernel.connect(pty.outputPipe, parser.inputPipe);

kernel.split(parser.outputPipe, [
  screen.inputPipe, // Live display
  mp4.inputPipe, // Recording
  tts.inputPipe, // Audio output
  aiFormatter.inputPipe, // AI-friendly format
]);
```

---

## Core Use Case: PTY I/O Hijacking

### The Vision

**Hijack the entire I/O system** of any terminal-based application:

```
Traditional:
  [Keyboard] → [PTY] → [Screen]

Our System:
  [Keyboard, Voice, AI, Network] → [PTY] → [Screen, Canvas, Video, Audio, AI, Browser Extension]
```

### Example: AI-Enhanced Terminal

```typescript
const kernel = new Kernel();

// Inputs
const keyboard = new KeyboardInput(kernel);
const whisper = new WhisperSTT(kernel); // Speech-to-text
const aiAgent = new MCPInput(kernel); // AI agent commands

// Source (the actual terminal application)
const pty = new DockerPTY(kernel, {
  command: 'bash',
  image: 'ubuntu:latest',
});

// Transforms
const ansiParser = new XtermParser(kernel);
const aiFormatter = new AITextFormatter(kernel); // Formats for LLM context

// Outputs
const xterm = new XtermJSRenderer(kernel); // Native terminal UI
const canvas = new CanvasRenderer(kernel); // HTML5 canvas
const screenshotter = new Screenshotter(kernel); // Periodic screenshots
const tts = new TextToSpeech(kernel); // Audio output

// Wire it up
kernel.merge([keyboard.outputPipe, whisper.outputPipe, aiAgent.outputPipe], pty.inputPipe);

kernel.connect(pty.outputPipe, ansiParser.inputPipe);

kernel.split(ansiParser.outputPipe, [
  xterm.inputPipe,
  canvas.inputPipe,
  aiFormatter.inputPipe,
  tts.inputPipe,
]);

// Screenshot feed to AI
screenshotter.on('screenshot', (img) => {
  aiAgent.sendToAI({ type: 'screenshot', data: img });
});
```

**Result:**

- Type with keyboard or speak commands via voice
- AI can send commands and receive screenshots
- See output in native terminal AND canvas
- Hear output via TTS
- Everything happens simultaneously

### Example: Browser Extension Integration

```typescript
// Running in browser via TypeScript compilation
const kernel = new Kernel();

// Browser-specific modules
const devTools = new ChromeDevToolsInput(kernel);
const browserExtension = new ExtensionMessaging(kernel);
const webWorkerPTY = new WebWorkerPTY(kernel);

// Renderers
const canvasOutput = new CanvasRenderer(kernel, {
  targetElement: document.getElementById('terminal'),
});

// Connect browser extension to PTY
kernel.connect(browserExtension.outputPipe, webWorkerPTY.inputPipe);
kernel.connect(webWorkerPTY.outputPipe, canvasOutput.inputPipe);

// Extension can now control terminal, see output
```

---

## Module Types

### Input Modules

Generate user input and write to `outputPipe`:

```typescript
interface InputModule {
  type: 'input';
  outputPipe: Pipe; // Sends commands/input
}

// Examples:
// - KeyboardInput (process.stdin)
// - WhisperSTT (speech → text)
// - MCPInput (AI agent commands)
// - NetworkInput (WebSocket, TCP)
// - ScriptedInput (replay recordings)
// - GameController (gamepad input)
```

### Source Modules

Run processes and expose bidirectional I/O:

```typescript
interface SourceModule {
  type: 'source';
  inputPipe: Pipe; // Receives input/commands
  outputPipe: Pipe; // Sends output/results
}

// Examples:
// - LocalPTY (node-pty)
// - DockerPTY (docker container with TTY)
// - SSHSession (remote shell)
// - WebWorkerPTY (browser-compatible PTY)
// - KubernetesPod (k8s exec)
```

### Transform Modules

Process data in flight:

```typescript
interface TransformModule {
  type: 'transform';
  inputPipe: Pipe; // Receives data
  outputPipe: Pipe; // Sends transformed data
}

// Examples:
// - XtermParser (ANSI → structured terminal state)
// - AITextFormatter (terminal → LLM-friendly text)
// - ANSIStripper (remove formatting)
// - JSONSerializer (objects → JSON)
// - Encryptor (plaintext → encrypted)
// - Compressor (raw → gzipped)
```

### Output Modules

Display or record results:

```typescript
interface OutputModule {
  type: 'output';
  inputPipe: Pipe; // Receives data to display/record
}

// Examples:
// - XtermJSRenderer (xterm.js in browser)
// - CanvasRenderer (HTML5 canvas)
// - TerminalOutput (process.stdout)
// - MP4Recorder (video recording)
// - TextToSpeech (audio output)
// - Screenshotter (periodic screenshots)
// - BrailleDisplay (accessibility)
```

---

## Service Registry

Modules advertise capabilities to enable dynamic discovery:

```typescript
// Module registration
kernel.register(
  'xterm-parser',
  {
    accepts: ['raw-ansi'],
    produces: ['terminal-state'],
    type: 'transform',
    features: ['vt100', 'xterm-256color', 'unicode'],
  },
  parserPipe,
);

kernel.register(
  'ai-formatter',
  {
    accepts: ['terminal-state'],
    produces: ['ai-text'],
    type: 'transform',
    features: ['context-aware', 'token-optimized'],
  },
  formatterPipe,
);

// Dynamic discovery
const parsers = kernel.lookup({
  accepts: 'raw-ansi',
  produces: 'terminal-state',
});
// Returns: [xterm-parser's pipe]

const aiModules = kernel.lookup({
  produces: 'ai-text',
});
// Returns: [ai-formatter's pipe]
```

---

## Implementation Details

### Kernel Implementation (~100 lines)

```typescript
import { PassThrough, Duplex } from 'stream';

type Pipe = Duplex;

interface Capabilities {
  accepts?: string[];
  produces?: string[];
  type: 'input' | 'source' | 'transform' | 'output';
  features?: string[];
}

interface CapabilityQuery {
  accepts?: string;
  produces?: string;
  features?: string[];
}

interface StreamOptions {
  highWaterMark?: number;
  objectMode?: boolean;
}

export class Kernel {
  private registry = new Map<string, { capabilities: Capabilities; pipe: Pipe }>();

  createPipe(options?: StreamOptions): Pipe {
    return new PassThrough(options);
  }

  connect(from: Pipe, to: Pipe): void {
    from.pipe(to);
  }

  split(source: Pipe, destinations: Pipe[]): void {
    for (const dest of destinations) {
      source.pipe(dest);
    }
  }

  merge(sources: Pipe[], destination: Pipe): void {
    for (const source of sources) {
      source.pipe(destination);
    }
  }

  register(name: string, capabilities: Capabilities, pipe: Pipe): void {
    this.registry.set(name, { capabilities, pipe });
  }

  lookup(query: CapabilityQuery): Pipe[] {
    const results: Pipe[] = [];

    for (const [_, entry] of this.registry) {
      const caps = entry.capabilities;

      // Match accepts
      if (query.accepts && caps.accepts && !caps.accepts.includes(query.accepts)) {
        continue;
      }

      // Match produces
      if (query.produces && caps.produces && !caps.produces.includes(query.produces)) {
        continue;
      }

      // Match features
      if (query.features) {
        if (!caps.features) continue;
        const hasAll = query.features.every((f) => caps.features!.includes(f));
        if (!hasAll) continue;
      }

      results.push(entry.pipe);
    }

    return results;
  }
}
```

That's the entire kernel. ~100 lines.

### Example Module: XtermParser

```typescript
import { Kernel, Pipe } from './kernel';
import { Terminal } from 'xterm';

export class XtermParser {
  type = 'transform' as const;
  inputPipe: Pipe;
  outputPipe: Pipe;
  private terminal: Terminal;

  constructor(private kernel: Kernel) {
    this.inputPipe = kernel.createPipe();
    this.outputPipe = kernel.createPipe({ objectMode: true });

    kernel.register(
      'xterm-parser',
      {
        accepts: ['raw-ansi'],
        produces: ['terminal-state'],
        type: 'transform',
        features: ['vt100', 'xterm-256color'],
      },
      this.inputPipe,
    );
  }

  async init(): Promise<void> {
    this.terminal = new Terminal({ cols: 80, rows: 24 });

    this.inputPipe.on('data', (chunk: Buffer) => {
      // Parse ANSI codes
      this.terminal.write(chunk);

      // Output structured state
      const state = {
        raw: chunk,
        buffer: this.terminal.buffer.active,
        cursor: {
          x: this.terminal.buffer.active.cursorX,
          y: this.terminal.buffer.active.cursorY,
        },
        timestamp: Date.now(),
      };

      this.outputPipe.write(state);
    });
  }

  async destroy(): Promise<void> {
    this.terminal.dispose();
  }
}
```

---

## Architecture Layers

The system is built in layers, each using the kernel's primitives:

```
┌─────────────────────────────────────────┐
│  Layer 5: Applications                  │
│  (User code, AI agents, browser ext)    │
├─────────────────────────────────────────┤
│  Layer 4: Domain Modules                │
│  (PTY, parsers, renderers, AI)          │
├─────────────────────────────────────────┤
│  Layer 3: Protocol Modules              │
│  (JSON-RPC, MCP, custom protocols)      │
├─────────────────────────────────────────┤
│  Layer 2: Transport Modules             │
│  (WebSocket, TCP, Unix sockets)         │
├─────────────────────────────────────────┤
│  Layer 1: Stream Kernel                 │
│  (Pipes, connect, split, merge)         │
└─────────────────────────────────────────┘
```

**Key insight:** MCP/JSON-RPC are Layer 3 modules, NOT part of the kernel. The kernel provides the plumbing for ANY protocol.

### Building MCP on the Kernel

```typescript
// MCP router as a transform module
export class MCPRouter {
  inputPipe: Pipe; // Receives JSON-RPC messages
  outputPipe: Pipe; // Sends JSON-RPC responses

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe({ objectMode: true });
    this.outputPipe = kernel.createPipe({ objectMode: true });

    kernel.register(
      'mcp-router',
      {
        accepts: ['json-rpc'],
        produces: ['json-rpc'],
        type: 'transform',
      },
      this.inputPipe,
    );
  }

  async init() {
    this.inputPipe.on('data', async (req: JsonRpcRequest) => {
      const response = await this.handleRequest(req);
      this.outputPipe.write(response);
    });
  }

  private async handleRequest(req: JsonRpcRequest) {
    // Handle tools/list, tools/call, resources/read, etc.
  }
}
```

Same kernel, different protocol.

---

## Configuration-Driven Topology

Complex systems can be defined declaratively:

```yaml
# terminal-config.yml
version: 1.0

inputs:
  - id: keyboard
    type: keyboard-input

  - id: voice
    type: whisper-stt
    config:
      model: base.en

source:
  id: main-pty
  type: docker-pty
  config:
    image: ubuntu:latest
    command: /bin/bash

transforms:
  - id: parser
    type: xterm-parser
    config:
      cols: 120
      rows: 30

outputs:
  - id: screen
    type: xterm-renderer

  - id: ai-formatter
    type: ai-text-formatter

  - id: tts
    type: text-to-speech

routing:
  - from: [keyboard, voice]
    to: main-pty

  - from: main-pty
    to: parser

  - from: parser
    to: [screen, ai-formatter, tts]
```

Load and run:

```typescript
const config = await loadConfig('terminal-config.yml');
const system = await System.fromConfig(kernel, config);
await system.start();
```

---

## Testing Strategy

### Unit Tests: Modules in Isolation

```typescript
describe('XtermParser', () => {
  it('parses ANSI color codes', async () => {
    const mockKernel = new Kernel();
    const parser = new XtermParser(mockKernel);
    await parser.init();

    parser.inputPipe.write('\x1b[32mGreen\x1b[0m');

    const state = await new Promise((resolve) => {
      parser.outputPipe.once('data', resolve);
    });

    expect(state.text).toBe('Green');
    expect(state.color).toBe('green');
  });
});
```

### Integration Tests: Compositions

```typescript
describe('Keyboard → PTY → Screen', () => {
  it('passes input through to PTY and output to screen', async () => {
    const kernel = new Kernel();
    const keyboard = new MockKeyboard(kernel);
    const pty = new MockPTY(kernel);
    const screen = new MockScreen(kernel);

    kernel.connect(keyboard.outputPipe, pty.inputPipe);
    kernel.connect(pty.outputPipe, screen.inputPipe);

    keyboard.type('ls\n');

    await waitFor(() => screen.hasOutput());
    expect(screen.content).toContain('total');
  });
});
```

---

## Platform Support

### Node.js (Primary)

Full support for all module types:

```typescript
import { Kernel } from 'mkolbol';
import { LocalPTY } from 'mkolbol/modules/pty';

const kernel = new Kernel();
const pty = new LocalPTY(kernel, { command: 'bash' });
```

### Browser (TypeScript)

Limited to browser-compatible modules:

```typescript
import { Kernel } from 'mkolbol';
import { WebWorkerPTY } from 'mkolbol/modules/web';
import { CanvasRenderer } from 'mkolbol/modules/canvas';

const kernel = new Kernel();
const pty = new WebWorkerPTY(kernel);
const canvas = new CanvasRenderer(kernel, { element: '#terminal' });

kernel.connect(pty.outputPipe, canvas.inputPipe);
```

**Browser limitations:**

- No native PTY (use WebWorker or remote PTY)
- No file system access (use virtual FS or remote storage)
- Network restrictions (CORS, WebSocket only)

**Browser strengths:**

- Browser extension APIs
- HTML5 Canvas rendering
- WebGL acceleration
- Native audio/video APIs

---

## Security Considerations

### Module Isolation

Modules are isolated by stream boundaries:

```typescript
// PTY can't access Parser's internal state
// They only share pipes (data streams)
kernel.connect(pty.outputPipe, parser.inputPipe);
```

For stronger isolation:

- Run modules in separate processes (IPC via pipes)
- Run modules in worker threads
- Run modules in containers

### Sandboxing PTY/Docker

```typescript
const pty = new DockerPTY(kernel, {
  image: 'ubuntu:latest',
  security: {
    readonlyRootfs: true,
    noNetwork: true,
    cpuLimit: '1.0',
    memoryLimit: '512m',
    dropCapabilities: ['ALL'],
  },
});
```

### Input Validation

Modules validate at boundaries:

```typescript
class SafePTY extends LocalPTY {
  send(data: Buffer) {
    const sanitized = stripDangerousEscapes(data);
    super.send(sanitized);
  }
}
```

---

## Roadmap

### Phase 1: Core Kernel (Week 1)

- [ ] Kernel implementation (~100 lines)
- [ ] Basic modules: KeyboardInput, LocalPTY, TerminalOutput
- [ ] Configuration loader
- [ ] Unit tests

**Success:** Run `bash` with keyboard → PTY → screen

### Phase 2: Parsers & Renderers (Week 2)

- [ ] XtermParser (ANSI → structured state)
- [ ] CanvasRenderer (HTML5 canvas output)
- [ ] XtermJSRenderer (xterm.js integration)
- [ ] Service registry with capability matching

**Success:** Display terminal in canvas AND xterm.js simultaneously

### Phase 3: AI Integration (Week 3)

- [ ] AITextFormatter (terminal → LLM context)
- [ ] Screenshotter (periodic screenshots)
- [ ] WhisperSTT (speech input)
- [ ] MCPInput (AI agent commands)

**Success:** AI can see screenshots and send commands

### Phase 4: Advanced Modules (Week 4)

- [ ] DockerPTY (isolated containers)
- [ ] MP4Recorder (video recording)
- [ ] TextToSpeech (audio output)
- [ ] NetworkTransport (WebSocket, TCP)

**Success:** Full multi-modal I/O system

### Phase 5: Browser Extension (Week 5-6)

- [ ] Chrome extension scaffolding
- [ ] DevTools panel integration
- [ ] Native messaging bridge
- [ ] Browser-specific modules

**Success:** Terminal running in DevTools with extension control

### Phase 6: MCP/Protocol Layer (Week 7)

- [ ] MCPRouter module (Layer 3)
- [ ] JSON-RPC transport module
- [ ] HTTP/SSE transport module
- [ ] Plugin system for MCP tools/resources

**Success:** MCP server running on stream kernel

---

## Deployment Flexibility: Single Binary → Distributed

One of the key advantages of the stream kernel is **deployment flexibility** - the same code runs in different deployment modes without changes.

### Phase 1: Single Process (Development)

All servers run as objects in one Node.js process:

```typescript
// single-binary.ts
import { Kernel } from './kernel';
import { PTYServer } from './servers/pty';
import { ParserServer } from './servers/parser';
import { MP4Server } from './servers/mp4';

async function main() {
  const kernel = new Kernel();

  const pty = new PTYServer(kernel);
  const parser = new ParserServer(kernel);
  const mp4 = new MP4Server(kernel);

  kernel.connect(pty.outputPipe, parser.inputPipe);
  kernel.connect(parser.outputPipe, mp4.inputPipe);

  await kernel.start();
}

main();
```

**Pipe implementation:** `PassThrough` (in-memory)

**Ship as:** Single executable via `pkg`

```bash
$ pkg single-binary.ts -o terminal-renderer
$ ./terminal-renderer  # One file, runs everything
```

**Advantages:**

- ✅ Fast (no serialization overhead)
- ✅ Simple (one process to debug)
- ✅ Easy (`node index.js` and it runs)

### Phase 2: Multi-Process (Testing/Isolation)

Servers run as separate processes on the same machine:

```typescript
// supervisor.ts
import { spawn } from 'child_process';

async function main() {
  const pty = spawn('node', ['servers/pty-server.js']);
  const parser = spawn('node', ['servers/parser-server.js']);
  const mp4 = spawn('node', ['servers/mp4-server.js']);

  // Monitor and restart on crashes
  pty.on('exit', (code) => {
    console.log(`PTY crashed with ${code}, restarting...`);
    spawn('node', ['servers/pty-server.js']);
  });
}
```

**Pipe implementation:** `UnixSocketPipe` (IPC)

**Configuration:**

```yaml
# multi-process.yml
servers:
  pty: { type: unix, socket: /tmp/pty.sock }
  parser: { type: unix, socket: /tmp/parser.sock }
  mp4: { type: unix, socket: /tmp/mp4.sock }
```

**Advantages:**

- ✅ Isolation (crash one server, others survive)
- ✅ Realistic (tests actual IPC)
- ✅ Debugging (can restart single server)

### Phase 3: Distributed (Production/Scale)

Servers run on different machines across a network:

```yaml
# docker-compose.yml
services:
  pty-server:
    image: terminal-renderer/pty-server
    environment:
      OUTPUT_HOST: parser-server
      OUTPUT_PORT: 9001

  parser-server:
    image: terminal-renderer/parser-server
    environment:
      INPUT_PORT: 9001
      OUTPUT_HOST: mp4-server
      OUTPUT_PORT: 9002

  mp4-server:
    image: terminal-renderer/mp4-server
    environment:
      INPUT_PORT: 9002
```

**Pipe implementation:** `TCPPipe` or `WebSocketPipe`

```typescript
// pty-server.js (on machine 1)
pty.outputPipe = new TCPPipe('parser-server', 9001);

// parser-server.js (on machine 2)
parser.inputPipe = new TCPListenPipe(9001);
parser.outputPipe = new TCPPipe('mp4-server', 9002);
```

**Advantages:**

- ✅ Scale (different machines for different workloads)
- ✅ Fault tolerance (machine failure ≠ system failure)
- ✅ Performance (PTY on fast machine, MP4 encoding on GPU machine)

### Phase 4: Bare Metal (Future/Embedded)

Port to embedded systems without OS:

```typescript
// Kernel adapted for no-OS
class Kernel {
  createPipe(): Pipe {
    return new RingBufferPipe(); // Instead of PassThrough
  }
}

// Servers run on bare metal
const serialDriver = new SerialDriverServer(kernel);
const parser = new ParserServer(kernel);
const flashWriter = new FlashWriterServer(kernel);
```

**Advantages:**

- ✅ Minimal footprint (embedded devices)
- ✅ Direct hardware access
- ✅ Real-time performance

### Transport Abstraction: Same API, Different Deployment

The magic is in the kernel's pipe abstraction:

```typescript
// Kernel interface NEVER CHANGES
class Kernel {
  createPipe(type: 'local' | 'unix' | 'tcp' = 'local'): Pipe {
    switch (type) {
      case 'local':
        return new PassThrough(); // In-process
      case 'unix':
        return new UnixSocketPipe(); // Cross-process
      case 'tcp':
        return new TCPPipe(); // Cross-machine
    }
  }
}
```

**Same server code works in all deployments:**

```typescript
// This code works whether local, multi-process, or distributed
class PTYServer {
  constructor(kernel: Kernel) {
    this.outputPipe = kernel.createPipe(); // Type determined by config
  }
}
```

**Inspired by QNX Neutrino:** QNX's IPC is network-transparent:

```c
// Open file (could be local or remote - you don't know!)
fd = open("/net/machine2/dev/serial1", O_RDWR);
```

Same API whether server is in same process, different process, or different machine.

### Deployment Roadmap Summary

| Phase     | Deployment     | Transport     | Use Case                 |
| --------- | -------------- | ------------- | ------------------------ |
| 1 (now)   | Single process | PassThrough   | Development, simple apps |
| 2         | Multi-process  | Unix sockets  | Testing, isolation       |
| 3         | Distributed    | TCP/WebSocket | Scale, fault tolerance   |
| 4 (maybe) | Bare metal     | Ring buffers  | Embedded, hardware       |

**The kernel never changes. Only pipe implementations change.**

---

## Distributed Service Mesh: The Routing Server Pattern

One of the most powerful aspects of the stream kernel is its ability to support **distributed service mesh** architectures where servers span multiple machines with automatic service discovery and routing.

### The "Terminal" Concept (Airport Analogy)

Think of a routing server as an **airport** with **terminals** (connection points):

```
┌─────────────────────────────────────────────────┐
│  Machine A                                      │
│  ┌───────────────────────────────────────────┐ │
│  │  Routing Server (the "airport")           │ │
│  │                                           │ │
│  │  Terminal 1 ← local PTY server            │ │
│  │  Terminal 2 ← network (to Machine B)      │ │
│  │  Terminal 3 ← network (to Machine C)      │ │
│  │  Terminal 4 ← local MP4 server            │ │
│  │                                           │ │
│  │  Routing table:                           │ │
│  │  - parser-server → Machine B, Terminal 2  │ │
│  │  - gpu-server    → Machine C, Terminal 3  │ │
│  │  - mp4-server    → local, Terminal 4      │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Terminals** are connection points that can be:

- **Local:** Connect to servers in the same process/machine
- **Network:** Connect to remote machines via TCP/WebSocket
- **Loopback:** For testing or special routing scenarios

**The routing server is just another server!** The kernel doesn't know or care about routing - it just provides pipes.

### Routing Server Implementation

```typescript
/**
 * Routing Server - Like an IP router for pipes
 *
 * Manages "terminals" (connection points) and routes
 * data between them based on service discovery
 */
class RoutingServer {
  private kernel: Kernel;
  private terminals = new Map<string, Terminal>();
  private routes = new Map<string, Route>();

  constructor(kernel: Kernel) {
    this.kernel = kernel;

    // Register as router
    kernel.register(
      'router',
      {
        type: 'transform',
        capabilities: ['routing', 'service-discovery'],
      },
      kernel.createPipe(),
    );
  }

  /**
   * Create a terminal (connection point)
   */
  createTerminal(name: string, type: TerminalType): Terminal {
    const terminal: Terminal = {
      name,
      type,
      inputPipe: this.kernel.createPipe(),
      outputPipe: this.kernel.createPipe(),
      remoteAddress: type === 'network' ? this.getRemoteAddress(name) : null,
    };

    // Wire up routing logic
    terminal.inputPipe.on('data', (data) => {
      this.route(data, terminal);
    });

    this.terminals.set(name, terminal);
    return terminal;
  }

  /**
   * Route data from source terminal to destination
   */
  private route(data: any, fromTerminal: Terminal): void {
    // Extract routing info from data
    const envelope = this.parseEnvelope(data);
    const destination = envelope.destination;

    // Look up route
    const route = this.routes.get(destination);

    if (!route) {
      console.error(`[Router] No route to ${destination}`);
      return;
    }

    // Get destination terminal
    const destTerminal = this.terminals.get(route.terminal);

    if (!destTerminal) {
      console.error(`[Router] Terminal ${route.terminal} not found`);
      return;
    }

    // Forward to destination terminal
    console.log(`[Router] ${fromTerminal.name} → ${destTerminal.name} (${destination})`);
    destTerminal.outputPipe.write(data);
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
}

/**
 * Terminal types
 */
type TerminalType = 'local' | 'network' | 'loopback';

interface Terminal {
  name: string;
  type: TerminalType;
  inputPipe: Pipe;
  outputPipe: Pipe;
  remoteAddress: string | null;
}

interface Route {
  serviceName: string;
  terminal: string; // Which terminal to send to
  machineId?: string; // Which machine (null = local)
  hops: number; // Distance metric
}
```

### Multi-Machine Example: GPU Processing Flow

**Scenario:** PTY on Machine A needs GPU on Machine C, but Machine A has no GPU.

```
Machine A (no GPU)          Machine C (has GPU)
┌──────────────────┐        ┌──────────────────┐
│  PTY Server      │        │  GPU Server      │
│      ↓           │        │      ↑           │
│  Router          │        │  Router          │
│  Terminal B ─────┼────────┼──→ Terminal A    │
│    (send GPU     │  net   │    (recv request)│
│     request)     │        │                  │
│      ↑           │        │      ↓           │
│  Terminal B ←────┼────────┼─── Terminal A    │
│    (recv result) │  net   │    (send result) │
│      ↓           │        └──────────────────┘
│  MP4 Encoder     │
└──────────────────┘
```

**The flow (hairpin/loopback):**

1. PTY on Machine A generates frame data
2. Router on A sees destination = "gpu-server"
3. Router on A looks up route: "gpu-server" → Terminal B (network to Machine C)
4. Sends to Machine C via Terminal B
5. Router on C receives at Terminal A (from Machine A)
6. Router on C routes to local gpu-server
7. GPU server processes the frame
8. GPU server sends result back to router with replyTo address
9. Router on C sees destination = "mp4-encoder@machine-a"
10. Router on C sends back via Terminal A (network to Machine A)
11. Router on A receives at Terminal B (from Machine C)
12. Router on A routes to local mp4-encoder
13. MP4 encoder gets GPU-processed frame!

**Code example:**

```typescript
// Machine A: PTY generates frame, needs GPU processing
const frame = ptyServer.captureFrame();

// Wrap in envelope with routing info
const envelope = {
  source: 'pty-server@machine-a',
  destination: 'gpu-server', // Let router find it!
  replyTo: 'mp4-encoder@machine-a', // Where to send result
  data: frame,
};

// Send to router - it handles everything!
router.inputPipe.write(envelope);

// GPU server on Machine C:
gpuServer.inputPipe.on('data', (envelope) => {
  const processed = this.processOnGPU(envelope.data);

  // Send result back
  const reply = {
    source: 'gpu-server@machine-c',
    destination: envelope.replyTo, // "mp4-encoder@machine-a"
    data: processed,
  };

  router.inputPipe.write(reply);
});

// MP4 encoder on Machine A automatically receives processed frame!
```

### Service Discovery: How Machines Find Each Other

**Approach 1: Broadcast Announcements (Mesh Network)**

Machines periodically broadcast what services they offer:

```typescript
class RoutingServer {
  startHeartbeat(): void {
    setInterval(() => {
      this.announceServices();
    }, 5000); // Every 5 seconds
  }

  announceServices(): void {
    const announcement = {
      type: 'service-announcement',
      machineId: this.machineId,
      services: this.getLocalServices(),
      routes: this.getKnownRoutes(), // Re-broadcast learned routes!
      hops: 0, // We're 0 hops from ourselves
    };

    // Broadcast on all network terminals
    this.broadcastToNetwork(announcement);
  }

  onAnnouncementReceived(announcement: any, fromTerminal: Terminal): void {
    // Learn about services
    for (const service of announcement.services) {
      this.addRoute(service, fromTerminal.name, announcement.machineId, announcement.hops + 1);
    }

    // Learn about multi-hop routes
    for (const route of announcement.routes) {
      // Only add if closer than existing route
      const existing = this.routes.get(route.service);
      const newHops = route.hops + 1;

      if (!existing || newHops < existing.hops) {
        this.addRoute(route.service, fromTerminal.name, route.machineId, newHops);
      }
    }
  }
}
```

**Result: Automatic mesh network with route learning!**

After announcements propagate:

**Machine A knows:**

- pty-server (local, 0 hops)
- parser-server (via B, 1 hop)
- gpu-server (via C, 1 hop)
- mp4-server (local, 0 hops)

**Machine B knows:**

- parser-server (local, 0 hops)
- pty-server (via A, 1 hop)
- gpu-server (via C, 1 hop)
- gpu-server (via A→C, 2 hops) ← Alternative route!

**Machine C knows:**

- gpu-server (local, 0 hops)
- pty-server (via A, 1 hop)
- parser-server (via B, 1 hop)

**Approach 2: Central Registry (Simpler)**

```typescript
// registry-server.ts
class RegistryServer {
  private services = new Map<string, ServiceLocation>();

  register(service: string, machineId: string, address: string): void {
    this.services.set(service, { machineId, address });
    this.notifyUpdate(service);
  }

  lookup(service: string): ServiceLocation | null {
    return this.services.get(service) || null;
  }
}

// Each machine queries registry on startup
const location = await registryServer.lookup('gpu-server');
router.addRoute('gpu-server', 'machine-c', location.address);
```

### Configuration-Driven Distributed Deployment

Define your machine topology in YAML:

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
# Routing is automatic via service discovery!
```

### Real-World Inspirations

This pattern has been proven in production systems:

**Plan 9's Distributed Filesystem:**

```
/net/tcp!server!9001/data  ← Network connection as a file
```

Exactly like our terminals! Plan 9 called them "network dialers."

**QNX Neutrino's Network IPC:**

```c
fd = open("/net/machine2/dev/serial1", O_RDWR);
// Automatically routed to machine2
```

**Erlang's Distributed Processes:**

```erlang
% Send message to process on any node
{gpu_server, 'machine_c@cluster'} ! {process_frame, Frame}
% Erlang runtime routes automatically
```

**Kubernetes Service Mesh:**

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
# Kubernetes routes to any pod with label app=gpu
```

### Our Advantages

**What makes our approach unique:**

✅ **Configuration-driven** - Same code, different topology  
✅ **Kernel agnostic** - Routing is just another server!  
✅ **Transport agnostic** - Unix sockets, TCP, WebSocket, whatever  
✅ **Automatic discovery** - Service mesh finds routes  
✅ **Location transparency** - Servers don't know where peers are  
✅ **Multi-hop routing** - Data flows through multiple machines seamlessly  
✅ **Hairpin/loopback** - Remote processing with local return

**The routing server is policy, not mechanism.** The kernel provides pipes; the routing server uses them to implement distributed routing.

---

## Supervision & Fault Tolerance

### Who Restarts Crashed Servers?

**NOT the kernel!** This is policy, not mechanism.

In GNU Hurd, the kernel (Mach) does NOT restart servers. Instead:

```
┌─────────────────────────────────────────────┐
│  Mach Microkernel                           │
│  - Task/thread management                   │
│  - IPC (ports and messages)                 │
│  - Virtual memory                           │
│  - Does NOT restart servers!                │
└─────────────┬───────────────────────────────┘
              │ IPC
┌─────────────┴───────────────────────────────┐
│  Bootstrap Server (like init)               │
│  - Starts essential servers                 │
│  - Provides name service                    │
│  - Monitors critical servers                │
└─────────────┬───────────────────────────────┘
              │ Starts & monitors
    ┌─────────┼──────────┬──────────┐
    ↓         ↓          ↓          ↓
┌────────┐ ┌────────┐ ┌──────┐ ┌────────┐
│  proc  │ │  auth  │ │  fs  │ │  net   │  ← Servers
│ server │ │ server │ │server│ │ server │
└────────┘ └────────┘ └──────┘ └────────┘
```

**Who restarts crashed servers?**

1. Bootstrap/supervisor server - monitors critical servers
2. `proc` server - tracks all processes, notifies of deaths
3. Peer servers - servers can monitor each other
4. External supervisor (like systemd)

**The kernel provides IPC. Supervision is a server.**

### Supervisor Server Pattern

```typescript
// supervisor-server.ts
class SupervisorServer {
  private servers = new Map<string, ChildProcess>();

  async start(config: Config) {
    if (config.deployment === 'single-process') {
      this.startInProcess();
    } else if (config.deployment === 'multi-process') {
      this.startMultiProcess();
    } else {
      this.connectDistributed();
    }
  }

  private async startMultiProcess() {
    const pty = spawn('node', ['servers/pty-server.js']);
    const parser = spawn('node', ['servers/parser-server.js']);
    const mp4 = spawn('node', ['servers/mp4-server.js']);

    this.servers.set('pty', pty);
    this.servers.set('parser', parser);
    this.servers.set('mp4', mp4);

    // Monitor and restart
    this.servers.forEach((proc, name) => {
      proc.on('exit', (code) => {
        console.log(`[Supervisor] ${name} crashed (code ${code})`);
        this.restartServer(name);
      });
    });
  }

  private async restartServer(name: string) {
    console.log(`[Supervisor] Restarting ${name}...`);
    const config = this.getServerConfig(name);
    const proc = spawn('node', [config.path]);
    this.servers.set(name, proc);
  }
}
```

**The supervisor is just another server.** The kernel doesn't know or care.

### Fault Isolation Benefits

```typescript
// If MP4 server crashes, others keep working
mp4Server.on('error', (err) => {
  console.error('MP4 recording failed:', err);
  // Kernel removes module from topology
  // Screen, TTS, AI formatter continue working
});
```

**Isolation = resilience.** One server's crash doesn't bring down the system.

---

## Microkernel Terminology: "On" vs "In"

### ✅ Correct Phrasings (like Mach/Hurd)

**Good:**

- "Servers run **on top of** the kernel"
- "Servers communicate **through** the kernel"
- "The kernel provides pipes **for** servers"
- "Servers **use** kernel-provided IPC"
- "Servers are **kernel clients**"
- "Each server is a separate module **outside** the kernel"

**Emphasize the boundary:**

- "The kernel provides IPC (pipes), servers provide logic"
- "The kernel never knows about server semantics"
- "Servers implement all business logic"
- "The kernel is just plumbing; servers are applications"

### ❌ Incorrect Phrasings (sound monolithic)

**Bad:**

- "Servers run **in** the kernel" ← implies kernel space (monolithic)
- "The kernel **contains** servers" ← wrong architecture
- "Servers are **part of** the kernel" ← defeats the purpose
- "The kernel **executes** servers" ← kernel doesn't run them
- "Our kernel **has** PTY/parser/recording" ← sounds monolithic

### The "In" vs "On" vs "Through" Test

- ❌ "Servers run **IN** the kernel" → Sounds like kernel space (monolithic)
- ✅ "Servers run **ON** the kernel" → Correct! Like "apps run on Linux"
- ✅ "Servers communicate **THROUGH** the kernel" → Perfect! Emphasizes IPC boundary
- ✅ "Servers **use** kernel-provided IPC" → Clear separation of concerns

### Example Documentation

**Good:**

> "The terminal-renderer system uses a microkernel architecture. The kernel provides stream-based IPC primitives (pipes) and a service registry. All functionality is implemented as separate servers that communicate through kernel-provided pipes. For example, the PTY server, parser server, and MP4 recorder server all run as independent modules outside the kernel."

**Bad:**

> "Our kernel runs PTY servers, parsers, and recorders in it." ← Sounds monolithic!

---

## Comparison to Current mkolbol

### Current mkolbol (MCP-focused)

```typescript
// JSON-RPC/MCP is built INTO the kernel
class Router {
  async handle(session, req: JsonRpcRequest): Promise<JsonRpcResponse>;
}

class InProcBus {
  async dispatch(session, msg: JsonRpcRequest | McpNotification, handler);
}
```

**Limitations:**

- Kernel knows about JSON-RPC, MCP, sessions
- Hard to support other protocols
- Not suitable for raw byte streams (PTY, video, audio)
- Single deployment mode (in-process only)

### Stream Kernel (Protocol-agnostic)

```typescript
// Kernel is pure plumbing
class Kernel {
  createPipe(type?: 'local' | 'unix' | 'tcp'): Pipe;
  connect(from: Pipe, to: Pipe): void;
  split(source: Pipe, destinations: Pipe[]): void;
}

// MCP is a MODULE on top
class MCPRouter {
  inputPipe: Pipe;
  outputPipe: Pipe;
  // Handles JSON-RPC in a transform module
}
```

**Advantages:**

- Kernel never changes (rock solid)
- Any protocol can be implemented as modules
- Raw byte streams (PTY) work perfectly
- AI, video, audio, network all work the same way
- **Deployment flexibility:** single process → multi-process → distributed
- **Transport abstraction:** same code, different deployment

---

## Success Criteria

This architecture succeeds if:

✅ **Kernel stability** - Kernel never needs changes after v1.0  
✅ **Protocol flexibility** - Can implement JSON-RPC, MCP, gRPC, custom protocols as modules  
✅ **PTY hijacking** - Can intercept and transform terminal I/O completely  
✅ **Multi-modal I/O** - Multiple inputs and outputs work simultaneously  
✅ **AI integration** - AI can see screenshots, formatted text, and send commands  
✅ **Browser support** - Runs in browser with extension capabilities  
✅ **Testability** - Each module is independently testable  
✅ **Composability** - Complex systems emerge from simple compositions  
✅ **Performance** - Zero-copy fast paths, automatic backpressure

---

## Microkernel Design Philosophy

### Mechanism vs Policy

**Core principle from L4/Mach/Hurd:**

- **Mechanism (kernel):** IPC primitives (pipes, connections, registry)
- **Policy (servers):** What data means, how to process it, who talks to whom

**Location is policy, not mechanism!**

Key insights from L4 family:

1. **Location transparency:** Servers don't know if peer is local or remote
2. **Migration:** Server can move from process A to process B without API changes
3. **Replication:** Multiple instances of a server can run; clients don't care
4. **Load balancing:** Distribute across machines based on load

### The Plan 9 Insight

Plan 9: Everything is a file (stream).

```
/net/tcp!server!9001/data  ← Network connection (looks like file)
/srv/pty                   ← Server (looks like file)
/proc/123/mem              ← Process memory (looks like file)
```

Same `open()`/`read()`/`write()` API for everything.

**Our pipes are the same idea!** Same pipe API whether local, Unix socket, or TCP.

### What We Learned from Existing Microkernels

**From Mach:** Stable kernel foundation, services in user space  
**From L4:** Mechanism vs policy separation, performance optimization  
**From QNX:** Network-transparent IPC, location transparency  
**From Plan 9:** Everything-is-a-stream abstraction  
**From GNU Hurd:** Server architecture, supervision patterns

**Our contribution:** Apply these principles to terminal I/O and AI agent systems.

---

## Conclusion

The stream kernel provides **maximum flexibility with minimal complexity**:

- **~100 line kernel** that never changes
- **Protocol agnostic** - works with any data format
- **PTY-first** - designed for terminal I/O hijacking
- **AI-friendly** - easy to extract and format terminal data
- **Browser-ready** - TypeScript works in Node and browsers
- **Deployment flexible** - single binary → multi-process → distributed
- **Infinitely extensible** - any module can be added without kernel changes

### The Magic

**The kernel never changes.** Only pipe implementations change.

**Servers never change.** They just use pipes.

**Configuration changes.** Same code, different deployment.

**This is the microkernel dream!** QNX, L4, Plan 9 all achieved this. Now we bring it to terminal I/O and AI agent systems.

### Next Steps

1. ✅ Review and approve this RFC
2. Implement core kernel (~100 lines)
3. Build basic modules (Keyboard, PTY, Screen)
4. Prove the concept with working demo
5. Add deployment flexibility (multi-process, distributed)
6. Expand module ecosystem

**Let's build the most flexible PTY system ever created.** 🚀
