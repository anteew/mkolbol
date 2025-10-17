# TTY Renderer Module

## Overview

The TTY Renderer module provides a simple passthrough renderer that writes ANSI output directly to stdout or a file. It's designed for scenarios where you need to render terminal output without complex processing, such as logging, debugging, or creating terminal recordings.

## Features

- **Direct ANSI passthrough**: Preserves all ANSI escape sequences by default
- **Flexible output targets**: Write to stdout or any file path
- **ANSI stripping**: Optional removal of ANSI escape sequences
- **Raw mode support**: Enable TTY raw mode for interactive applications
- **TTY detection**: Automatically detects TTY environments and adapts behavior
- **File output**: Supports writing to files with automatic directory creation

## Usage

### Basic Usage

```typescript
import { Kernel } from '../kernel/Kernel.js';
import { TTYRenderer } from '../modules/ttyRenderer.js';

const kernel = new Kernel();
const renderer = new TTYRenderer(kernel);

await renderer.start();
renderer.inputPipe.write('\x1b[32mGreen text\x1b[0m\n');
await renderer.stop();
```

### Configuration File

```yaml
nodes:
  - id: tty1
    module: TTYRenderer
    params:
      target: stdout # or a file path like 'logs/output.log'
      rawMode: true # enable raw mode (default: true)
      stripAnsi: false # strip ANSI codes (default: false)

connections:
  - from: source.output
    to: tty1.input
```

## Options

### `target`

- **Type**: `'stdout' | string`
- **Default**: `'stdout'`
- **Description**: Output destination. Use `'stdout'` for standard output or provide a file path.

### `rawMode`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable TTY raw mode when output target is stdout. Only applies if stdout is a TTY.

### `stripAnsi`

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Remove ANSI escape sequences from output. Useful for creating plain text logs.

## Examples

### Example 1: Basic stdout rendering

```yaml
nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 1000

  - id: tty1
    module: TTYRenderer

connections:
  - from: timer1.output
    to: tty1.input
```

Run with:

```bash
node dist/scripts/mkctl.js run --file examples/configs/tty-basic.yml --duration 5
```

### Example 2: File output with ANSI preservation

```yaml
nodes:
  - id: source1
    module: SomeSource

  - id: tty1
    module: TTYRenderer
    params:
      target: logs/terminal-output.log
      rawMode: true

connections:
  - from: source1.output
    to: tty1.input
```

This configuration preserves all ANSI codes in the output file, useful for creating terminal recordings that can be replayed with tools like `cat` or `less -R`.

### Example 3: Plain text logging (ANSI stripped)

```yaml
nodes:
  - id: source1
    module: SomeSource

  - id: tty1
    module: TTYRenderer
    params:
      target: logs/plain.log
      stripAnsi: true

connections:
  - from: source1.output
    to: tty1.input
```

This removes all ANSI escape sequences, creating clean plain text logs suitable for parsing or ingestion by other tools.

### Example 4: Multiple outputs with Tee

```yaml
nodes:
  - id: source1
    module: SomeSource

  - id: tee1
    module: TeeTransform

  - id: tty-stdout
    module: TTYRenderer
    params:
      target: stdout

  - id: tty-file
    module: TTYRenderer
    params:
      target: logs/debug.log
      stripAnsi: true

connections:
  - from: source1.output
    to: tee1.input
  - from: tee1.output1
    to: tty-stdout.input
  - from: tee1.output2
    to: tty-file.input
```

This sends ANSI output to both stdout (with color) and a plain text log file.

## API Reference

### Constructor

```typescript
constructor(kernel: Kernel, options?: TTYRendererOptions)
```

### Methods

#### `start(): Promise<void>`

Initializes the renderer. If outputting to a file, creates necessary directories and opens the file stream. If `rawMode` is enabled and stdout is a TTY, sets raw mode.

#### `stop(): Promise<void>`

Gracefully stops the renderer. If `rawMode` was enabled, restores normal mode. If outputting to a file, closes the file stream.

#### `destroy(): void`

Forcefully destroys the renderer and any open file streams.

### Properties

#### `inputPipe: Pipe`

The input pipe that accepts data for rendering.

## TTY vs Non-TTY Behavior

The TTY Renderer automatically detects whether stdout is a TTY:

- **TTY environment** (interactive terminal):
  - `rawMode` option takes effect
  - ANSI codes are typically rendered with colors

- **Non-TTY environment** (pipes, redirects):
  - `rawMode` option is ignored
  - ANSI codes may not render (depending on the receiving program)

To test TTY vs non-TTY behavior:

```bash
# TTY (colors rendered)
node dist/scripts/mkctl.js run --file examples/configs/tty-basic.yml

# Non-TTY (ANSI codes present but may not render)
node dist/scripts/mkctl.js run --file examples/configs/tty-basic.yml | cat
```

## Use Cases

1. **Debug logging**: Quick passthrough for debugging stream content
2. **Terminal recording**: Capture terminal output with ANSI codes for replay
3. **Plain text logs**: Strip ANSI codes for log aggregation systems
4. **Development**: Simple renderer for testing stream pipelines
5. **CI/CD**: File output for build logs without complex formatting

## Comparison with Other Renderers

| Feature          | TTYRenderer | ConsoleSink     | FilesystemSink |
| ---------------- | ----------- | --------------- | -------------- |
| ANSI passthrough | ✓           | ✗               | ✓              |
| stdout output    | ✓           | ✓ (with prefix) | ✗              |
| File output      | ✓           | ✗               | ✓              |
| ANSI stripping   | ✓           | ✗               | ✗              |
| Raw mode         | ✓           | ✗               | ✗              |
| Timestamps       | ✗           | ✗               | ✓              |
| JSONL format     | ✗           | ✓               | ✓              |
| Statistics       | ✗           | ✗               | ✓              |

**When to use TTYRenderer**:

- Need simple ANSI passthrough
- Want raw terminal output without prefixes
- Need optional ANSI stripping
- Want both stdout and file output with same module

**When to use ConsoleSink**:

- Need prefixed console output
- Want JSONL format for logs
- Don't need file output

**When to use FilesystemSink**:

- Need advanced file features (fsync, modes)
- Want statistics tracking
- Need timestamp injection
- Only writing to files (no stdout)

## Troubleshooting

### ANSI codes not rendering in terminal

- Ensure stdout is a TTY: `node -p "process.stdout.isTTY"`
- Check terminal supports ANSI: `echo -e "\x1b[31mRed\x1b[0m"`

### File output missing ANSI codes

- Verify `stripAnsi: false` (default)
- Check file with `cat -v filename` to see escape sequences

### Raw mode not working

- Verify stdout is a TTY
- Check `target: stdout` is set
- Ensure no process overrides `process.stdin.setRawMode`

## See Also

- [ConsoleSink](../src/modules/consoleSink.ts) - Console output with formatting
- [FilesystemSink](../src/modules/filesystem-sink.ts) - Advanced file output
- [Wiring and Tests Guide](./wiring-and-tests.md) - Building topologies
