# Module Types

All functionality lives in modules. The kernel just provides pipes.

## Module Interface Pattern

Every module follows this pattern:

```typescript
interface Module {
  // Input modules: only outputPipe
  // Output modules: only inputPipe
  // Transform modules: both
  // Source modules: both (bidirectional)
  // Routing modules: manage multiple pipes

  inputPipe?: Pipe; // Receives data
  outputPipe?: Pipe; // Sends data
}
```

##

1.  Input Modules

Generate user input and push to `outputPipe`:

```typescript
interface InputModule {
  type: 'input';
  outputPipe: Pipe;
}
```

### Examples

**Keyboard Input:**

```typescript
class KeyboardInput {
  outputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.outputPipe = kernel.createPipe();

    process.stdin.setRawMode(true);
    process.stdin.on('data', (buffer) => {
      this.outputPipe.write(buffer);
    });
  }
}
```

**Voice Input (Speech-to-Text):**

```typescript
class WhisperSTT {
  outputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.outputPipe = kernel.createPipe();

    const mic = new Microphone();
    mic.on('audio', async (audioBuffer) => {
      const text = await whisper.transcribe(audioBuffer);
      this.outputPipe.write(text + '\n');
    });
  }
}
```

**AI Agent Input:**

```typescript
class MCPInput {
  outputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.outputPipe = kernel.createPipe();
  }

  sendCommand(cmd: string): void {
    this.outputPipe.write(cmd);
  }
}
```

## 2. Source Modules

Bidirectional: run processes, expose input/output:

```typescript
interface SourceModule {
  type: 'source';
  inputPipe: Pipe; // Commands to send
  outputPipe: Pipe; // Output from process
}
```

### Examples

**Local PTY:**

```typescript
import * as pty from 'node-pty';

class LocalPTY {
  inputPipe: Pipe;
  outputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe();
    this.outputPipe = kernel.createPipe();

    const shell = pty.spawn('bash', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env,
    });

    shell.onData((data) => {
      this.outputPipe.write(Buffer.from(data));
    });

    this.inputPipe.on('data', (data) => {
      shell.write(data.toString());
    });
  }
}
```

**Docker PTY:**

```typescript
class DockerPTY {
  inputPipe: Pipe;
  outputPipe: Pipe;

  constructor(kernel: Kernel, options: { image: string; command: string }) {
    this.inputPipe = kernel.createPipe();
    this.outputPipe = kernel.createPipe();

    const container = await docker.run(options.image, [options.command], {
      Tty: true,
      AttachStdin: true,
      AttachStdout: true,
    });

    container.stdout.on('data', (data) => {
      this.outputPipe.write(data);
    });

    this.inputPipe.on('data', (data) => {
      container.stdin.write(data);
    });
  }
}
```

## 3. Transform Modules

Process data in flight:

```typescript
interface TransformModule {
  type: 'transform';
  inputPipe: Pipe;
  outputPipe: Pipe;
}
```

### Examples

**ANSI Parser:**

```typescript
class ANSIParser {
  inputPipe: Pipe;
  outputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe();
    this.outputPipe = kernel.createPipe();

    this.inputPipe.on('data', (buffer: Buffer) => {
      const parsed = this.parseANSI(buffer);
      this.outputPipe.write(parsed);
    });
  }

  private parseANSI(buffer: Buffer): TerminalState {
    // Parse ANSI escape sequences
    // Return structured terminal state
  }
}
```

**AI Text Formatter:**

```typescript
class AITextFormatter {
  inputPipe: Pipe;
  outputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe();
    this.outputPipe = kernel.createPipe();

    this.inputPipe.on('data', (terminalState) => {
      const formatted = this.formatForAI(terminalState);
      this.outputPipe.write(formatted);
    });
  }

  private formatForAI(state: TerminalState): string {
    // Convert to LLM-friendly markdown
    // Remove redundant whitespace
    // Add context markers
  }
}
```

## 4. Output Modules

Display or record results:

```typescript
interface OutputModule {
  type: 'output';
  inputPipe: Pipe;
}
```

### Examples

**Screen Renderer:**

```typescript
class ScreenRenderer {
  inputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe();

    this.inputPipe.on('data', (state: TerminalState) => {
      this.renderToScreen(state);
    });
  }

  private renderToScreen(state: TerminalState): void {
    // Update terminal display
    process.stdout.write(this.renderCells(state.cells));
  }
}
```

**Canvas Renderer:**

```typescript
class CanvasRenderer {
  inputPipe: Pipe;
  private canvas: HTMLCanvasElement;

  constructor(kernel: Kernel, canvas: HTMLCanvasElement) {
    this.inputPipe = kernel.createPipe();
    this.canvas = canvas;

    this.inputPipe.on('data', (state: TerminalState) => {
      this.renderToCanvas(state);
    });
  }

  private renderToCanvas(state: TerminalState): void {
    const ctx = this.canvas.getContext('2d');
    // Draw terminal cells to canvas
  }
}
```

**MP4 Recorder:**

```typescript
class MP4Recorder {
  inputPipe: Pipe;
  private encoder: VideoEncoder;

  constructor(kernel: Kernel, options: { fps: number; width: number; height: number }) {
    this.inputPipe = kernel.createPipe();
    this.encoder = new VideoEncoder(options);

    this.inputPipe.on('data', (frame: ImageData) => {
      this.encoder.addFrame(frame);
    });
  }

  async save(filename: string): Promise<void> {
    await this.encoder.finalize(filename);
  }
}
```

## 5. Routing Modules

Manage terminals and route data between services:

```typescript
interface RoutingModule {
  type: 'routing';
  // Manages multiple pipes (terminals)
}
```

### Example

**Routing Server:**

```typescript
class RoutingServer {
  private kernel: Kernel;
  private terminals = new Map<string, Terminal>();
  private routes = new Map<string, Route>();

  constructor(kernel: Kernel) {
    this.kernel = kernel;

    kernel.register(
      'router',
      {
        type: 'routing',
        features: ['service-discovery', 'multi-hop'],
      },
      kernel.createPipe(),
    );
  }

  createTerminal(name: string, type: 'local' | 'network'): Terminal {
    const terminal = {
      name,
      type,
      inputPipe: this.kernel.createPipe(),
      outputPipe: this.kernel.createPipe(),
    };

    terminal.inputPipe.on('data', (envelope) => {
      this.route(envelope, terminal);
    });

    this.terminals.set(name, terminal);
    return terminal;
  }

  private route(envelope: Envelope, from: Terminal): void {
    const route = this.routes.get(envelope.destination);
    if (route) {
      const dest = this.terminals.get(route.terminal);
      dest?.outputPipe.write(envelope);
    }
  }

  addRoute(service: string, terminal: string): void {
    this.routes.set(service, { service, terminal });
  }
}
```

See **[Distributed Service Mesh](06-distributed-service-mesh.md)** for detailed routing patterns.

## Module Composition Patterns

### Pattern 1: Linear Pipeline

```typescript
kernel.connect(source.output, transform1.input);
kernel.connect(transform1.output, transform2.input);
kernel.connect(transform2.output, sink.input);

// source → transform1 → transform2 → sink
```

### Pattern 2: Fan-Out (Multi-Modal Output)

```typescript
kernel.split(source.output, [sink1.input, sink2.input, sink3.input]);

// source → sink1
//       ↘ sink2
//       ↘ sink3
```

### Pattern 3: Fan-In (Multi-Input)

```typescript
kernel.merge([input1.output, input2.output, input3.output], sink.input);

// input1 ↘
// input2 → sink
// input3 ↗
```

### Pattern 4: Hybrid (Multi-Input + Multi-Output)

```typescript
kernel.merge([keyboard.output, voice.output], pty.input);
kernel.split(pty.output, [screen.input, canvas.input, ai.input]);

// keyboard ↘
// voice    → pty → screen
//                 ↘ canvas
//                 ↘ ai
```

## Module Discovery

Modules advertise capabilities for dynamic discovery:

```typescript
// Register with capabilities
kernel.register(
  'xterm-parser',
  {
    type: 'transform',
    accepts: ['raw-ansi'],
    produces: ['terminal-state'],
    features: ['vt100', 'xterm-256color', 'unicode'],
  },
  parserPipe,
);

// Find compatible modules
const parsers = kernel.lookup({
  accepts: ['raw-ansi'],
});

// Returns Map of matching modules
for (const [name, pipe] of parsers) {
  console.log(`Found parser: ${name}`);
  kernel.connect(source.output, pipe);
}
```

## Module Lifecycle

```
┌─────────────────────────────────────┐
│ 1. Constructor                      │
│    - Create input/output pipes      │
│    - Register with kernel           │
│    - Set up event handlers          │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 2. Wiring                           │
│    - kernel.connect/split/merge     │
│    - Module doesn't know peers      │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 3. Data Flow                        │
│    - Receive via inputPipe 'data'   │
│    - Process                        │
│    - Write to outputPipe            │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 4. Cleanup (optional)               │
│    - Close pipes                    │
│    - Release resources              │
└─────────────────────────────────────┘
```

## Best Practices

### ✅ Do

- Keep modules focused on single responsibility
- Use `kernel.createPipe()` for all pipes
- Register capabilities for discovery
- Handle backpressure (Node.js does this automatically)
- Emit errors on pipes: `pipe.emit('error', err)`

### ❌ Don't

- Don't store references to other modules
- Don't hardcode pipe connections (use kernel.connect)
- Don't assume pipe location (local vs remote)
- Don't parse/transform in output modules
- Don't output in transform modules (use separate module)

## Testing Modules

Modules are testable in isolation:

```typescript
describe('ANSIParser', () => {
  it('parses color codes', () => {
    const mockKernel = {
      createPipe: () => new PassThrough({ objectMode: true }),
    };

    const parser = new ANSIParser(mockKernel);

    parser.inputPipe.write(Buffer.from('\x1b[31mRed text'));

    parser.outputPipe.once('data', (state) => {
      expect(state.cells[0].fg).toBe('red');
    });
  });
});
```

**No need to instantiate the entire system!**

## Building Your First Module

Ready to create your own module? Check out the **[First Server Tutorial](../../devex/first-server-tutorial.md)** for step-by-step instructions on building:

- **Transform modules** (in-process, TypeScript)
- **External process modules** (any language, subprocess)

The tutorial includes complete code examples, Hostess registration, debugging tips, and a smoke test checklist.

## Next Steps

See:

- **[First Server Tutorial](../../devex/first-server-tutorial.md)** - Build your own module (start here!)
- **[PTY Use Cases](04-pty-use-cases.md)** - Real-world module compositions
- **[Distributed Service Mesh](06-distributed-service-mesh.md)** - Routing module details
- **[Service Registry](08-registry-server.md)** - Using capabilities for discovery
