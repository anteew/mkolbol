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
export declare class AnsiParser {
    private state;
    private buffer;
    private events;
    constructor();
    private createInitialState;
    parse(input: string): AnsiParserEvent[];
    private parseEscapeSequence;
    private parseCSI;
    private parseOSC;
    private executeCSI;
    private handleSGR;
    private handleCUP;
    private handleCUU;
    private handleCUD;
    private handleCUF;
    private handleCUB;
    private handleED;
    private handleEL;
    private handleLineFeed;
    private handleCarriageReturn;
    private handleTab;
    private handleBackspace;
    private handlePrintable;
    getState(): AnsiParserState;
    reset(): void;
}
//# sourceMappingURL=AnsiParser.d.ts.map