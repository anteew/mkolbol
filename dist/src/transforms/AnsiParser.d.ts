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
    data: {
        cursorX: number;
        cursorY: number;
        bold: boolean;
        underline: boolean;
        foregroundColor: number | null;
        backgroundColor: number | null;
        inverse: boolean;
    };
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
    private handleLineFeed;
    private pushLineToScrollback;
    private handleCarriageReturn;
    private handleTab;
    private handleBackspace;
    getState(): AnsiParserState;
    getScrollback(): ScrollbackLine[];
    snapshot(): TerminalSnapshot;
    exportJSON(): string;
    exportPlainText(): string;
    reset(): void;
}
export {};
//# sourceMappingURL=AnsiParser.d.ts.map