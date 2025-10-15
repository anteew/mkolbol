export interface AnsiParserState {
    cursorX: number;
    cursorY: number;
    bold: boolean;
    underline: boolean;
    foregroundColor: number | null;
    backgroundColor: number | null;
    inverse: boolean;
}
export interface AnsiParserEvent {
    type: 'print' | 'cursor' | 'erase' | 'style';
    data: any;
}
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
//# sourceMappingURL=AnsiParser.d.ts.map