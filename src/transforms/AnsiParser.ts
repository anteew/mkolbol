export interface AnsiParserState {
  cursorX: number;
  cursorY: number;
  bold: boolean;
  underline: boolean;
  foregroundColor: number | null;
  backgroundColor: number | null;
  inverse: boolean;
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
  data: { cursorX: number; cursorY: number; bold: boolean; underline: boolean; foregroundColor: number | null; backgroundColor: number | null; inverse: boolean };
}

export type AnsiParserEvent = PrintEvent | CursorEvent | EraseEvent | StyleEvent;

export interface AnsiParserOptions {
  scrollbackLimit?: number;
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

  constructor(options: AnsiParserOptions = {}) {
    this.scrollbackLimit = options.scrollbackLimit ?? 1000;
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
    };
  }

  parse(input: string): AnsiParserEvent[] {
    this.events.length = 0;
    this.buffer = input;
    this.charBatch = '';
    let i = 0;

    while (i < this.buffer.length) {
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
        style: { 
          cursorX: this.state.cursorX,
          cursorY: this.state.cursorY,
          bold: this.state.bold,
          underline: this.state.underline,
          foregroundColor: this.state.foregroundColor,
          backgroundColor: this.state.backgroundColor,
          inverse: this.state.inverse,
        } 
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

    while (i < this.buffer.length) {
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
    }
  }

  private parseParams(paramStr: string): number[] {
    if (paramStr.length === 0) return [];
    
    const params: number[] = [];
    let current = 0;
    let hasDigits = false;

    for (let i = 0; i < paramStr.length; i++) {
      const charCode = paramStr.charCodeAt(i);
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
      } else if (param === 39) {
        this.state.foregroundColor = null;
      } else if (param >= 40 && param <= 47) {
        this.state.backgroundColor = param - 40;
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
      data: { 
        cursorX: this.state.cursorX,
        cursorY: this.state.cursorY,
        bold: this.state.bold,
        underline: this.state.underline,
        foregroundColor: this.state.foregroundColor,
        backgroundColor: this.state.backgroundColor,
        inverse: this.state.inverse,
      },
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
    return { 
      cursorX: this.state.cursorX,
      cursorY: this.state.cursorY,
      bold: this.state.bold,
      underline: this.state.underline,
      foregroundColor: this.state.foregroundColor,
      backgroundColor: this.state.backgroundColor,
      inverse: this.state.inverse,
    };
  }

  getScrollback(): ScrollbackLine[] {
    return [...this.scrollback];
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
