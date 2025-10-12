export interface CodeFrame {
    file: string;
    line: number;
    column?: number;
    source: string[];
    context: {
        before: string[];
        focus: string;
        after: string[];
    };
}
export interface StackFrame {
    file?: string;
    line?: number;
    column?: number;
    function?: string;
}
export declare class CodeFrameExtractor {
    private contextLines;
    private sourcemapCache;
    constructor(contextLines?: number);
    extractFromStack(stack: string): CodeFrame[];
    private parseStackTrace;
    private parseStackLine;
    private resolveSourceMap;
    private extractCodeFrame;
    formatCodeFrame(codeFrame: CodeFrame): string;
}
//# sourceMappingURL=codeframe.d.ts.map