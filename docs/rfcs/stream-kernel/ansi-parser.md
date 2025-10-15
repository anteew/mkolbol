# ANSI Parser

## Overview

The ANSI Parser is a core component of the Stream Kernel that interprets ANSI escape sequences and maintains terminal state. It provides high-fidelity terminal emulation with support for UTF-8, wide characters, scrollback buffers, and performance-optimized parsing.

## Architecture

The parser follows a streaming architecture:
- **Input**: Raw byte streams containing ANSI escape sequences
- **Processing**: State machine-based parsing with batched character handling
- **Output**: Structured events representing terminal operations (print, cursor, erase, style, mode, reset)

## Phase 1 (P1) - Core Implementation

### Supported Features
- **Basic CSI sequences**: Cursor movement (H, f, A, B, C, D, G), clearing (J, K)
- **SGR (Select Graphic Rendition)**: Colors (30-37, 40-47, 90-97, 100-107), bold, underline, inverse
- **Control characters**: Line feed (`\n`), carriage return (`\r`), tab (`\t`), backspace (`\b`)
- **Terminal state**: Cursor position, color state, screen buffer

### Architecture
- Event-driven parser with state machine
- Modular sequence handlers
- Terminal state management

## Phase 2 (P2) - Extended Fidelity

### UTF-8 and Wide Character Support

**Implementation**: Multi-byte UTF-8 character parsing with proper width detection.

**Features**:
- **UTF-8 decoding**: Handles 1-4 byte UTF-8 sequences correctly
- **Wide character detection**: East Asian width (EAW) support for CJK characters
- **Character width calculation**: Returns 1 or 2 based on Unicode code point ranges
- **Cursor advancement**: Properly advances cursor by character width

**Supported ranges**:
- Hangul Jamo (U+1100-U+115F)
- CJK characters (U+2E80-U+A4CF, U+AC00-U+D7A3, U+F900-U+FAFF)
- Fullwidth forms (U+FF00-U+FF60, U+FFE0-U+FFE6)
- Emoji and symbols (U+1F300-U+1F6FF)
- CJK Extension planes (U+20000-U+3FFFD)

**Methods**:
```typescript
private readUTF8Char(index: number): { char: string; length: number }
private getCharWidth(char: string): number
```

### DECSET/DECRST Support

**Implementation**: DEC private mode set/reset sequences for terminal behavior control.

**Supported modes**:
- **Mode 25**: Cursor visibility (DECTCEM)
  - `CSI ? 25 h` - Show cursor (DECSET)
  - `CSI ? 25 l` - Hide cursor (DECRST)

**State tracking**:
```typescript
interface AnsiParserState {
  cursorVisible: boolean;
  // ... other state
}
```

**Events**:
```typescript
{
  type: 'mode',
  data: { 
    action: 'set' | 'reset', 
    mode: number, 
    name: string, 
    value: boolean 
  }
}
```

### RIS (Reset to Initial State)

**Sequence**: `ESC c`

**Behavior**: Full terminal reset
- Clears all terminal state
- Resets cursor to (0, 0)
- Clears screen buffer
- Resets all SGR attributes
- Clears scrollback

**Event**:
```typescript
{
  type: 'reset',
  data: { action: 'full' }
}
```

### OSC (Operating System Command)

**Implementation**: Consumes OSC sequences without processing.

**Supported terminators**:
- BEL (`\x07`)
- ST (`ESC \`)

**Common sequences** (consumed but ignored):
- `OSC 0 ; title ST` - Set window title
- `OSC 2 ; title ST` - Set window title

**Future**: May be extended to emit title-change events for wrapper consumption.

### Scrollback Buffer

**Configuration**:
```typescript
interface AnsiParserOptions {
  scrollbackLimit?: number; // Default: 1000
}

const parser = new AnsiParser({ scrollbackLimit: 5000 });
```

**Storage**:
```typescript
interface ScrollbackLine {
  content: string;
  style: AnsiParserState;
  timestamp: number;
}
```

**Behavior**:
- Lines pushed to scrollback on line feed
- FIFO buffer with configurable limit
- Preserves style information per line
- Timestamped for debugging/replay

**Methods**:
```typescript
getScrollback(): ScrollbackLine[]
```

### Snapshot and Export

**Purpose**: Enable terminal state inspection, debugging, and export.

**Snapshot**:
```typescript
interface TerminalSnapshot {
  state: AnsiParserState;
  scrollback: ScrollbackLine[];
  timestamp: number;
}

const snapshot = parser.snapshot();
```

**Export formats**:
```typescript
// JSON export (includes full state and styling)
const json = parser.exportJSON();

// Plain text export (content only)
const text = parser.exportPlainText();
```

**Use cases**:
- Session recording
- Terminal state debugging
- Log export
- Replay functionality

### Performance Improvements

**Character batching**:
- Accumulates printable characters before emitting events
- Reduces event count by ~70% for text-heavy output
- Tracks batch start position for efficient rendering

**Optimized parsing**:
- Character code comparison instead of string operations
- Pre-allocated buffers where possible
- Reduced string allocations in hot paths

**Efficient parameter parsing**:
```typescript
private parseParams(paramStr: string): number[]
```
- Manual integer parsing without `split()` and `parseInt()`
- Reduces allocations in CSI parameter handling

**Benchmarks** (from T6454):
- Baseline: ~2.5ms for 10k character input
- Optimized: ~0.8ms for 10k character input
- **3x improvement** in text-heavy scenarios

## API

### Constructor

```typescript
constructor(options?: AnsiParserOptions)
```

### Parsing

```typescript
parse(input: string): AnsiParserEvent[]
```

### State Access

```typescript
getState(): AnsiParserState
getScrollback(): ScrollbackLine[]
```

### Export

```typescript
snapshot(): TerminalSnapshot
exportJSON(): string
exportPlainText(): string
```

### Lifecycle

```typescript
reset(): void
```

## Events

```typescript
interface AnsiParserEvent {
  type: 'print' | 'cursor' | 'erase' | 'style' | 'mode' | 'reset';
  data: any;
}
```

**Event types**:
- **print**: Character(s) to render at position
- **cursor**: Cursor movement
- **erase**: Screen or line clearing
- **style**: Style attribute change
- **mode**: Terminal mode set/reset
- **reset**: Full terminal reset

## Testing

Comprehensive test coverage in `tests/parsers/ansiParser.spec.ts`:
- UTF-8 and wide character handling
- DECSET/DECRST mode switching
- RIS full reset
- OSC sequence consumption
- Scrollback buffer behavior
- Snapshot and export functionality
- Edge cases and boundary conditions

## Roadmap

### Phase 1 (P1) - ✅ Complete
- Core CSI sequences
- Basic SGR support
- Terminal state management
- Control character handling

### Phase 2 (P2) - ✅ Complete
- UTF-8 and wide character support
- DECSET/DECRST (mode 25)
- RIS (full reset)
- OSC sequence handling
- Scrollback buffers
- Snapshot/export
- Performance optimizations

### Phase 3 (P3) - Planned
- **Extended DECSET/DECRST modes**:
  - Mode 7: Auto-wrap (DECAWM)
  - Mode 1: Application cursor keys (DECCKM)
  - Mode 1049: Alternate screen buffer
- **Additional CSI sequences**:
  - ICH, DCH, IL, DL (insert/delete)
  - SGR extended colors (256-color, RGB)
- **Enhanced scrollback**:
  - Region-based scrolling (DECSTBM)
  - Reverse scrolling
- **Performance**:
  - WASM-based hot path for critical parsing
  - Lazy rendering integration

### Future
- xterm.js compatibility layer
- VT100/VT220 test suite compliance
- Terminal capability negotiation (terminfo)
- Sixel graphics support

## Integration

The ANSI Parser integrates with Stream Kernel components:

```typescript
import { AnsiParser } from './parsers/AnSIParser.js';

// In a PTY wrapper or transform
const parser = new AnsiParser({ scrollbackLimit: 5000 });

ptyStream.on('data', (chunk) => {
  const events = parser.parse(chunk.toString());
  
  for (const event of events) {
    switch (event.type) {
      case 'print':
        renderer.drawText(event.data);
        break;
      case 'cursor':
        renderer.moveCursor(event.data);
        break;
      // ... handle other events
    }
  }
});

// Export terminal state
const snapshot = parser.snapshot();
fs.writeFileSync('session.json', parser.exportJSON());
```

## Related Documents

- [Core Architecture](./02-core-architecture.md)
- [PTY Use Cases](./04-pty-use-cases.md)
- [PTY Wrapper Patterns](./12-pty-wrapper-patterns.md)
- [Sprint: ANSI Parser P2](../../sprints/SB-MK-ANSI-PARSER-P2.md)
