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
    data: {
        char: string;
        x: number;
        y: number;
        style?: AnsiParserState;
    };
}
interface CursorEvent {
    type: 'cursor';
    data: {
        action: 'position' | 'up' | 'down' | 'forward' | 'back' | 'carriageReturn' | 'backspace';
        x: number;
        y: number;
        amount?: number;
    };
}
interface EraseEvent {
    type: 'erase';
    data: {
        target: 'display' | 'line';
        mode: number;
    };
}
interface StyleEvent {
    type: 'style';
    data: AnsiParserState;
}
interface ResizeEvent {
    type: 'resize';
    data: {
        cols: number;
        rows: number;
    };
}
interface ModeEvent {
    type: 'mode';
    data: {
        mode: number;
        enabled: boolean;
        isDEC: boolean;
    };
}
export type AnsiParserEvent = PrintEvent | CursorEvent | EraseEvent | StyleEvent | ResizeEvent | ModeEvent;
export interface AnsiParserOptions {
    scrollbackLimit?: number;
    cols?: number;
    rows?: number;
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
export declare class AnsiParser {
    private state;
    private buffer;
    private events;
    private charBatch;
    private batchStartX;
    private batchStartY;
    private scrollback;
    private scrollbackLimit;
    private currentLine;
    private currentLineStyle;
    private cols;
    private rows;
    constructor(options?: AnsiParserOptions);
    private createInitialState;
    parse(input: string): AnsiParserEvent[];
    private flushCharBatch;
    private parseEscapeSequence;
    private parseCSI;
    private parseOSC;
    private executeCSI;
    private parseParams;
    private handleSGR;
    private handleCUP;
    private handleCUU;
    private handleCUD;
    private handleCUF;
    private handleCUB;
    private handleED;
    private handleEL;
    private handleSetMode;
    private handleWindowCommand;
    private applyResize;
    resize(cols: number, rows: number): ResizeEvent;
    private handleLineFeed;
    private pushLineToScrollback;
    private handleCarriageReturn;
    private handleTab;
    private handleBackspace;
    getState(): AnsiParserState;
    getScrollback(): ScrollbackLine[];
    getDimensions(): {
        cols: number;
        rows: number;
    };
    snapshot(): TerminalSnapshot;
    exportJSON(): string;
    exportPlainText(): string;
    reset(): void;
}
export {};
//# sourceMappingURL=AnsiParser.d.ts.map