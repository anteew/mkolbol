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

## Phase 3 (P3) - Extended Color and Modes

### 256-Color Palette Support

**Implementation**: SGR sequences 38;5 and 48;5 for extended color selection.

**Foreground**: `CSI 38 ; 5 ; n m` where n = 0-255
**Background**: `CSI 48 ; 5 ; n m` where n = 0-255

**Color ranges**:
- **0-15**: Standard ANSI colors (same as 30-37, 90-97)
- **16-231**: 6x6x6 RGB color cube (216 colors)
  - Formula: `16 + 36*r + 6*g + b` where r,g,b ∈ [0,5]
- **232-255**: Grayscale ramp (24 shades)

Palette indices resolve to precomputed `#RRGGBB` hex strings so renderers receive the exact color value without recomputing the xterm look-up table on every event.

**Example**:
```typescript
parser.parse(Buffer.from('\x1b[38;5;196mBright Red Text'));  // Color 196 = #ff0000
parser.parse(Buffer.from('\x1b[48;5;21mDeep Blue BG'));      // Color 21 = #0000ff
```

### Truecolor (24-bit RGB) Support

**Implementation**: SGR sequences 38;2 and 48;2 for direct RGB color selection.

**Foreground**: `CSI 38 ; 2 ; r ; g ; b m` where r,g,b ∈ [0,255]
**Background**: `CSI 48 ; 2 ; r ; g ; b m` where r,g,b ∈ [0,255]

**Features**:
- Full 24-bit color depth (16.7 million colors)
- RGB values converted to hex format (#RRGGBB)
- Values clamped to [0, 255] range
- Results cached so repeated conversions reuse the same string allocations
- Compatible with standard SGR reset (0)

**Example**:
```typescript
parser.parse(Buffer.from('\x1b[38;2;255;128;64mOrange Text'));    // RGB(255,128,64) = #ff8040
parser.parse(Buffer.from('\x1b[48;2;32;64;128mBlue Background')); // RGB(32,64,128) = #204080
```

### Extended DEC Private Modes

**Implementation**: DECSET (CSI ? n h) and DECRST (CSI ? n l) for terminal mode control.

**Supported modes (P3 scope)**:

- **Mode 7 (DECAWM)**: Auto-Wrap Mode
  - `CSI ? 7 h` - Enable auto-wrap (cursor wraps at right margin)
  - `CSI ? 7 l` - Disable auto-wrap (cursor stops at right margin)
- **Mode 5 (DECSCNM)**: Screen Inverse Mode
  - `CSI ? 5 h` - Enable screen inverse (global reverse video)
  - `CSI ? 5 l` - Disable screen inverse

When auto-wrap is enabled, printable characters that reach the configured column count automatically roll the cursor to the next line. With auto-wrap disabled the cursor stays on the right-most cell. Screen inverse updates the parser's `screenInverse` flag so renderers can swap foreground/background colors as needed.

**State tracking**:
```typescript
interface TerminalState {
  autoWrap: boolean;
  screenInverse: boolean;
  // …other state fields (cursor position, SGR attributes, etc.)
}
```

**Example**:
```typescript
parser.parse(Buffer.from('\x1b[?7l'));  // Disable auto-wrap
parser.parse(Buffer.from('Long text that stays on the same line'));
parser.parse(Buffer.from('\x1b[?7h'));  // Re-enable wrapping

parser.parse(Buffer.from('\x1b[?5h'));  // Enable screen inverse
parser.parse(Buffer.from('\x1b[?5l'));  // Disable screen inverse
```

### Resize Support

**Implementation**: Dynamic terminal dimensions via constructor options and runtime resize calls.

**Features**:
- Terminal dimensions set at construction: `new AnsiParser({ rows: 24, cols: 80 })`
- Dimensions can be updated in-place via `parser.resize(newCols, newRows)`
- Cursor position is clamped to remain within the active viewport after every resize
- Scrollback and style state persist across dimension changes

**Behavior**:
- **Larger dimensions**: Provides extra room while retaining existing state
- **Smaller dimensions**: Cursor is clamped to the new bounds; auto-wrap controls content flow
- **Deterministic**: Same input produces same output for the same configuration

**Example**:
```typescript
const parser = new AnsiParser({ rows: 24, cols: 80 });
parser.parse(Buffer.from('Content'));

// Grow viewport
parser.resize(120, 40);
parser.parse(Buffer.from('More content across a wider terminal'));

// Shrink viewport
parser.resize(40, 10);
parser.parse(Buffer.from('Tighter layout with automatic wrapping when enabled'));
```

### Performance Considerations

**Benchmarks** (P3 features):
- 256-color sequences: ~0.9ms for 300 color changes
- Truecolor sequences: ~1.2ms for 200 RGB colors
- DEC mode switches: ~0.5ms for 250 mode changes
- Mixed P3 features: ~1.5ms for 50 complex sequences

**Optimizations**:
- RGB to hex conversion cached
- 256-color palette pre-computed
- Mode state changes tracked without reallocations
- Parameter parsing optimized for color sequences

**Performance guards**:
- Test suite includes determinism tests
- Benchmarks track regression
- Large palette/truecolor sequence tests assert throughput stays within budget
- Edge case tests prevent performance cliffs

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

### Phase 3 (P3) - ✅ Complete
- **256-Color Support (SGR 38;5 and 48;5)**:
  - `CSI 38 ; 5 ; n m` - Set foreground to 256-color palette
  - `CSI 48 ; 5 ; n m` - Set background to 256-color palette
  - Standard colors (0-15): System palette
  - Color cube (16-231): 6x6x6 RGB cube
  - Grayscale (232-255): 24-step grayscale ramp
- **Truecolor Support (SGR 38;2 and 48;2)**:
  - `CSI 38 ; 2 ; r ; g ; b m` - Set foreground to RGB color
  - `CSI 48 ; 2 ; r ; g ; b m` - Set background to RGB color
  - Full 24-bit color (16.7 million colors)
  - Hex color encoding (#RRGGBB)
- **Extended DECSET/DECRST modes**:
  - Mode 7: Auto-wrap (DECAWM)
    - `CSI ? 7 h` - Enable auto-wrap
    - `CSI ? 7 l` - Disable auto-wrap
  - Mode 1: Application cursor keys (DECCKM)
    - `CSI ? 1 h` - Application mode
    - `CSI ? 1 l` - Normal mode
  - Mode 1049: Alternate screen buffer
    - `CSI ? 1049 h` - Switch to alternate screen
    - `CSI ? 1049 l` - Restore primary screen
- **Resize Support**:
  - Dynamic terminal dimensions via constructor
  - Content preservation on resize
  - Deterministic behavior across dimension changes
- **Performance Guards**:
  - Benchmarks for P3 features (256-color, truecolor, DEC modes)
  - Performance regression detection
  - Deterministic test coverage for all sequences

### Phase 4 (P4) - Planned
- **Additional CSI sequences**:
  - ICH, DCH, IL, DL (insert/delete)
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
