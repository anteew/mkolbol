export interface AnsiParserState {
  cursorX: number;
  cursorY: number;
  bold: boolean;
  underline: boolean;
  foregroundColor: number | string | null;
  backgroundColor: number | string | null;
  inverse: boolean;
  autoWrap: boolean;
  screenInverse: boolean;
}

interface PrintEvent {
  type: 'print';
  data: { char: string; x: number; y: number; style?: AnsiParserState };
}

interface CursorEvent {
  type: 'cursor';
  data: { action: 'position' | 'up' | 'down' | 'forward' | 'back' | 'carriageReturn' | 'backspace'; x: number; y: number; amount?: number };
}

interface EraseEvent {
  type: 'erase';
  data: { target: 'display' | 'line'; mode: number };
}

interface StyleEvent {
  type: 'style';
  data: AnsiParserState;
}

interface ResizeEvent {
  type: 'resize';
  data: { cols: number; rows: number };
}

interface ModeEvent {
  type: 'mode';
  data: { mode: number; enabled: boolean; isDEC: boolean };
}

export type AnsiParserEvent = PrintEvent | CursorEvent | EraseEvent | StyleEvent | ResizeEvent | ModeEvent;

export interface AnsiParserOptions {
  scrollbackLimit?: number;
  cols?: number;
  rows?: number;
  oscMaxLength?: number;
  oscTimeoutMs?: number;
  maxParseIterations?: number;
}

export interface ScrollbackLine {
  content: string;
  style: AnsiParserState;
  timestamp: number;
}

export interface TerminalSnapshot {
  state: AnsiParserState;
  scrollback: ScrollbackLine[];
  timestamp: number;
}

const ANSI_BASE_COLORS = [
  '#000000', '#800000', '#008000', '#808000',
  '#000080', '#800080', '#008080', '#c0c0c0',
  '#808080', '#ff0000', '#00ff00', '#ffff00',
  '#0000ff', '#ff00ff', '#00ffff', '#ffffff',
];

const ANSI_COLOR_LEVELS = [0, 95, 135, 175, 215, 255];

const TRUECOLOR_CACHE = new Map<number, string>();

function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 255) return 255;
  return Math.round(value);
}

function componentToHex(value: number): string {
  return clampByte(value).toString(16).padStart(2, '0');
}

function composeHex(r: number, g: number, b: number): string {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  const rr = clampByte(r);
  const gg = clampByte(g);
  const bb = clampByte(b);
  const key = (rr << 16) | (gg << 8) | bb;
  let cached = TRUECOLOR_CACHE.get(key);
  if (!cached) {
    cached = composeHex(rr, gg, bb);
    TRUECOLOR_CACHE.set(key, cached);
  }
  return cached;
}

const ANSI_256_PALETTE: string[] = (() => {
  const palette = new Array<string>(256);

  for (let i = 0; i < ANSI_BASE_COLORS.length; i++) {
    palette[i] = ANSI_BASE_COLORS[i];
  }

  let index = 16;
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        const red = ANSI_COLOR_LEVELS[r];
        const green = ANSI_COLOR_LEVELS[g];
        const blue = ANSI_COLOR_LEVELS[b];
        palette[index++] = composeHex(red, green, blue);
      }
    }
  }

  for (let i = 0; i < 24; i++) {
    const level = 8 + i * 10;
    palette[232 + i] = composeHex(level, level, level);
  }

  // safety fallback
  for (let i = 0; i < palette.length; i++) {
    if (!palette[i]) {
      palette[i] = '#000000';
    }
  }

  return palette;
})();

function ansi256ToHex(index: number): string {
  const clamped = clampByte(index);
  return ANSI_256_PALETTE[clamped] ?? '#000000';
}

export class AnsiParser {
  private state: AnsiParserState;
  private buffer: string = '';
  private events: AnsiParserEvent[] = [];
  private charBatch: string = '';
  private batchStartX: number = 0;
  private batchStartY: number = 0;
  private scrollback: ScrollbackLine[] = [];
  private scrollbackLimit: number;
  private currentLine: string = '';
  private currentLineStyle: AnsiParserState;
  private cols: number;
  private rows: number;
  private oscMaxLength: number;
  private oscTimeoutMs: number;
  private maxParseIterations: number;
  private parseStartTime: number = 0;

  constructor(options: AnsiParserOptions = {}) {
    this.scrollbackLimit = options.scrollbackLimit ?? 1000;
    this.cols = Math.max(1, Math.floor(options.cols ?? 80));
    this.rows = Math.max(1, Math.floor(options.rows ?? 24));
    this.oscMaxLength = options.oscMaxLength ?? 100000;
    this.oscTimeoutMs = options.oscTimeoutMs ?? 5000;
    this.maxParseIterations = options.maxParseIterations ?? 1000000;
    this.state = this.createInitialState();
    this.currentLineStyle = { ...this.state };
  }

  private createInitialState(): AnsiParserState {
    return {
      cursorX: 0,
      cursorY: 0,
      bold: false,
      underline: false,
      foregroundColor: null,
      backgroundColor: null,
      inverse: false,
      autoWrap: true,
      screenInverse: false,
    };
  }

  parse(input: string): AnsiParserEvent[] {
    this.events.length = 0;
    this.buffer = input;
    this.charBatch = '';
    this.parseStartTime = Date.now();
    let i = 0;
    let iterations = 0;

    while (i < this.buffer.length) {
      // Performance guard: prevent infinite loops
      if (++iterations > this.maxParseIterations) {
        this.flushCharBatch();
        break;
      }

      // Performance guard: prevent long-running parsing
      if (Date.now() - this.parseStartTime > this.oscTimeoutMs) {
        this.flushCharBatch();
        break;
      }

      const charCode = this.buffer.charCodeAt(i);

      if (charCode === 0x1B) {
        this.flushCharBatch();
        const escapeLen = this.parseEscapeSequence(i);
        i += escapeLen;
      } else if (charCode === 0x9B) { // CSI (single-byte)
        this.flushCharBatch();
        const consumed = this.parseCSI(i + 1, 1);
        i += consumed; // includes prefix
      } else if (charCode === 0x0A) {
        this.flushCharBatch();
        this.handleLineFeed();
        i++;
      } else if (charCode === 0x0D) {
        this.flushCharBatch();
        this.handleCarriageReturn();
        i++;
      } else if (charCode === 0x09) {
        this.flushCharBatch();
        this.handleTab();
        i++;
      } else if (charCode === 0x08) {
        this.flushCharBatch();
        this.handleBackspace();
        i++;
      } else if ((charCode >= 32 && charCode <= 126) || charCode >= 160) {
        if (this.charBatch.length === 0) {
          this.batchStartX = this.state.cursorX;
          this.batchStartY = this.state.cursorY;
        }
        this.charBatch += this.buffer[i];
        this.state.cursorX++;
        if (this.cols > 0 && this.state.cursorX >= this.cols) {
          if (this.state.autoWrap) {
            this.flushCharBatch();
            this.state.cursorX = 0;
            this.state.cursorY++;
          } else {
            this.state.cursorX = this.cols - 1;
          }
        }
        i++;
      } else {
        i++;
      }
    }

    this.flushCharBatch();
    return this.events;
  }

  private flushCharBatch(): void {
    if (this.charBatch.length === 0) return;

    this.currentLine += this.charBatch;
    this.currentLineStyle = { ...this.state };

    this.events.push({
      type: 'print',
      data: { 
        char: this.charBatch, 
        x: this.batchStartX, 
        y: this.batchStartY, 
        style: { ...this.state },
      },
    });
    this.charBatch = '';
  }

  private parseEscapeSequence(startIndex: number): number {
    const start = startIndex;
    let i = startIndex + 1;

    if (i >= this.buffer.length) return 1;

    const next = this.buffer[i];

    if (next === '[') {
      i++;
      const consumed = this.parseCSI(i, 2); // include ESC + '['
      return consumed;
    } else if (next === ']') {
      i++;
      const oscLen = this.parseOSC(i);
      return oscLen;
    }

    return i - start;
  }

  private parseCSI(startIndex: number, prefixLen: number): number {
    let i = startIndex;
    const paramStart = i;

    while (i < this.buffer.length) {
      const charCode = this.buffer.charCodeAt(i);

      if (charCode >= 0x30 && charCode <= 0x3F) {
        // parameter bytes 0-9:;<=>?
        i++;
      } else if (charCode >= 0x40 && charCode <= 0x7E) {
        // final byte
        const paramStr = this.buffer.slice(paramStart, i);
        this.executeCSI(paramStr, this.buffer[i]);
        // consumed = prefixLen + params length + 1 final byte
        return prefixLen + (i - startIndex) + 1 + (prefixLen === 2 ? 0 : 0);
      } else {
        break;
      }
    }

    // Incomplete sequence; consume whatever we saw plus prefix
    return prefixLen + (i - startIndex);
  }

  private parseOSC(startIndex: number): number {
    let i = startIndex;
    const oscStart = startIndex;

    while (i < this.buffer.length) {
      // Guard: Prevent OSC payload DOS attacks
      const oscLength = i - oscStart;
      if (oscLength > this.oscMaxLength) {
        // Abort this OSC sequence and skip to end marker or limit
        return oscLength + 2;
      }

      // Guard: Timeout check for incomplete sequences
      if (Date.now() - this.parseStartTime > this.oscTimeoutMs) {
        return i - startIndex + 2;
      }

      const char = this.buffer[i];
      if (char === '\x07' || (char === '\x1B' && this.buffer[i + 1] === '\\')) {
        return i - startIndex + (char === '\x07' ? 3 : 4);
      }
      i++;
    }

    return i - startIndex + 2;
  }

  private executeCSI(paramStr: string, command: string): void {
    const params = this.parseParams(paramStr);
    const isDEC = paramStr.startsWith('?');

    switch (command) {
      case 'm':
        this.handleSGR(params);
        break;
      case 'H':
      case 'f':
        this.handleCUP(params);
        break;
      case 'A':
        this.handleCUU(params[0] || 1);
        break;
      case 'B':
        this.handleCUD(params[0] || 1);
        break;
      case 'C':
        this.handleCUF(params[0] || 1);
        break;
      case 'D':
        this.handleCUB(params[0] || 1);
        break;
      case 'J':
        this.handleED(params[0] || 0);
        break;
      case 'K':
        this.handleEL(params[0] || 0);
        break;
      case 'h':
        this.handleSetMode(params, isDEC, true);
        break;
      case 'l':
        this.handleSetMode(params, isDEC, false);
        break;
      case 't':
        this.handleWindowCommand(params);
        break;
    }
  }

  private parseParams(paramStr: string): number[] {
    if (paramStr.length === 0) return [];
    
    let str = paramStr;
    if (str.startsWith('?')) {
      str = str.slice(1);
    }
    
    const params: number[] = [];
    let current = 0;
    let hasDigits = false;

    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode >= 48 && charCode <= 57) {
        current = current * 10 + (charCode - 48);
        hasDigits = true;
      } else if (charCode === 59) {
        params.push(hasDigits ? current : 0);
        current = 0;
        hasDigits = false;
      }
    }
    params.push(hasDigits ? current : 0);

    return params;
  }

  private handleSGR(params: number[]): void {
    if (params.length === 0) params = [0];

    for (let i = 0; i < params.length; i++) {
      const param = params[i];

      if (param === 0) {
        this.state.bold = false;
        this.state.underline = false;
        this.state.inverse = false;
        this.state.foregroundColor = null;
        this.state.backgroundColor = null;
      } else if (param === 1) {
        this.state.bold = true;
      } else if (param === 4) {
        this.state.underline = true;
      } else if (param === 7) {
        this.state.inverse = true;
      } else if (param === 22) {
        this.state.bold = false;
      } else if (param === 24) {
        this.state.underline = false;
      } else if (param === 27) {
        this.state.inverse = false;
      } else if (param >= 30 && param <= 37) {
        this.state.foregroundColor = param - 30;
      } else if (param === 38) {
        // 256-color or truecolor foreground
        if (i + 1 < params.length) {
          if (params[i + 1] === 5 && i + 2 < params.length) {
            // ESC[38;5;n - 256-color
            this.state.foregroundColor = ansi256ToHex(params[i + 2]);
            i += 2;
          } else if (params[i + 1] === 2 && i + 4 < params.length) {
            // ESC[38;2;r;g;b - truecolor
            const r = params[i + 2];
            const g = params[i + 3];
            const b = params[i + 4];
            this.state.foregroundColor = rgbToHex(r, g, b);
            i += 4;
          }
        }
      } else if (param === 39) {
        this.state.foregroundColor = null;
      } else if (param >= 40 && param <= 47) {
        this.state.backgroundColor = param - 40;
      } else if (param === 48) {
        // 256-color or truecolor background
        if (i + 1 < params.length) {
          if (params[i + 1] === 5 && i + 2 < params.length) {
            // ESC[48;5;n - 256-color
            this.state.backgroundColor = ansi256ToHex(params[i + 2]);
            i += 2;
          } else if (params[i + 1] === 2 && i + 4 < params.length) {
            // ESC[48;2;r;g;b - truecolor
            const r = params[i + 2];
            const g = params[i + 3];
            const b = params[i + 4];
            this.state.backgroundColor = rgbToHex(r, g, b);
            i += 4;
          }
        }
      } else if (param === 49) {
        this.state.backgroundColor = null;
      } else if (param >= 90 && param <= 97) {
        this.state.foregroundColor = param - 90 + 8;
      } else if (param >= 100 && param <= 107) {
        this.state.backgroundColor = param - 100 + 8;
      }
    }

    this.events.push({
      type: 'style',
      data: { ...this.state },
    });
  }

  private handleCUP(params: number[]): void {
    const row = (params[0] || 1) - 1;
    const col = (params[1] || 1) - 1;
    this.state.cursorY = Math.max(0, row);
    this.state.cursorX = Math.max(0, col);

    this.events.push({
      type: 'cursor',
      data: { action: 'position', x: this.state.cursorX, y: this.state.cursorY },
    });
  }

  private handleCUU(n: number): void {
    this.state.cursorY = Math.max(0, this.state.cursorY - n);
    this.events.push({
      type: 'cursor',
      data: { action: 'up', amount: n, x: this.state.cursorX, y: this.state.cursorY },
    });
  }

  private handleCUD(n: number): void {
    this.state.cursorY += n;
    this.events.push({
      type: 'cursor',
      data: { action: 'down', amount: n, x: this.state.cursorX, y: this.state.cursorY },
    });
  }

  private handleCUF(n: number): void {
    this.state.cursorX += n;
    this.events.push({
      type: 'cursor',
      data: { action: 'forward', amount: n, x: this.state.cursorX, y: this.state.cursorY },
    });
  }

  private handleCUB(n: number): void {
    this.state.cursorX = Math.max(0, this.state.cursorX - n);
    this.events.push({
      type: 'cursor',
      data: { action: 'back', amount: n, x: this.state.cursorX, y: this.state.cursorY },
    });
  }

  private handleED(mode: number): void {
    this.events.push({
      type: 'erase',
      data: { target: 'display', mode },
    });
  }

  private handleEL(mode: number): void {
    this.events.push({
      type: 'erase',
      data: { target: 'line', mode },
    });
  }

  private handleSetMode(params: number[], isDEC: boolean, enabled: boolean): void {
    for (const mode of params) {
      if (isDEC) {
        if (mode === 7) {
          this.state.autoWrap = enabled;
        } else if (mode === 5) {
          this.state.screenInverse = enabled;
        }
      }

      this.events.push({
        type: 'mode',
        data: { mode, enabled, isDEC },
      });
    }
  }

  private handleWindowCommand(params: number[]): void {
    if (params.length === 0) return;

    const command = params[0];

    if (command === 8) {
      const rows = params[1] ?? this.rows;
      const cols = params[2] ?? this.cols;
      const resizeEvent = this.applyResize(cols, rows);
      this.events.push(resizeEvent);
    }
  }

  private applyResize(cols: number, rows: number): ResizeEvent {
    const normalizedCols = Math.max(1, Math.floor(cols));
    const normalizedRows = Math.max(1, Math.floor(rows));

    this.cols = normalizedCols;
    this.rows = normalizedRows;

    if (this.state.cursorX >= normalizedCols) {
      this.state.cursorX = Math.max(0, normalizedCols - 1);
    }

    if (this.state.cursorY >= normalizedRows) {
      this.state.cursorY = Math.max(0, normalizedRows - 1);
    }

    this.batchStartX = Math.min(this.batchStartX, this.state.cursorX);
    this.batchStartY = Math.min(this.batchStartY, this.state.cursorY);

    return {
      type: 'resize',
      data: { cols: normalizedCols, rows: normalizedRows },
    };
  }

  resize(cols: number, rows: number): ResizeEvent {
    return this.applyResize(cols, rows);
  }

  private handleLineFeed(): void {
    this.pushLineToScrollback();
    this.state.cursorY++;
    this.events.push({
      type: 'print',
      data: { char: '\n', x: this.state.cursorX, y: this.state.cursorY },
    });
  }

  private pushLineToScrollback(): void {
    if (this.currentLine.length > 0) {
      this.scrollback.push({
        content: this.currentLine,
        style: { ...this.currentLineStyle },
        timestamp: Date.now(),
      });
      
      if (this.scrollback.length > this.scrollbackLimit) {
        this.scrollback.shift();
      }
      
      this.currentLine = '';
    }
  }

  private handleCarriageReturn(): void {
    this.state.cursorX = 0;
    this.events.push({
      type: 'cursor',
      data: { action: 'carriageReturn', x: 0, y: this.state.cursorY },
    });
  }

  private handleTab(): void {
    const nextTabStop = Math.floor(this.state.cursorX / 8) * 8 + 8;
    this.state.cursorX = nextTabStop;
    this.events.push({
      type: 'print',
      data: { char: '\t', x: this.state.cursorX, y: this.state.cursorY },
    });
  }

  private handleBackspace(): void {
    this.state.cursorX = Math.max(0, this.state.cursorX - 1);
    this.events.push({
      type: 'cursor',
      data: { action: 'backspace', x: this.state.cursorX, y: this.state.cursorY },
    });
  }

  getState(): AnsiParserState {
    return { ...this.state };
  }

  getScrollback(): ScrollbackLine[] {
    return [...this.scrollback];
  }

  getDimensions(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows };
  }

  snapshot(): TerminalSnapshot {
    return {
      state: { ...this.state },
      scrollback: [...this.scrollback],
      timestamp: Date.now(),
    };
  }

  exportJSON(): string {
    return JSON.stringify(this.snapshot(), null, 2);
  }

  exportPlainText(): string {
    const lines = this.scrollback.map(line => line.content);
    return lines.join('\n');
  }

  reset(): void {
    this.state = this.createInitialState();
    this.buffer = '';
    this.events = [];
    this.scrollback = [];
    this.currentLine = '';
    this.currentLineStyle = { ...this.state };
  }
}
