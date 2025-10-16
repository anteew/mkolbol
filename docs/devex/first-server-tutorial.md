# First Server Tutorial: Building Your Own Module

This tutorial teaches you how to create your first custom server module for mkolbol. You'll learn two approaches: a simple **Transform module** (in-process) and an **External process** module (subprocess). By the end, you'll have a working module that integrates with the mkolbol kernel.

## Prerequisites

- Node.js 20 or higher
- TypeScript basics
- Familiarity with streams (Node.js Duplex/Transform)
- mkolbol installed in your project: `npm install mkolbol`

## Two Paths to Choose From

| Path | Best For | Complexity | Language | Isolation |
|------|----------|------------|----------|-----------|
| **Transform (inproc)** | TypeScript/JavaScript, fast iteration, minimal overhead | Simple | TypeScript/JS only | None (same process) |
| **External (process)** | Any language, maximum isolation, existing CLI tools | Medium | Any (Python, Go, Rust, etc.) | Full (separate process) |

**Recommendation**: Start with Transform for learning, switch to External when you need multi-language support or process isolation.

---

## Path 1: Transform Module (In-Process)

A Transform module reads from `inputPipe`, processes data, and writes to `outputPipe`. It runs in the same Node.js process as the kernel.

### Example: UppercaseTransform

This module converts all incoming text to uppercase.

#### Step 1: Create the Module File

In your project (NOT the mkolbol kernel repo), create a new file:

```
your-project/
├── src/
│   └── modules/
│       └── UppercaseTransform.ts
├── package.json
└── tsconfig.json
```

**File: `src/modules/UppercaseTransform.ts`**

```typescript
import { Kernel } from 'mkolbol';
import { Transform } from 'stream';
import type { Pipe } from 'mkolbol/types/stream';

/**
 * UppercaseTransform - Converts all text to uppercase
 *
 * Type: Transform
 * Accepts: text (strings or buffers)
 * Produces: text (uppercase strings)
 */
export class UppercaseTransform {
  public readonly inputPipe: Pipe;
  public readonly outputPipe: Pipe;

  constructor(private kernel: Kernel) {
    // Create pipes via kernel
    this.inputPipe = kernel.createPipe({ objectMode: true });
    this.outputPipe = kernel.createPipe({ objectMode: true });

    // Use Node.js Transform stream for processing
    const transformer = new Transform({
      objectMode: true,
      transform(chunk, _encoding, callback) {
        // Convert chunk to string
        const text = typeof chunk === 'string'
          ? chunk
          : chunk.toString('utf8');

        // Transform and pass along
        const uppercased = text.toUpperCase();
        callback(null, uppercased);
      }
    });

    // Wire internal pipeline: inputPipe -> transformer -> outputPipe
    this.inputPipe.pipe(transformer).pipe(this.outputPipe);
  }
}
```

#### Step 2: Register with Hostess (Optional)

If you want service discovery, register your module with Hostess:

```typescript
import { Hostess, buildServerManifest, startHeartbeat } from 'mkolbol';

export class UppercaseTransform {
  public readonly inputPipe: Pipe;
  public readonly outputPipe: Pipe;
  private serverId?: string;
  private stopHeartbeat?: () => void;

  constructor(
    private kernel: Kernel,
    private hostess?: Hostess
  ) {
    this.inputPipe = kernel.createPipe({ objectMode: true });
    this.outputPipe = kernel.createPipe({ objectMode: true });

    const transformer = new Transform({
      objectMode: true,
      transform(chunk, _encoding, callback) {
        const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
        callback(null, text.toUpperCase());
      }
    });

    this.inputPipe.pipe(transformer).pipe(this.outputPipe);

    // Register with Hostess if provided
    if (this.hostess) {
      this.registerWithHostess();
    }
  }

  private registerWithHostess(): void {
    if (!this.hostess) return;

    const manifest = buildServerManifest({
      fqdn: 'localhost',
      servername: 'uppercase-transform',
      classHex: '0x1001',
      owner: 'user',
      terminals: [
        { name: 'input', type: 'local', direction: 'input' },
        { name: 'output', type: 'local', direction: 'output' }
      ],
      capabilities: {
        type: 'transform',
        accepts: ['text', 'string'],
        produces: ['text', 'string'],
        features: ['uppercase', 'text-transform']
      },
      metadata: {
        description: 'Converts text to uppercase',
        version: '1.0.0'
      }
    });

    this.serverId = this.hostess.register(manifest);
    this.stopHeartbeat = startHeartbeat(this.hostess, this.serverId, 5000);

    console.log(`[UppercaseTransform] Registered with Hostess: ${this.serverId}`);
  }

  shutdown(): void {
    if (this.stopHeartbeat) {
      this.stopHeartbeat();
    }
  }
}
```

**Key Hostess Fields:**

- `fqdn`: Fully qualified domain name (use 'localhost' for local modules)
- `servername`: Unique name for your module
- `classHex`: Hex identifier (choose any unique value, e.g., '0x1001')
- `owner`: Owner identifier (use 'user' or your project name)
- `terminals`: Input/output endpoints
  - `name`: Terminal identifier ('input', 'output', etc.)
  - `type`: 'local' (same process) or 'network' (remote)
  - `direction`: 'input', 'output', 'multiplexer', or 'combiner'
- `capabilities`: Service metadata for discovery
  - `type`: Module type ('transform', 'input', 'output', 'source', 'routing')
  - `accepts`: Array of input data types
  - `produces`: Array of output data types
  - `features`: Optional feature tags for filtering

#### Step 3: Use Your Module

```typescript
import { Kernel, Hostess } from 'mkolbol';
import { UppercaseTransform } from './modules/UppercaseTransform.js';

async function main() {
  const kernel = new Kernel();
  const hostess = new Hostess();

  // Create transform
  const upper = new UppercaseTransform(kernel, hostess);

  // Listen for output
  upper.outputPipe.on('data', (data) => {
    console.log('Output:', data); // Output: HELLO WORLD
  });

  // Send data
  upper.inputPipe.write('hello world');
  upper.inputPipe.write('this is a test');

  // Cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
  upper.shutdown();
}

main().catch(console.error);
```

#### Step 4: Wire into a Topology

```typescript
import { Kernel, Hostess, StateManager } from 'mkolbol';
import { UppercaseTransform } from './modules/UppercaseTransform.js';

// Create a simple source module
class TextSource {
  public readonly outputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.outputPipe = kernel.createPipe({ objectMode: true });
  }

  emit(text: string): void {
    this.outputPipe.write(text);
  }
}

// Create a simple sink module
class ConsoleSink {
  public readonly inputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe({ objectMode: true });
    this.inputPipe.on('data', (data) => {
      console.log('[ConsoleSink]', data);
    });
  }
}

async function main() {
  const kernel = new Kernel();
  const hostess = new Hostess();

  // Create modules
  const source = new TextSource(kernel);
  const transform = new UppercaseTransform(kernel, hostess);
  const sink = new ConsoleSink(kernel);

  // Wire: source -> transform -> sink
  kernel.connect(source.outputPipe, transform.inputPipe);
  kernel.connect(transform.outputPipe, sink.inputPipe);

  // Send data
  source.emit('hello world');
  source.emit('mkolbol is awesome');

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 100));

  // Query Hostess
  const transforms = hostess.query({ type: 'transform', accepts: 'text' });
  console.log('Found transforms:', transforms.map(e => e.servername));

  transform.shutdown();
}

main().catch(console.error);
```

**Expected Output:**
```
[UppercaseTransform] Registered with Hostess: localhost:uppercase-transform:0x1001:user:no:none:...
[ConsoleSink] HELLO WORLD
[ConsoleSink] MKOLBOL IS AWESOME
Found transforms: [ 'uppercase-transform' ]
```

---

## Path 2: External Process Module

An External module runs as a separate process, communicating over stdin/stdout. This allows you to use any language and provides process isolation.

### Example: SimpleEcho (Python)

This module echoes input with a prefix, implemented in Python.

#### Step 1: Create the External Script

**File: `scripts/echo-server.py`**

```python
#!/usr/bin/env python3
"""
SimpleEcho - Echoes input with a prefix
Type: Transform (external process)
Accepts: text
Produces: text
"""

import sys
import time

def main():
    # Write startup message to stderr (for debugging)
    print("[SimpleEcho] Starting up...", file=sys.stderr, flush=True)

    # Read from stdin, write to stdout
    for line in sys.stdin:
        line = line.rstrip('\n')
        output = f"[ECHO] {line}\n"
        sys.stdout.write(output)
        sys.stdout.flush()  # IMPORTANT: flush immediately

    print("[SimpleEcho] Shutting down...", file=sys.stderr, flush=True)

if __name__ == '__main__':
    main()
```

Make it executable:
```bash
chmod +x scripts/echo-server.py
```

#### Step 2: Create Wrapper in TypeScript

**File: `src/modules/SimpleEchoWrapper.ts`**

```typescript
import { Kernel } from 'mkolbol';
import { Hostess } from 'mkolbol';
import { ExternalServerWrapper } from 'mkolbol';
import type { ExternalServerManifest } from 'mkolbol/types';
import path from 'path';

/**
 * SimpleEchoWrapper - Wraps echo-server.py as an external process
 */
export class SimpleEchoWrapper extends ExternalServerWrapper {
  constructor(kernel: Kernel, hostess: Hostess) {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'simple-echo',
      classHex: '0x2001',
      owner: 'user',
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
        features: ['echo', 'python']
      },
      command: 'python3',
      args: [path.resolve(process.cwd(), 'scripts/echo-server.py')],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'on-failure',
      restartDelay: 1000,
      maxRestarts: 3
    };

    super(kernel, hostess, manifest);
  }
}
```

**Key External Manifest Fields:**

- `command`: Executable path (e.g., 'python3', '/bin/cat', './my-binary')
- `args`: Command-line arguments
- `env`: Environment variables (merged with process.env)
- `cwd`: Working directory
- `ioMode`: Communication mode
  - `'stdio'`: Standard input/output (most common)
  - `'pty'`: Pseudo-terminal (for interactive shells)
  - `'socket'`: Unix socket (advanced)
- `restart`: Restart policy
  - `'never'`: Don't restart on exit
  - `'on-failure'`: Restart only on non-zero exit code
  - `'always'`: Always restart
- `restartDelay`: Milliseconds to wait before restarting
- `maxRestarts`: Maximum restart attempts

#### Step 3: Use the External Module

```typescript
import { Kernel, Hostess } from 'mkolbol';
import { SimpleEchoWrapper } from './modules/SimpleEchoWrapper.js';

async function main() {
  const kernel = new Kernel();
  const hostess = new Hostess();

  // Create and spawn wrapper
  const echo = new SimpleEchoWrapper(kernel, hostess);
  await echo.spawn();

  // Listen for output
  echo.outputPipe.on('data', (data) => {
    console.log('Output:', data.toString().trim());
  });

  // Listen for errors (stderr)
  echo.errorPipe.on('data', (data) => {
    console.error('Stderr:', data.toString().trim());
  });

  // Send data
  echo.inputPipe.write('Hello from TypeScript\n');
  echo.inputPipe.write('This is line 2\n');

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 500));

  // Graceful shutdown
  await echo.shutdown();
  console.log('Echo server shut down');
}

main().catch(console.error);
```

**Expected Output:**
```
Stderr: [SimpleEcho] Starting up...
Output: [ECHO] Hello from TypeScript
Output: [ECHO] This is line 2
Stderr: [SimpleEcho] Shutting down...
Echo server shut down
```

#### Step 4: Wire into Topology

```typescript
import { Kernel, Hostess, StateManager } from 'mkolbol';
import { SimpleEchoWrapper } from './modules/SimpleEchoWrapper.js';

class TextSource {
  public readonly outputPipe: Pipe;
  constructor(kernel: Kernel) {
    this.outputPipe = kernel.createPipe({ objectMode: true });
  }
  emit(text: string): void {
    this.outputPipe.write(text + '\n');
  }
}

class ConsoleSink {
  public readonly inputPipe: Pipe;
  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe({ objectMode: true });
    this.inputPipe.on('data', (data) => {
      console.log('[ConsoleSink]', data.toString().trim());
    });
  }
}

async function main() {
  const kernel = new Kernel();
  const hostess = new Hostess();

  const source = new TextSource(kernel);
  const echo = new SimpleEchoWrapper(kernel, hostess);
  const sink = new ConsoleSink(kernel);

  // Spawn external process
  await echo.spawn();

  // Wire: source -> echo -> sink
  kernel.connect(source.outputPipe, echo.inputPipe);
  kernel.connect(echo.outputPipe, sink.inputPipe);

  // Send data
  source.emit('test message 1');
  source.emit('test message 2');

  await new Promise(resolve => setTimeout(resolve, 500));

  // Query Hostess
  const pythonModules = hostess.query({ features: ['python'] });
  console.log('Python modules:', pythonModules.map(e => e.servername));

  await echo.shutdown();
}

main().catch(console.error);
```

---

## Debugging Your Module

### 1. Enable Debug Logging

Set environment variables before running:

```bash
# Enable all debug output
export DEBUG=1
export LAMINAR_DEBUG=1

# Run your app
node dist/your-app.js
```

Debug output will appear on stderr and in `reports/` directory (if Laminar is configured).

### 2. Inspect Hostess Endpoints

After modules register, check the snapshot:

```bash
cat reports/endpoints.json
```

Example:
```json
[
  {
    "id": "localhost:uppercase-transform:0x1001:user:no:none:...",
    "type": "inproc",
    "coordinates": "UppercaseTransform",
    "metadata": {
      "description": "Converts text to uppercase",
      "version": "1.0.0"
    }
  }
]
```

### 3. Trace Data Flow

Add logging to your pipes:

```typescript
transform.inputPipe.on('data', (chunk) => {
  console.error('[DEBUG] Transform input:', chunk);
});

transform.outputPipe.on('data', (chunk) => {
  console.error('[DEBUG] Transform output:', chunk);
});
```

### 4. External Process Debugging

For external processes, stderr is piped to `errorPipe`:

```typescript
wrapper.errorPipe.on('data', (data) => {
  console.error('[External stderr]', data.toString());
});
```

**Tip**: Use `console.error()` or write to stderr in your external script for debug messages.

### 5. Check Process State

For external modules:

```typescript
if (wrapper.isRunning()) {
  const info = wrapper.getProcessInfo();
  console.log('PID:', info.pid);
  console.log('Uptime:', info.uptime, 'ms');
}
```

---

## Smoke Test Checklist

After creating your module, verify it works:

### For Transform Modules (inproc):

- [ ] Module instantiates without errors
- [ ] `inputPipe` and `outputPipe` are defined
- [ ] Data flows from input to output
- [ ] Output matches expected transformation
- [ ] Module registers with Hostess (if applicable)
- [ ] Hostess query finds the module by capabilities
- [ ] `shutdown()` cleans up resources

**Test command:**
```bash
npm run build
node dist/your-test-file.js
```

### For External Modules (process):

- [ ] External script is executable (`chmod +x`)
- [ ] Wrapper instantiates without errors
- [ ] `spawn()` starts the process successfully
- [ ] Process PID is assigned
- [ ] Data written to `inputPipe` reaches the process (check stdout)
- [ ] Process output appears on `outputPipe`
- [ ] Debug messages appear on `errorPipe` (stderr)
- [ ] Module registers with Hostess
- [ ] Hostess endpoints.json includes the module
- [ ] `shutdown()` terminates the process gracefully
- [ ] Restart policy works (test by killing the process)

**Test command:**
```bash
npm run build
node dist/your-test-file.js

# Check endpoints
cat reports/endpoints.json | grep simple-echo
```

---

## Common Pitfalls

### Transform Modules

1. **Forgetting to flush output**: Always call `callback(null, data)` in Transform stream
2. **Not using objectMode**: Set `objectMode: true` if passing objects/strings
3. **Missing kernel.createPipe()**: Always create pipes via the kernel
4. **No error handling**: Emit errors on pipes: `pipe.emit('error', err)`

### External Modules

1. **Buffering issues**: Always `flush()` stdout in external scripts
   ```python
   sys.stdout.flush()  # Python
   ```
   ```go
   os.Stdout.Sync()  // Go
   ```
2. **Not handling signals**: External processes should handle SIGTERM gracefully
3. **Missing newlines**: stdio expects line-delimited data (append `\n`)
4. **Wrong working directory**: Set `cwd` in manifest if script has relative paths
5. **Environment not set**: Merge required env vars in `env` field

---

## Complete Examples

### Transform Module: ReverseTransform

```typescript
import { Kernel } from 'mkolbol';
import { Transform } from 'stream';
import type { Pipe } from 'mkolbol/types/stream';

export class ReverseTransform {
  public readonly inputPipe: Pipe;
  public readonly outputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe({ objectMode: true });
    this.outputPipe = kernel.createPipe({ objectMode: true });

    const transformer = new Transform({
      objectMode: true,
      transform(chunk, _enc, cb) {
        const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
        const reversed = text.split('').reverse().join('');
        cb(null, reversed);
      }
    });

    this.inputPipe.pipe(transformer).pipe(this.outputPipe);
  }
}
```

### External Module: WordCount (Bash)

**File: `scripts/word-count.sh`**
```bash
#!/bin/bash
echo "[WordCount] Starting..." >&2

while IFS= read -r line; do
  word_count=$(echo "$line" | wc -w)
  echo "Words: $word_count"
done

echo "[WordCount] Stopping..." >&2
```

**File: `src/modules/WordCountWrapper.ts`**
```typescript
import { Kernel, Hostess, ExternalServerWrapper } from 'mkolbol';
import type { ExternalServerManifest } from 'mkolbol/types';
import path from 'path';

export class WordCountWrapper extends ExternalServerWrapper {
  constructor(kernel: Kernel, hostess: Hostess) {
    const manifest: ExternalServerManifest = {
      fqdn: 'localhost',
      servername: 'word-count',
      classHex: '0x3001',
      owner: 'user',
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
        features: ['word-count', 'bash']
      },
      command: path.resolve(process.cwd(), 'scripts/word-count.sh'),
      args: [],
      env: {},
      cwd: process.cwd(),
      ioMode: 'stdio',
      restart: 'on-failure',
      restartDelay: 1000,
      maxRestarts: 3
    };

    super(kernel, hostess, manifest);
  }
}
```

---

## Configuration-Based Approach

After building your module programmatically, you can also load it from YAML/JSON configuration files using the ConfigLoader and Executor.

See **[Wiring and Testing](./wiring-and-tests.md)** guide for:
- How to write topology configs with external processes
- Both `stdio` and `pty` I/O modes
- Running tests in threads vs forks lanes

## Next Steps

Now that you've built your first module, explore:

1. **[Wiring and Testing](./wiring-and-tests.md)** - Config-based topologies and testing lanes
2. **[Module Types RFC](../rfcs/stream-kernel/03-module-types.md)** - Deep dive on all module types
3. **[Executor and Topology](../rfcs/stream-kernel/10-executor-server.md)** - Load modules from YAML config
4. **[Testing with Laminar](../laminar-workflow.md)** - Write structured tests for your modules
5. **Real-world examples** in `src/examples/` directory:
   - `hostess-demo.ts` - Service discovery
   - `external-wrapper-demo.ts` - External process wrappers
   - `split-topology.ts` - Fan-out patterns
   - `merge-topology.ts` - Fan-in patterns

## Troubleshooting

### Transform module not producing output

- Check `objectMode: true` on pipes
- Ensure `callback(null, data)` is called in transform function
- Add debug logging: `pipe.on('data', console.log)`

### External process not starting

- Verify script is executable: `ls -l scripts/your-script.py`
- Check command path: `which python3`
- Enable debug: `export DEBUG=1`
- Inspect stderr: `wrapper.errorPipe.on('data', console.error)`

### Data not flowing

- Verify wiring: `kernel.connect(source.output, transform.input)`
- Check for paused streams: `pipe.isPaused()`
- Ensure pipes are created via `kernel.createPipe()`

### Hostess not finding module

- Check registration: Look for `hostess:register` event in debug logs
- Verify capabilities match query: `hostess.query({ type: 'transform' })`
- Inspect `reports/endpoints.json`

---

**You're ready to build!** Start with a simple Transform, then graduate to External processes when you need multi-language support or isolation. The kernel handles all the plumbing - you just focus on your module's logic.
