# PTY Wrapper Patterns

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** October 11, 2025

## Overview

This RFC defines patterns for wrapping interactive terminal applications (TUI apps) using pseudo-terminals (PTYs). PTY wrappers enable hijacking any terminal application's I/O and routing it through the mkolbol stream kernel for multi-modal rendering, multi-input sources, and distributed processing.

## Design Goals

### Primary Goals

1. **TUI Application Hijacking**: Intercept any terminal app (vim, htop, Claude Code, bash)
2. **Multi-Modal Output**: Split PTY output to multiple renderers simultaneously
3. **Multi-Source Input**: Merge keyboard, voice, AI commands to single PTY
4. **ANSI Compatibility**: Handle all ANSI/xterm escape sequences correctly
5. **Terminal Resize**: Dynamic terminal size changes (SIGWINCH)
6. **Signal Handling**: Proper handling of control signals
7. **Start Simple**: Begin with passthrough (tmux-like), build to complex

### Non-Goals

- Terminal emulation from scratch (use node-pty)
- ANSI rendering (separate renderer modules)
- Input method editors (IME)

## Core Architecture

### PTYServerWrapper Interface

```typescript
interface PTYServerWrapper extends ExternalServerWrapper {
  // Standard module interface
  inputPipe: Pipe; // Commands/keystrokes to PTY
  outputPipe: Pipe; // ANSI output from PTY

  // PTY-specific
  ptyProcess: IPty;
  terminalSize: { cols: number; rows: number };

  // PTY operations
  resize(cols: number, rows: number): void;
  sendSignal(signal: string): void;

  // Manifest with PTY settings
  manifest: PTYManifest;
}

interface PTYManifest extends ServerManifest {
  ioMode: 'pty'; // Always PTY mode

  // PTY configuration
  terminalType: string; // e.g., 'xterm-256color'
  initialCols: number; // e.g., 80
  initialRows: number; // e.g., 24
  enableFlow: boolean; // XON/XOFF flow control
  encoding: 'utf8' | 'binary'; // Character encoding

  // Application-specific
  shell: string; // e.g., 'bash', 'zsh'
  shellArgs: string[]; // Shell arguments
}
```

## Basic PTY Wrapper Implementation

### Minimal Passthrough (tmux-like)

```typescript
import * as pty from 'node-pty';

class BasicPTYWrapper {
  inputPipe: Pipe;
  outputPipe: Pipe;
  private ptyProcess: IPty;

  constructor(kernel: Kernel, manifest: PTYManifest) {
    this.inputPipe = kernel.createPipe();
    this.outputPipe = kernel.createPipe();
    this.manifest = manifest;
  }

  async spawn(): Promise<void> {
    // Spawn PTY process
    this.ptyProcess = pty.spawn(this.manifest.shell || 'bash', this.manifest.shellArgs || [], {
      name: this.manifest.terminalType || 'xterm-256color',
      cols: this.manifest.initialCols || 80,
      rows: this.manifest.initialRows || 24,
      cwd: this.manifest.cwd || process.cwd(),
      env: this.manifest.env || process.env,
    });

    // PTY output → outputPipe
    this.ptyProcess.onData((data: string) => {
      this.outputPipe.write(Buffer.from(data));
    });

    // inputPipe → PTY input
    this.inputPipe.on('data', (data: Buffer) => {
      this.ptyProcess.write(data.toString());
    });

    // Handle process exit
    this.ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`PTY exited: code=${exitCode}, signal=${signal}`);
      this.outputPipe.end();
    });
  }

  resize(cols: number, rows: number): void {
    this.ptyProcess.resize(cols, rows);
    this.terminalSize = { cols, rows };
  }

  sendSignal(signal: string): void {
    this.ptyProcess.kill(signal);
  }
}
```

### Usage: Simple Passthrough

```typescript
const kernel = new Kernel();

// Input
const keyboard = new KeyboardInput(kernel);

// PTY wrapper
const bashPTY = new BasicPTYWrapper(kernel, {
  name: 'bash-session',
  shell: 'bash',
  terminalType: 'xterm-256color',
  initialCols: 80,
  initialRows: 24,
});

// Output
const screen = new ScreenRenderer(kernel);

// Wire it up
kernel.connect(keyboard.output, bashPTY.input);
kernel.connect(bashPTY.output, screen.input);

// Start
await bashPTY.spawn();

// Now you have a basic terminal session (like tmux)
```

## Multi-Modal Output Pattern

### Splitting PTY Output to Multiple Renderers

```typescript
const kernel = new Kernel();

// Input
const keyboard = new KeyboardInput(kernel);

// PTY wrapper for Claude Code
const claudeCodePTY = new BasicPTYWrapper(kernel, {
  name: 'claude-code',
  shell: 'claude-code', // Claude Code CLI
  shellArgs: [],
  terminalType: 'xterm-256color',
  initialCols: 120,
  initialRows: 40,
});

// Multiple renderers
const passthroughRenderer = new PassthroughRenderer(kernel);
const ttsRenderer = new TextToSpeechRenderer(kernel);
const mp4Renderer = new MP4Recorder(kernel, {
  fps: 30,
  width: 1200,
  height: 800,
});
const mcpRenderer = new MCPRenderer(kernel);
const webrtcRenderer = new WebRTCRenderer(kernel);

// Input: keyboard → PTY
kernel.connect(keyboard.output, claudeCodePTY.input);

// Output: PTY → all renderers simultaneously
kernel.split(claudeCodePTY.output, [
  passthroughRenderer.input, // Human sees it
  ttsRenderer.input, // TTS describes changes
  mp4Renderer.input, // Records video
  mcpRenderer.input, // LLM-friendly format
  webrtcRenderer.input, // Streams to remote
]);

await claudeCodePTY.spawn();

// Now Claude Code's UI is:
// - Displayed on screen
// - Read aloud via TTS
// - Recorded as MP4
// - Formatted for LLM
// - Streamed over WebRTC
```

## Multi-Source Input Pattern

### Merging Multiple Inputs to Single PTY

```typescript
const kernel = new Kernel();

// Multiple inputs
const keyboard = new KeyboardInput(kernel);
const voiceInput = new WhisperSTT(kernel);
const aiAgent = new MCPInput(kernel);

// PTY wrapper
const vimPTY = new BasicPTYWrapper(kernel, {
  name: 'vim-session',
  shell: 'vim',
  shellArgs: ['document.txt'],
  terminalType: 'xterm-256color',
});

// Output
const screen = new ScreenRenderer(kernel);

// Multi-input → PTY
kernel.merge([keyboard.output, voiceInput.output, aiAgent.output], vimPTY.input);

// PTY → screen
kernel.connect(vimPTY.output, screen.input);

await vimPTY.spawn();

// Now you can:
// - Type with keyboard
// - Give voice commands ("save file", "quit")
// - Let AI edit the file
// All three control the same vim session
```

## Renderer Modules

### 1. Passthrough Renderer (tmux-like)

Raw ANSI to terminal:

```typescript
class PassthroughRenderer {
  inputPipe: Pipe;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe();

    this.inputPipe.on('data', (data: Buffer) => {
      // Write raw ANSI to stdout
      process.stdout.write(data);
    });
  }
}
```

### 2. Text-to-Speech Renderer

Describes terminal changes aloud:

```typescript
class TextToSpeechRenderer {
  inputPipe: Pipe;
  private parser: ANSIParser;
  private prevState: TerminalState;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe();
    this.parser = new ANSIParser();

    this.inputPipe.on('data', (data: Buffer) => {
      const newState = this.parser.parse(data);
      const changes = this.detectChanges(this.prevState, newState);

      if (changes.text) {
        this.speak(changes.text);
      }

      this.prevState = newState;
    });
  }

  private detectChanges(prev: TerminalState, curr: TerminalState) {
    // Detect what changed
    const newText = this.extractNewText(prev, curr);
    const cursorMoved = this.cursorMoved(prev, curr);

    return {
      text: newText,
      cursorMoved: cursorMoved,
    };
  }

  private speak(text: string): void {
    // Use text-to-speech API
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }
}
```

### 3. MP4 Recorder

Records terminal to video:

```typescript
class MP4Recorder {
  inputPipe: Pipe;
  private canvas: OffscreenCanvas;
  private encoder: VideoEncoder;
  private parser: ANSIParser;

  constructor(kernel: Kernel, options: { fps: number; width: number; height: number }) {
    this.inputPipe = kernel.createPipe();
    this.canvas = new OffscreenCanvas(options.width, options.height);
    this.encoder = new VideoEncoder({
      codec: 'avc1.42001E',
      width: options.width,
      height: options.height,
      framerate: options.fps,
    });

    this.parser = new ANSIParser();

    // Capture frames at specified FPS
    setInterval(() => this.captureFrame(), 1000 / options.fps);

    this.inputPipe.on('data', (data: Buffer) => {
      const state = this.parser.parse(data);
      this.renderToCanvas(state);
    });
  }

  private renderToCanvas(state: TerminalState): void {
    const ctx = this.canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render terminal cells
    ctx.font = '16px monospace';
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const cell = state.cells[y][x];
        ctx.fillStyle = cell.fg || '#FFFFFF';
        ctx.fillText(cell.char, x * 10, y * 20);
      }
    }
  }

  private captureFrame(): void {
    const imageData = this.canvas
      .getContext('2d')
      .getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.encoder.encode(imageData);
  }

  async save(filename: string): Promise<void> {
    await this.encoder.flush();
    await this.encoder.finalize(filename);
  }
}
```

### 4. MCP Renderer (LLM-Friendly)

Formats terminal for LLMs:

```typescript
class MCPRenderer {
  inputPipe: Pipe;
  outputPipe: Pipe;
  private parser: ANSIParser;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe();
    this.outputPipe = kernel.createPipe();
    this.parser = new ANSIParser();

    this.inputPipe.on('data', (data: Buffer) => {
      const state = this.parser.parse(data);
      const formatted = this.formatForLLM(state);
      this.outputPipe.write(JSON.stringify(formatted));
    });
  }

  private formatForLLM(state: TerminalState): any {
    return {
      type: 'terminal_state',
      timestamp: Date.now(),
      content: {
        // Plain text (no ANSI)
        text: this.extractPlainText(state),

        // Cursor position
        cursor: {
          row: state.cursorY,
          col: state.cursorX,
        },

        // Visible region
        viewport: {
          rows: state.rows,
          cols: state.cols,
          scrollback: state.scrollback,
        },

        // Semantic structure
        sections: this.detectSections(state),

        // UI elements
        menu: this.detectMenu(state),
        statusBar: this.detectStatusBar(state),
        activeWindow: this.detectActiveWindow(state),
      },
    };
  }

  private extractPlainText(state: TerminalState): string {
    return state.cells.map((row) => row.map((cell) => cell.char).join('')).join('\n');
  }
}
```

### 5. WebRTC Renderer

Streams terminal to remote viewers:

```typescript
class WebRTCRenderer {
  inputPipe: Pipe;
  private peerConnection: RTCPeerConnection;
  private canvas: OffscreenCanvas;
  private parser: ANSIParser;

  constructor(kernel: Kernel) {
    this.inputPipe = kernel.createPipe();
    this.canvas = new OffscreenCanvas(1200, 800);
    this.parser = new ANSIParser();

    // Set up WebRTC
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // Capture canvas stream
    const stream = this.canvas.captureStream(30); // 30 fps
    stream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, stream);
    });

    this.inputPipe.on('data', (data: Buffer) => {
      const state = this.parser.parse(data);
      this.renderToCanvas(state);
    });
  }

  private renderToCanvas(state: TerminalState): void {
    // Same as MP4Recorder rendering
    // Canvas is captured by WebRTC stream
  }

  async connect(remoteOffer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.peerConnection.setRemoteDescription(remoteOffer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }
}
```

## ANSI/xterm Handling

### ANSI Parser Module

```typescript
class ANSIParser {
  private state: TerminalState;

  constructor() {
    this.state = {
      cells: Array(24)
        .fill(null)
        .map(() => Array(80).fill({ char: ' ', fg: null, bg: null })),
      cursorX: 0,
      cursorY: 0,
      rows: 24,
      cols: 80,
      scrollback: [],
    };
  }

  parse(data: Buffer): TerminalState {
    const str = data.toString();
    let i = 0;

    while (i < str.length) {
      const char = str[i];

      if (char === '\x1b') {
        // ANSI escape sequence
        const seq = this.parseEscapeSequence(str, i);
        this.handleEscapeSequence(seq);
        i += seq.length;
      } else if (char === '\n') {
        // Newline
        this.cursorY++;
        this.cursorX = 0;
        i++;
      } else if (char === '\r') {
        // Carriage return
        this.cursorX = 0;
        i++;
      } else {
        // Regular character
        this.state.cells[this.state.cursorY][this.state.cursorX] = {
          char: char,
          fg: this.state.currentFg,
          bg: this.state.currentBg,
        };
        this.state.cursorX++;
        i++;
      }

      // Handle scrolling
      if (this.state.cursorY >= this.state.rows) {
        this.scroll();
      }
    }

    return this.state;
  }

  private parseEscapeSequence(str: string, start: number): EscapeSequence {
    // Parse ANSI escape sequences
    // Examples:
    // \x1b[31m - Set foreground to red
    // \x1b[2J  - Clear screen
    // \x1b[H   - Move cursor to home

    let i = start + 1; // Skip \x1b

    if (str[i] === '[') {
      // CSI sequence
      i++;
      let params = '';
      while (i < str.length && /[0-9;]/.test(str[i])) {
        params += str[i];
        i++;
      }
      const cmd = str[i];

      return {
        type: 'csi',
        params: params.split(';').map((p) => parseInt(p) || 0),
        cmd: cmd,
        length: i - start + 1,
      };
    }

    return { type: 'unknown', length: 1 };
  }

  private handleEscapeSequence(seq: EscapeSequence): void {
    if (seq.type === 'csi') {
      switch (seq.cmd) {
        case 'm': // SGR (Select Graphic Rendition)
          this.handleSGR(seq.params);
          break;
        case 'H': // Cursor position
          this.state.cursorY = (seq.params[0] || 1) - 1;
          this.state.cursorX = (seq.params[1] || 1) - 1;
          break;
        case 'J': // Clear display
          this.clearDisplay(seq.params[0] || 0);
          break;
        case 'K': // Clear line
          this.clearLine(seq.params[0] || 0);
          break;
      }
    }
  }

  private handleSGR(params: number[]): void {
    for (const param of params) {
      if (param >= 30 && param <= 37) {
        // Foreground color
        this.state.currentFg = this.ansiColorToRGB(param - 30);
      } else if (param >= 40 && param <= 47) {
        // Background color
        this.state.currentBg = this.ansiColorToRGB(param - 40);
      } else if (param === 0) {
        // Reset
        this.state.currentFg = null;
        this.state.currentBg = null;
      }
    }
  }
}
```

## Terminal Resize Handling

### Dynamic Resize with SIGWINCH

```typescript
class ResizablePTYWrapper extends BasicPTYWrapper {
  constructor(kernel: Kernel, manifest: PTYManifest) {
    super(kernel, manifest);

    // Listen for resize events
    process.stdout.on('resize', () => {
      const { columns, rows } = process.stdout;
      this.resize(columns, rows);
    });
  }

  resize(cols: number, rows: number): void {
    // Resize PTY
    this.ptyProcess.resize(cols, rows);
    this.terminalSize = { cols, rows };

    // Notify renderers of resize
    this.outputPipe.emit('resize', { cols, rows });
  }
}
```

### Renderer Resize Handling

```typescript
class MP4Recorder {
  constructor(kernel: Kernel, options: MP4Options) {
    this.inputPipe = kernel.createPipe();

    // Handle resize events
    this.inputPipe.on('resize', ({ cols, rows }) => {
      this.updateCanvasSize(cols, rows);
    });
  }

  private updateCanvasSize(cols: number, rows: number): void {
    const charWidth = 10; // pixels per char
    const charHeight = 20; // pixels per line

    this.canvas.width = cols * charWidth;
    this.canvas.height = rows * charHeight;
  }
}
```

## Signal Handling

### Control Signals

```typescript
class SignalAwarePTYWrapper extends BasicPTYWrapper {
  constructor(kernel: Kernel, manifest: PTYManifest) {
    super(kernel, manifest);

    // Handle Ctrl+C (SIGINT)
    process.on('SIGINT', () => {
      this.ptyProcess.kill('SIGINT');
    });

    // Handle Ctrl+Z (SIGTSTP)
    process.on('SIGTSTP', () => {
      this.ptyProcess.kill('SIGTSTP');
    });

    // Handle terminal close (SIGHUP)
    process.on('SIGHUP', () => {
      this.ptyProcess.kill('SIGHUP');
      this.shutdown();
    });
  }

  sendSignal(signal: string): void {
    this.ptyProcess.kill(signal);
  }
}
```

## Examples

### Example 1: Wrap Claude Code with Multiple Renderers

```typescript
const kernel = new Kernel();

// Input
const keyboard = new KeyboardInput(kernel);

// PTY wrapper for Claude Code
const claudeCode = new PTYWrapper(kernel, {
  name: 'claude-code-session',
  fqdn: 'localhost',
  class: '0xFFFF',
  owner: 'user',
  uuid: uuidv4(),
  shell: 'claude-code',
  shellArgs: [],
  terminalType: 'xterm-256color',
  initialCols: 120,
  initialRows: 40,
  ioMode: 'pty',
  terminals: [
    { name: 'input', direction: 'input', protocol: 'ansi' },
    { name: 'output', direction: 'output', protocol: 'ansi' },
  ],
  capabilities: {
    type: 'source',
    accepts: ['keyboard-input', 'ansi-commands'],
    produces: ['ansi-output'],
    features: ['tui', 'interactive', 'code-editing'],
  },
});

// Renderers
const screen = new PassthroughRenderer(kernel);
const tts = new TextToSpeechRenderer(kernel);
const mp4 = new MP4Recorder(kernel, { fps: 30, width: 1200, height: 800 });
const mcp = new MCPRenderer(kernel);

// Wire it up
kernel.connect(keyboard.output, claudeCode.input);
kernel.split(claudeCode.output, [screen.input, tts.input, mp4.input, mcp.input]);

// Start
await claudeCode.spawn();

// Now Claude Code is:
// - Displayed on your terminal
// - Described aloud via TTS
// - Recorded as video
// - Formatted for LLM consumption
```

### Example 2: Multi-Input vim Session

```typescript
const kernel = new Kernel();

// Multiple inputs
const keyboard = new KeyboardInput(kernel);
const voice = new WhisperSTT(kernel, {
  commands: {
    'save file': ':w\n',
    quit: ':q\n',
    'delete line': 'dd',
    undo: 'u',
  },
});
const aiAgent = new MCPInput(kernel);

// PTY wrapper for vim
const vim = new PTYWrapper(kernel, {
  name: 'vim-session',
  shell: 'vim',
  shellArgs: ['document.txt'],
  terminalType: 'xterm-256color',
  initialCols: 80,
  initialRows: 24,
  ioMode: 'pty',
});

// Output
const screen = new PassthroughRenderer(kernel);

// Wire it up
kernel.merge([keyboard.output, voice.output, aiAgent.output], vim.input);

kernel.connect(vim.output, screen.input);

// Start
await vim.spawn();

// Now you can:
// - Type normally with keyboard
// - Say "save file" to execute :w
// - Let AI agent edit the file
```

### Example 3: htop with Remote WebRTC Streaming

```typescript
const kernel = new Kernel();

// PTY wrapper for htop
const htop = new PTYWrapper(kernel, {
  name: 'htop-monitor',
  shell: 'htop',
  terminalType: 'xterm-256color',
  initialCols: 120,
  initialRows: 40,
  ioMode: 'pty',
});

// Local screen
const screen = new PassthroughRenderer(kernel);

// Remote WebRTC stream
const webrtc = new WebRTCRenderer(kernel);

// Split output
kernel.split(htop.output, [screen.input, webrtc.input]);

// Start
await htop.spawn();

// htop is now:
// - Displayed locally
// - Streamed to remote viewers via WebRTC
```

## Testing

### Unit Tests

```typescript
describe('PTYWrapper', () => {
  it('should spawn PTY process', async () => {
    const wrapper = new PTYWrapper(kernel, {
      name: 'test',
      shell: 'bash',
      ioMode: 'pty',
    });

    await wrapper.spawn();

    expect(wrapper.isRunning()).toBe(true);
    expect(wrapper.ptyProcess).toBeDefined();
  });

  it('should pipe data bidirectionally', async () => {
    const wrapper = new PTYWrapper(kernel, {
      name: 'test',
      shell: 'cat',
      ioMode: 'pty',
    });

    await wrapper.spawn();

    const output: Buffer[] = [];
    wrapper.outputPipe.on('data', (data) => output.push(data));

    wrapper.inputPipe.write('hello\n');

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(Buffer.concat(output).toString()).toContain('hello');
  });

  it('should handle resize', async () => {
    const wrapper = new PTYWrapper(kernel, {
      name: 'test',
      shell: 'bash',
      initialCols: 80,
      initialRows: 24,
      ioMode: 'pty',
    });

    await wrapper.spawn();

    wrapper.resize(120, 40);

    expect(wrapper.terminalSize).toEqual({ cols: 120, rows: 40 });
  });
});
```

### Integration Tests

```typescript
it('should split PTY output to multiple renderers', async () => {
  const kernel = new Kernel();

  const pty = new PTYWrapper(kernel, {
    name: 'test',
    shell: 'echo',
    shellArgs: ['hello'],
    ioMode: 'pty',
  });

  const renderer1 = new PassthroughRenderer(kernel);
  const renderer2 = new PassthroughRenderer(kernel);

  const output1: Buffer[] = [];
  const output2: Buffer[] = [];

  renderer1.inputPipe.on('data', (data) => output1.push(data));
  renderer2.inputPipe.on('data', (data) => output2.push(data));

  kernel.split(pty.output, [renderer1.input, renderer2.input]);

  await pty.spawn();

  await new Promise((resolve) => setTimeout(resolve, 200));

  const str1 = Buffer.concat(output1).toString();
  const str2 = Buffer.concat(output2).toString();

  expect(str1).toContain('hello');
  expect(str2).toContain('hello');
});
```

## Integration Points

### With External Wrapper (RFC 11)

PTYWrapper extends ExternalServerWrapper:

```typescript
class PTYWrapper extends ExternalServerWrapper {
  ioMode: 'pty'; // Always PTY mode
  ptyProcess: IPty;

  async spawn(): Promise<void> {
    // Spawn via node-pty instead of child_process
    this.ptyProcess = pty.spawn(this.manifest.shell, this.manifest.shellArgs, {
      name: this.manifest.terminalType,
      cols: this.manifest.initialCols,
      rows: this.manifest.initialRows,
      env: this.manifest.env,
      cwd: this.manifest.cwd,
    });

    // Same pipe connections as base wrapper
    this.ptyProcess.onData((data) => this.outputPipe.write(Buffer.from(data)));
    this.inputPipe.on('data', (data) => this.ptyProcess.write(data.toString()));

    // Register with Hostess
    await this.registerWithHostess();
  }
}
```

### With Executor (RFC 10)

Executor spawns PTY wrappers:

```typescript
class Executor {
  async spawnPTYWrapper(manifest: PTYManifest): Promise<PTYWrapper> {
    const wrapper = new PTYWrapper(this.kernel, manifest);
    await wrapper.spawn();

    // Register with Hostess
    await this.hostess.register({
      id: manifest.uuid,
      servername: manifest.name,
      class: manifest.class,
      terminals: manifest.terminals,
      capabilities: manifest.capabilities,
    });

    return wrapper;
  }
}
```

### With StateManager (RFC 07)

PTY wrappers appear in topology:

```typescript
// Wiring config
const config: WiringConfig = {
  connections: [
    {
      source: 'keyboard-input.output',
      target: 'claude-code-pty.input',
    },
    {
      source: 'claude-code-pty.output',
      target: 'screen-renderer.input',
    },
    {
      source: 'claude-code-pty.output',
      target: 'tts-renderer.input',
    },
  ],
};

// Apply wiring
await stateManager.applyWiring(config);

// Topology shows PTY connections
const mermaid = stateManager.exportMermaid();
// keyboard-input --> claude-code-pty(PTY: Claude Code)
// claude-code-pty --> screen-renderer
// claude-code-pty --> tts-renderer
```

## Performance Considerations

### PTY Overhead

- PTY creation: ~5-10ms
- Data throughput: ~100MB/s typical
- Latency: <1ms for local PTY

### Multi-Modal Rendering Overhead

Each renderer adds:

- PassthroughRenderer: ~0.1ms
- MP4Recorder: ~5-10ms (encoding overhead)
- TextToSpeech: ~50-100ms (synthesis latency)
- MCPRenderer: ~1-2ms (parsing/formatting)
- WebRTCRenderer: ~10-30ms (encoding + network)

### Optimization Strategies

1. **Lazy rendering**: Only render when data changes
2. **Batching**: Batch multiple updates before rendering
3. **Differential updates**: Only render changed regions
4. **Backpressure**: Pause PTY if renderers can't keep up

## Future Enhancements

### Phase 2: Advanced Features

- **Smart ANSI parsing**: Semantic understanding of TUI layouts
- **Renderer plugins**: Pluggable renderer architecture
- **Recording modes**: Replay, pause, fast-forward
- **Screen scraping**: Extract structured data from TUIs

### Phase 3: Accessibility

- **Braille display output**: Real-time braille rendering
- **Screen reader integration**: NVDA/JAWS/VoiceOver
- **High contrast mode**: Accessibility-friendly rendering
- **Keyboard shortcuts**: Configurable hotkeys

## Summary

PTY wrapper patterns enable:

1. ✅ **TUI application hijacking** - Wrap any terminal app (Claude Code, vim, etc.)
2. ✅ **Multi-modal output** - Split to screen, TTS, MP4, MCP, WebRTC
3. ✅ **Multi-source input** - Merge keyboard, voice, AI commands
4. ✅ **Start simple** - Begin with tmux-like passthrough
5. ✅ **Scale to complex** - Add renderers as needed
6. ✅ **ANSI compatibility** - Full xterm/ANSI support via parser
7. ✅ **Terminal resize** - Dynamic size changes (SIGWINCH)

**Key principles:**

- PTYWrapper extends ExternalServerWrapper
- Each renderer is a separate module
- Use kernel's split()/merge() for topology
- Location transparent - works locally or distributed

**Integration:**

- Executor spawns PTY wrappers
- Hostess registers PTY servers
- StateManager wires PTY connections
- Kernel provides pipe plumbing

See also:

- **[RFC 11: External Server Wrapper](11-external-wrapper.md)** - Base wrapper architecture
- **[RFC 04: PTY Use Cases](04-pty-use-cases.md)** - Real-world PTY usage examples
- **[RFC 03: Module Types](03-module-types.md)** - Module composition patterns
