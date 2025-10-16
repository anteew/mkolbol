# Authoring a Module — Developer Guide

This guide shows you how to build custom modules for mkolbol. Modules are reusable components that can be wired together into topologies via YAML configuration.

## Module Anatomy

Every mkolbol module follows this pattern:

```typescript
// src/modules/myModule.ts

interface MyModuleOptions {
  // Your configuration parameters
  enabled?: boolean;
  prefix?: string;
}

export class MyModule {
  // Input and output pipes (set by framework)
  inputPipe?: NodeJS.ReadableStream;
  outputPipe?: NodeJS.WritableStream;

  private options: MyModuleOptions;

  // Constructor: (kernel, options)
  constructor(private kernel: Kernel, options: MyModuleOptions = {}) {
    this.options = options;
  }

  // Lifecycle methods (optional)
  start(): void {
    // Called when topology starts
  }

  stop(): void {
    // Called when topology shuts down
  }
}
```

## Constructor Pattern

The mkolbol framework instantiates modules with a standard pattern:

```typescript
// Framework calls:
const module = new ModuleClass(kernel, options);
```

**Constructor Parameters:**
- `kernel`: Microkernel instance for creating pipes
- `options`: Configuration object from YAML

## Example: Simple Transform

Let's build a `ReverseTransform` that reverses text:

```typescript
// src/modules/reverseTransform.ts

import { Kernel } from '../kernel/Kernel';
import type { NodeJS } from 'stream';

interface ReverseTransformOptions {
  // Optional: could add case options, etc.
  preserveNewlines?: boolean;
}

export class ReverseTransform {
  inputPipe?: NodeJS.ReadableStream;
  outputPipe?: NodeJS.WritableStream;

  private options: ReverseTransformOptions;

  constructor(private kernel: Kernel, options: ReverseTransformOptions = {}) {
    this.options = {
      preserveNewlines: options.preserveNewlines ?? true,
      ...options
    };
  }

  start(): void {
    if (!this.inputPipe || !this.outputPipe) {
      throw new Error('Pipes not connected');
    }

    this.inputPipe.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      const reversed = this.reverseText(text);
      this.outputPipe!.write(reversed);
    });

    this.inputPipe.on('end', () => {
      this.outputPipe!.end();
    });

    this.inputPipe.on('error', (err) => {
      console.error('ReverseTransform input error:', err);
    });
  }

  private reverseText(text: string): string {
    if (this.options.preserveNewlines) {
      // Keep newlines in place
      const lines = text.split('\n');
      return lines.map(line => [...line].reverse().join('')).join('\n');
    }
    return [...text].reverse().join('');
  }

  stop(): void {
    // Cleanup if needed
  }
}
```

## Using in YAML Config

Once your module is registered (see "Registration" below), use it in configs:

```yaml
nodes:
  - id: timer
    module: TimerSource
    params:
      periodMs: 1000

  - id: reverser
    module: ReverseTransform
    params:
      preserveNewlines: true

  - id: output
    module: ConsoleSink
    params:
      prefix: "[reversed]"

connections:
  - from: timer.output
    to: reverser.input
  - from: reverser.output
    to: output.input
```

## Input/Output Pipes

Modules receive pipes from the framework for data flow:

```typescript
// Framework sets these
inputPipe?: NodeJS.ReadableStream;   // Data comes in
outputPipe?: NodeJS.WritableStream;  // Data goes out

// In start(), connect them:
this.inputPipe.on('data', (chunk: Buffer) => {
  const processed = process(chunk);
  this.outputPipe.write(processed);
});
```

### Handling Backpressure

For efficient streaming, respect backpressure signals:

```typescript
start(): void {
  this.inputPipe.on('data', (chunk: Buffer) => {
    const canContinue = this.outputPipe.write(processed);

    if (!canContinue) {
      // Pause input until output is ready
      this.inputPipe.pause();
    }
  });

  this.outputPipe.on('drain', () => {
    // Resume input when output is ready
    this.inputPipe.resume();
  });
}
```

## Module Types

### Source Module (No Input)

```typescript
export class TimerSource {
  outputPipe?: NodeJS.WritableStream;

  constructor(private kernel: Kernel, private options: TimerOptions) {}

  start(): void {
    setInterval(() => {
      this.outputPipe!.write('tick\n');
    }, this.options.periodMs);
  }

  stop(): void {
    // Cleanup timers
  }
}
```

### Transform Module (Input → Output)

```typescript
export class UppercaseTransform {
  inputPipe?: NodeJS.ReadableStream;
  outputPipe?: NodeJS.WritableStream;

  start(): void {
    this.inputPipe!.on('data', (chunk: Buffer) => {
      this.outputPipe!.write(chunk.toString().toUpperCase());
    });
  }
}
```

### Sink Module (Input Only)

```typescript
export class ConsoleSink {
  inputPipe?: NodeJS.ReadableStream;

  constructor(private kernel: Kernel, private options: ConsoleSinkOptions) {}

  start(): void {
    this.inputPipe!.on('data', (chunk: Buffer) => {
      const prefix = this.options.prefix ? `${this.options.prefix} ` : '';
      console.log(prefix + chunk.toString());
    });
  }
}
```

## Registration

Before a module can be used in YAML configs, it must be registered:

### 1. Register in ModuleRegistry

```typescript
// src/executor/moduleRegistry.ts

import { MyModule } from '../modules/myModule';

export class ModuleRegistry {
  private registry = new Map<string, any>();

  constructor() {
    // Built-in modules
    this.register('TimerSource', TimerSource);
    this.register('UppercaseTransform', UppercaseTransform);
    this.register('ConsoleSink', ConsoleSink);

    // Your custom module
    this.register('MyModule', MyModule);
  }

  register(name: string, constructor: any): void {
    this.registry.set(name, constructor);
  }

  get(name: string): any {
    return this.registry.get(name);
  }
}
```

### 2. Update Executor Module Path Map

For worker-mode modules, add to the path map:

```typescript
// src/executor/Executor.ts

private getModulePath(moduleName: string): string {
  const moduleMap: Record<string, string> = {
    'TimerSource': '../modules/timer.js',
    'MyModule': '../modules/myModule.js',  // Add here
  };
  // ...
}
```

## Testing Your Module

Create comprehensive tests:

```typescript
// tests/modules/myModule.spec.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kernel } from 'mkolbol';
import { MyModule } from 'src/modules/myModule';
import { Readable, Writable } from 'stream';

describe('MyModule', () => {
  let kernel: Kernel;
  let module: MyModule;
  let input: Readable;
  let output: Writable;
  let results: Buffer[] = [];

  beforeEach(() => {
    kernel = new Kernel();
    module = new MyModule(kernel, { /* options */ });

    // Create mock pipes
    input = Readable.from(['hello\n', 'world\n']);
    output = new Writable({
      write(chunk, encoding, callback) {
        results.push(chunk);
        callback();
      }
    });

    module.inputPipe = input;
    module.outputPipe = output;
  });

  afterEach(() => {
    module.stop();
  });

  it('should process input correctly', async () => {
    module.start();

    // Wait for all data to process
    await new Promise(resolve => output.on('finish', resolve));

    expect(results).toHaveLength(2);
    expect(results[0].toString()).toBe('HELLO\n');
    expect(results[1].toString()).toBe('WORLD\n');
  });

  it('should handle empty input', async () => {
    const emptyInput = Readable.from([]);
    module.inputPipe = emptyInput;

    module.start();
    await new Promise(resolve => output.on('finish', resolve));

    expect(results).toHaveLength(0);
  });

  it('should emit errors appropriately', async () => {
    const errorInput = new Readable({
      read() {
        this.emit('error', new Error('test error'));
      }
    });

    module.inputPipe = errorInput;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    module.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('test error')
    );
  });
});
```

## Configuration Validation

Add typed options interfaces for configuration:

```typescript
interface MyModuleOptions {
  // Documented options
  enabled?: boolean;
  timeout?: number;
  maxRetries?: number;
  prefix?: string;
}

export class MyModule {
  private options: Required<MyModuleOptions>;

  constructor(kernel: Kernel, options: MyModuleOptions = {}) {
    // Apply defaults
    this.options = {
      enabled: options.enabled ?? true,
      timeout: options.timeout ?? 5000,
      maxRetries: options.maxRetries ?? 3,
      prefix: options.prefix ?? '[module]'
    };

    // Validate
    if (this.options.timeout < 0) {
      throw new Error('timeout must be non-negative');
    }
  }
}
```

## Example: Counter Module

Here's a complete example of a simple counter:

```typescript
// src/modules/counter.ts

import { Kernel } from '../kernel/Kernel';

interface CounterOptions {
  format?: 'raw' | 'json';
}

export class Counter {
  inputPipe?: NodeJS.ReadableStream;
  outputPipe?: NodeJS.WritableStream;

  private count = 0;
  private options: CounterOptions;

  constructor(private kernel: Kernel, options: CounterOptions = {}) {
    this.options = { format: options.format ?? 'raw' };
  }

  start(): void {
    this.inputPipe!.on('data', () => {
      this.count++;

      const output = this.options.format === 'json'
        ? JSON.stringify({ count: this.count, timestamp: Date.now() })
        : this.count.toString();

      this.outputPipe!.write(output + '\n');
    });

    this.inputPipe!.on('end', () => {
      this.outputPipe!.end();
    });
  }

  // Expose metrics for testing/monitoring
  getCount(): number {
    return this.count;
  }

  stop(): void {
    // Cleanup if needed
  }
}
```

Usage in YAML:

```yaml
nodes:
  - id: timer
    module: TimerSource
    params: { periodMs: 500 }

  - id: counter
    module: Counter
    params: { format: json }

  - id: sink
    module: ConsoleSink

connections:
  - from: timer.output
    to: counter.input
  - from: counter.output
    to: sink.input
```

## Common Patterns

### Pattern 1: Stateful Transform

```typescript
export class BufferTransform {
  private buffer: Buffer[] = [];
  private flushInterval: NodeJS.Timer | null = null;

  start(): void {
    this.flushInterval = setInterval(() => {
      if (this.buffer.length > 0) {
        const combined = Buffer.concat(this.buffer);
        this.outputPipe!.write(combined);
        this.buffer = [];
      }
    }, 100);

    this.inputPipe!.on('data', (chunk: Buffer) => {
      this.buffer.push(chunk);
    });
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}
```

### Pattern 2: Conditional Output

```typescript
export class FilterTransform {
  constructor(private kernel: Kernel, private predicate: (chunk: Buffer) => boolean) {}

  start(): void {
    this.inputPipe!.on('data', (chunk: Buffer) => {
      if (this.predicate(chunk)) {
        this.outputPipe!.write(chunk);
      }
    });
  }
}
```

### Pattern 3: Multiple Outputs (Tee)

```typescript
export class TeeTransform {
  outputPipes: NodeJS.WritableStream[] = [];

  start(): void {
    this.inputPipe!.on('data', (chunk: Buffer) => {
      for (const output of this.outputPipes) {
        output.write(chunk);
      }
    });
  }
}
```

## Debugging Your Module

Add debug statements:

```typescript
import { debug as createDebug } from '../debug';

const debug = createDebug('MyModule');

export class MyModule {
  start(): void {
    debug.emit('mymodule', 'module.start', { timestamp: Date.now() });

    this.inputPipe!.on('data', (chunk: Buffer) => {
      debug.emit('mymodule', 'data.received', { size: chunk.length });
      // ...
    });

    this.inputPipe!.on('error', (err) => {
      debug.emit('mymodule', 'error', { message: err.message }, 'error');
    });
  }
}
```

View debug output in Laminar reports:

```bash
npm run lam -- show mymodule --around "module.start"
```

## Best Practices

✅ **DO:**
- Handle backpressure with pause/resume
- Clean up resources in stop()
- Validate options in constructor
- Add error handlers
- Write comprehensive tests
- Document configuration options
- Use TypeScript interfaces for options

❌ **DON'T:**
- Ignore backpressure (causes memory issues)
- Leave timers/intervals running after stop()
- Assume pipes are always connected
- Throw errors in callbacks (emit error events)
- Use synchronous I/O in hot paths
- Forget to handle stream 'end' events

## Publishing Your Module

To share your module:

1. **Create a new package**: `@myorg/mkolbol-module-xyz`
2. **Follow mkolbol conventions**: Constructor(kernel, options)
3. **Export module class**: `export { MyModule }`
4. **Add to registry**: Users add to their moduleRegistry
5. **Document YAML usage**: Show example configs
6. **Test thoroughly**: Unit + integration tests

Example package.json:

```json
{
  "name": "@myorg/mkolbol-csv-transform",
  "version": "1.0.0",
  "description": "CSV parsing transform for mkolbol",
  "exports": {
    ".": "./dist/index.js"
  },
  "peerDependencies": {
    "mkolbol": "^0.2.0"
  }
}
```

## Getting Help

- **Architecture**: See [Stream Kernel RFC](../rfcs/stream-kernel/00-index.md)
- **Examples**: Browse `src/modules/` and `src/transforms/`
- **Testing**: See [Wiring and Tests](./wiring-and-tests.md)
- **Configuration**: See [mkctl Cookbook](./mkctl-cookbook.md)

