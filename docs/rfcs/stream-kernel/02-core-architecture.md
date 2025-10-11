# Core Architecture

## The Kernel API

The complete kernel API in ~100 lines:

```typescript
import { PassThrough, Duplex } from 'stream';

type Pipe = Duplex;

interface ServiceCapabilities {
  type: 'input' | 'source' | 'transform' | 'output' | 'routing';
  accepts?: string[];
  produces?: string[];
  features?: string[];
}

class Kernel {
  private services = new Map<string, { caps: ServiceCapabilities; pipe: Pipe }>();

  /**
   * Create a new pipe (data channel)
   */
  createPipe(type: 'local' | 'unix' | 'tcp' = 'local'): Pipe {
    switch (type) {
      case 'local':
        return new PassThrough({ objectMode: true });
      case 'unix':
        // TODO: UnixSocketPipe implementation
        throw new Error('Not implemented');
      case 'tcp':
        // TODO: TCPPipe implementation  
        throw new Error('Not implemented');
    }
  }

  /**
   * Connect two pipes: from.output → to.input
   */
  connect(from: Pipe, to: Pipe): void {
    from.pipe(to);
  }

  /**
   * Split: one source → multiple destinations (fan-out)
   */
  split(from: Pipe, to: Pipe[]): void {
    for (const dest of to) {
      from.pipe(dest);
    }
  }

  /**
   * Merge: multiple sources → one destination (fan-in)
   */
  merge(from: Pipe[], to: Pipe): void {
    for (const source of from) {
      source.pipe(to);
    }
  }

  /**
   * Register a service with capabilities
   */
  register(name: string, capabilities: ServiceCapabilities, pipe: Pipe): void {
    this.services.set(name, { caps: capabilities, pipe });
  }

  /**
   * Look up services by capabilities
   */
  lookup(query: Partial<ServiceCapabilities>): Map<string, Pipe> {
    const results = new Map<string, Pipe>();

    for (const [name, { caps, pipe }] of this.services) {
      let matches = true;

      if (query.type && caps.type !== query.type) {
        matches = false;
      }

      if (query.accepts && caps.accepts) {
        const hasAccepts = query.accepts.some(a => caps.accepts!.includes(a));
        if (!hasAccepts) matches = false;
      }

      if (query.produces && caps.produces) {
        const hasProduces = query.produces.some(p => caps.produces!.includes(p));
        if (!hasProduces) matches = false;
      }

      if (matches) {
        results.set(name, pipe);
      }
    }

    return results;
  }
}

export { Kernel, Pipe, ServiceCapabilities };
```

**Total: ~100 lines. This is the entire kernel.**

## Core Operations

### createPipe()

Creates a bidirectional data channel:

```typescript
const pipe = kernel.createPipe();

// Write to pipe
pipe.write({ type: 'data', value: 42 });

// Read from pipe
pipe.on('data', (data) => {
  console.log(data);  // { type: 'data', value: 42 }
});
```

**Uses Node.js Duplex streams internally** - battle-tested, automatic backpressure.

### connect(from, to)

Pipes data from one pipe to another:

```typescript
const source = kernel.createPipe();
const dest = kernel.createPipe();

kernel.connect(source, dest);

source.write('hello');
// 'hello' automatically flows to dest
```

**Implementation:** Just `from.pipe(to)` - Node.js handles everything!

### split(source, [dest1, dest2, ...])

Fan-out: one source → multiple destinations

```typescript
const pty = kernel.createPipe();
const xterm = kernel.createPipe();
const canvas = kernel.createPipe();
const ai = kernel.createPipe();

kernel.split(pty, [xterm, canvas, ai]);

pty.write('data');
// All three destinations receive 'data' simultaneously
```

**Use case:** Multi-modal output (one PTY → many renderers)

### merge([source1, source2, ...], dest)

Fan-in: multiple sources → one destination

```typescript
const keyboard = kernel.createPipe();
const voice = kernel.createPipe();
const ai = kernel.createPipe();
const pty = kernel.createPipe();

kernel.merge([keyboard, voice, ai], pty);

keyboard.write('ls\n');   // PTY receives 'ls\n'
voice.write('cd /\n');    // PTY receives 'cd /\n'
ai.write('pwd\n');        // PTY receives 'pwd\n'
```

**Use case:** Multi-input (keyboard + voice + AI → single PTY)

### register(name, capabilities, pipe)

Advertise a service for discovery:

```typescript
kernel.register('xterm-parser', {
  type: 'transform',
  accepts: ['raw-ansi'],
  produces: ['terminal-state'],
  features: ['vt100', 'xterm-256color']
}, parserPipe);
```

**Use case:** Dynamic service discovery, capability-based routing

### lookup(query)

Find services by capabilities:

```typescript
// Find all parsers that produce terminal-state
const parsers = kernel.lookup({
  produces: ['terminal-state']
});

// Find all AI-compatible modules
const aiModules = kernel.lookup({
  produces: ['ai-text']
});
```

**Use case:** Dynamic composition, plugin discovery

## Pipe Lifecycle

```
┌─────────────────────────────────────┐
│ 1. Create pipes                     │
│    const p1 = kernel.createPipe()   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 2. Connect pipes                    │
│    kernel.connect(p1, p2)           │
│    kernel.split(p1, [p2, p3])       │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 3. Data flows automatically         │
│    p1.write('data')                 │
│    → p2/p3 receive via 'data' event │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ 4. Backpressure handled by Node.js  │
│    If p2 is slow, p1.write() blocks │
└─────────────────────────────────────┘
```

## Data Flow Example

```typescript
// Create kernel
const kernel = new Kernel();

// Create modules
const keyboard = new KeyboardInput(kernel);
const pty = new PTY(kernel);
const parser = new ANSIParser(kernel);
const screen = new ScreenRenderer(kernel);

// Wire up the flow
kernel.connect(keyboard.output, pty.input);   // Keyboard → PTY
kernel.connect(pty.output, parser.input);     // PTY → Parser
kernel.connect(parser.output, screen.input);  // Parser → Screen

// Start typing
// keyboard → pty → parser → screen
// User sees their typing rendered to screen!
```

**The kernel just provides the plumbing. Modules do all the work.**

## Key Insights

### 1. Node.js Streams Do the Heavy Lifting

We don't implement:
- Buffering (Node.js does it)
- Backpressure (Node.js does it)  
- Error propagation (Node.js does it)
- Pause/resume (Node.js does it)

**The kernel is a thin wrapper over Node.js streams.**

### 2. The Kernel Never Changes

To add a new feature:
1. ❌ Don't modify the kernel
2. ✅ Create a new module
3. ✅ Wire it up with connect/split/merge

**The kernel API is stable from day 1.**

### 3. Pipes are Bidirectional

A single `Pipe` can both read and write:

```typescript
// Write to pipe
pipe.write(data);

// Read from pipe  
pipe.on('data', (data) => { ... });
```

This enables request/response patterns without multiple pipes.

### 4. Object Mode by Default

```typescript
createPipe({ objectMode: true })
```

Pipes carry **objects** (not just bytes), which is perfect for:
- JSON-RPC messages
- MCP protocol  
- Structured terminal state
- Any JavaScript object

For raw bytes (PTY output), modules can convert:

```typescript
class PTY {
  constructor(kernel) {
    this.output = kernel.createPipe();
    
    pty.stdout.on('data', (buffer: Buffer) => {
      this.output.write(buffer);  // Buffer flows through pipe
    });
  }
}
```

## Platform Support

### Node.js (Primary)

```typescript
import { Kernel } from './kernel';

const kernel = new Kernel();
// Full Node.js stream support
```

### Browser (Future)

```typescript
import { Kernel } from './kernel';

const kernel = new Kernel();
// Uses browser-compatible stream polyfill
// Or TransformStream (Streams API)
```

Same API, different stream implementation!

## What the Kernel Does NOT Do

❌ Parse data formats  
❌ Understand protocols  
❌ Route messages (except basic fan-out/fan-in)  
❌ Transform data  
❌ Handle errors (beyond stream errors)  
❌ Supervise modules  
❌ Manage lifecycles  
❌ Implement transports  
❌ Compress/encrypt  
❌ Authenticate  
❌ Log events  

**All of those are module responsibilities.**

## Next Steps

See:
- **[Module Types](03-module-types.md)** - How to build modules on this kernel
- **[PTY Use Cases](04-pty-use-cases.md)** - Real-world examples
- **[Service Registry](07-service-registry.md)** - Using register/lookup for discovery
