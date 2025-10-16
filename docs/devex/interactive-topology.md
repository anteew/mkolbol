# Interactive Topology: Keyboard → PTY → TTY

## Overview

The **Interactive Topology** pattern in mkolbol enables bidirectional communication between user input (keyboard), pseudo-terminal processes (PTY), and terminal output (TTY). This topology is the foundation for building interactive terminal applications, AI-enhanced shells, and collaborative coding environments.

## Architecture Pattern

```
┌──────────────┐
│  Keyboard    │  (User input)
│   Input      │
└──────┬───────┘
       │
       │ keypress events
       │
       ▼
┌──────────────┐
│  PTY Process │  (Shell, vim, etc.)
│   (bash)     │
└──────┬───────┘
       │
       │ ANSI output
       │
       ▼
┌──────────────┐
│  TTY Output  │  (Terminal display)
│ (stdout)     │
└──────────────┘
```

The topology creates a real-time interactive loop:
1. **Keyboard** captures raw keystrokes from `process.stdin`
2. **PTY** executes commands in a pseudo-terminal environment
3. **TTY** renders ANSI-formatted output to `process.stdout`

## When to Use Interactive Topology

### Use Interactive Topology when:
- Building terminal emulators or terminal UI applications
- Creating AI-assisted shells with observability
- Implementing collaborative terminal sessions
- Hijacking/intercepting interactive terminal applications
- Adding input/output transformations to existing CLI tools
- Building custom REPL environments

### Alternatives:
- **StdIO Path**: For non-interactive filters and data pipelines (see [stdio-path.md](./stdio-path.md))
- **HTTP/WebSocket**: For network-based terminal access
- **Worker Threads**: For CPU-intensive background tasks without I/O

## Key Components

### 1. KeyboardInput Module

The `KeyboardInput` module captures raw keyboard events from `process.stdin`:

```typescript
import { KeyboardInput } from 'mkolbol';

const keyboard = new KeyboardInput();

keyboard.on('keypress', (event) => {
  console.log('Key:', event.name, 'Sequence:', event.sequence);
});

keyboard.on('ctrl-c', () => {
  console.log('Ctrl+C detected');
  process.exit(0);
});

keyboard.start();
```

**Features:**
- Raw mode input (captures individual keypresses)
- Special key detection (arrows, function keys, modifiers)
- Ctrl+C handling for graceful shutdown
- TTY validation (requires `process.stdin.isTTY`)

### 2. PTYServerWrapper

The `PTYServerWrapper` spawns external processes with PTY support using `node-pty`:

```typescript
import { PTYServerWrapper } from 'mkolbol';
import type { ExternalServerManifest } from 'mkolbol';

const manifest: ExternalServerManifest = {
  fqdn: 'localhost',
  servername: 'bash-shell',
  classHex: '0xBASH',
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
    features: ['interactive', 'pty']
  },
  command: '/bin/bash',
  args: [],
  env: {},
  cwd: process.cwd(),
  ioMode: 'pty',
  terminalType: 'xterm-256color',
  initialCols: 80,
  initialRows: 24,
  restart: 'never'
};

const ptyWrapper = new PTYServerWrapper(kernel, hostess, manifest);
await ptyWrapper.spawn();
```

**Features:**
- PTY emulation with full terminal capabilities
- Window resize support (`resize(cols, rows)`)
- ANSI escape sequence handling
- Process lifecycle management (spawn, shutdown, restart)

### 3. TTY Output Stream

The TTY output is typically `process.stdout`, which renders ANSI-formatted text to the terminal:

```typescript
ptyWrapper.outputPipe.on('data', (data) => {
  process.stdout.write(data.toString());
});
```

For advanced rendering, use `XtermTTYRenderer`:

```typescript
import { XtermTTYRenderer } from 'mkolbol';

const renderer = new XtermTTYRenderer({ altBuffer: true });
ptyWrapper.outputPipe.pipe(renderer.inputPipe);
```

## Complete Example

See [src/examples/keyboard-pty-tty.ts](../../src/examples/keyboard-pty-tty.ts) for a working implementation:

```bash
# Build the project
npm run build

# Run the interactive demo (requires TTY)
node dist/src/examples/keyboard-pty-tty.js
```

### Example Output

```
[keyboard-pty-tty] Starting Keyboard → PTY → TTY demo...
[keyboard-pty-tty] Press keys to see them echoed. Press Ctrl+C to exit.

hello world
hello world
ls -la
total 128
drwxr-xr-x  15 user  staff   480 Oct 16 12:34 .
drwxr-xr-x  10 user  staff   320 Oct 16 12:00 ..
...
^C
[keyboard-pty-tty] Received Ctrl+C, shutting down...
```

The demo uses `/bin/cat` as the PTY process, which echoes all input back to output. This demonstrates the full bidirectional loop.

## Wiring the Topology

### Basic Connection

```typescript
import { Kernel } from 'mkolbol';
import { KeyboardInput } from 'mkolbol';
import { PTYServerWrapper } from 'mkolbol';

const kernel = new Kernel();
const keyboard = new KeyboardInput();
const ptyWrapper = new PTYServerWrapper(kernel, hostess, manifest);

await ptyWrapper.spawn();

// Wire Keyboard → PTY
keyboard.on('keypress', (event) => {
  ptyWrapper.inputPipe.write(event.sequence);
});

// Wire PTY → TTY
ptyWrapper.outputPipe.on('data', (data) => {
  process.stdout.write(data.toString());
});

keyboard.start();
```

### With Kernel Pipes

For more advanced topologies, use kernel pipes for routing:

```typescript
const inputPipe = kernel.createPipe('keyboard-input');
const outputPipe = kernel.createPipe('pty-output');

keyboard.on('keypress', (event) => {
  inputPipe.write(event.sequence);
});

kernel.connect(inputPipe, ptyWrapper.inputPipe);
kernel.connect(ptyWrapper.outputPipe, outputPipe);

outputPipe.on('data', (data) => {
  process.stdout.write(data.toString());
});
```

## Use Cases

### 1. Terminal Emulator

Build a custom terminal emulator with additional features:

```typescript
// Keyboard → PTY → [Screen Renderer, Logger, AI Observer]
kernel.split(ptyWrapper.outputPipe, [
  renderer.inputPipe,
  logger.inputPipe,
  aiObserver.inputPipe
]);
```

### 2. AI-Assisted Shell

Intercept commands before execution:

```typescript
keyboard.on('keypress', async (event) => {
  if (event.name === 'return') {
    const command = currentLine;
    const suggestion = await ai.suggest(command);
    if (suggestion) {
      console.log(`\nAI Suggestion: ${suggestion}`);
    }
  }
  ptyWrapper.inputPipe.write(event.sequence);
});
```

### 3. Session Recording

Capture all input/output for replay or analysis:

```typescript
const recorder = new SessionRecorder('session.log');

keyboard.on('keypress', (event) => {
  recorder.logInput(event);
  ptyWrapper.inputPipe.write(event.sequence);
});

ptyWrapper.outputPipe.on('data', (data) => {
  recorder.logOutput(data);
  process.stdout.write(data.toString());
});
```

### 4. Multi-User Collaboration

Share terminal sessions between users:

```typescript
const broadcast = kernel.createPipe('broadcast');

keyboard.on('keypress', (event) => {
  broadcast.write(event);
});

kernel.split(broadcast, [
  ptyWrapper.inputPipe,
  websocket.inputPipe  // Send to remote users
]);
```

## Troubleshooting

### No TTY Available

**Problem:** `stdin is not a TTY` error when running the demo.

**Cause:** The script is running in a non-interactive environment (e.g., piped input, CI/CD, background job).

**Solution:**
```typescript
if (!process.stdin.isTTY) {
  console.error('Error: This demo requires an interactive terminal (TTY).');
  console.error('Run directly in your terminal, not via pipe or redirection.');
  process.exit(1);
}
```

**Alternative:** Use StdIO mode for non-interactive scenarios (see [stdio-path.md](./stdio-path.md)).

### Keyboard Not Capturing Input

**Problem:** Keys pressed are not being captured by `KeyboardInput`.

**Cause:** stdin not in raw mode, or competing input listeners.

**Solution:**
- Ensure `keyboard.start()` is called
- Check that no other code is reading from `process.stdin`
- Verify `process.stdin.setRawMode(true)` is not throwing errors

### PTY Output Not Visible

**Problem:** PTY process is running but no output appears.

**Cause:** Output pipe not connected, or buffering issues.

**Solution:**
```typescript
// Ensure output pipe is connected
ptyWrapper.outputPipe.on('data', (data) => {
  process.stdout.write(data.toString());
});

// Check for errors
ptyWrapper.errorPipe.on('data', (data) => {
  console.error('PTY Error:', data.toString());
});
```

### Terminal State Corrupted

**Problem:** Terminal remains in raw mode or alternate buffer after exit.

**Cause:** Improper cleanup on shutdown.

**Solution:**
```typescript
async function cleanup() {
  keyboard.stop();  // Restores cooked mode
  await ptyWrapper.shutdown();  // Kills PTY process
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
keyboard.on('ctrl-c', cleanup);
```

If terminal is already corrupted:
```bash
reset
```

### PTY Process Won't Start

**Problem:** `node-pty` spawn error or EACCES.

**Cause:** Missing `node-pty` native module, or insufficient permissions.

**Solution:**
- Install build tools (see [quickstart.md](./quickstart.md#error-node-pty-module-not-found))
- Rebuild native modules: `npm rebuild`
- Check PTY permissions (Linux: add user to `tty` group)

## Performance Considerations

### Latency

The interactive topology introduces minimal latency:
- **Keyboard → PTY**: ~100-200μs (event capture + write)
- **PTY → TTY**: ~100-500μs (depends on ANSI complexity)
- **Round-trip**: ~200-700μs (typical for simple commands)

### Throughput

For high-frequency input (e.g., paste operations):
- Enable buffering: `keyboard.setBufferSize(1024)`
- Use debouncing: `keyboard.setDebounce(10)` (ms)
- Monitor backpressure: `ptyWrapper.inputPipe.writableHighWaterMark`

### Memory

Interactive topology has low memory overhead:
- KeyboardInput: ~10KB
- PTYServerWrapper: ~50-100KB (depends on terminal state)
- Pipes: ~16KB per pipe (default high water mark)

## Best Practices

1. **Always check for TTY**: Validate `process.stdin.isTTY` before starting
2. **Handle Ctrl+C gracefully**: Always implement cleanup on exit
3. **Restore terminal state**: Call `keyboard.stop()` in all exit paths
4. **Monitor both output and error streams**: Don't ignore `errorPipe`
5. **Set appropriate window size**: Match PTY cols/rows to actual terminal
6. **Use alternate screen buffer**: For full-screen apps, use `XtermTTYRenderer({ altBuffer: true })`
7. **Test in real terminals**: Don't rely solely on CI/automation testing

## Related Documentation

- [Early Adopter Guide](./early-adopter-guide.md) - Overview of mkolbol concepts
- [StdIO Path](./stdio-path.md) - Non-interactive alternative for data pipelines
- [Quickstart: PTY Demo](./quickstart.md) - PTY basics with XtermTTYRenderer
- [Stream Kernel RFC](../rfcs/stream-kernel/04-pty-use-cases.md) - PTY use cases and architecture

## See Also

- [KeyboardInput Source](../../src/modules/keyboard-input.ts) - Keyboard input implementation
- [PTYServerWrapper Source](../../src/wrappers/PTYServerWrapper.ts) - PTY wrapper implementation
- [XtermTTYRenderer Source](../../src/modules/xterm-tty-renderer.ts) - Terminal rendering module
- [Kernel Pipes](../../src/kernel/Kernel.ts) - Stream management and topology wiring
