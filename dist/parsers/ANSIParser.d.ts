import type { TerminalState } from '../types.js';
export declare class ANSIParser {
    private state;
    constructor(rows?: number, cols?: number);
    private createEmptyState;
    parse(data: Buffer): TerminalState;
    private parseEscapeSequence;
    private handleEscapeSequence;
    private handleSGR;
    private ansiColorToRGB;
    private clearDisplay;
    private clearLine;
    private scroll;
    getState(): TerminalState;
    reset(): void;
}
//# sourceMappingURL=ANSIParser.d.ts.map