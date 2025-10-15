export interface RedactionPattern {
    name: string;
    pattern: RegExp;
    replacement: string;
}
export interface RedactionResult {
    value: unknown;
    redactedCount: number;
}
export declare function redactValue(value: unknown): RedactionResult;
export declare function redactSecrets(text: string, patterns?: RedactionPattern[]): string;
export declare function addRedactionPattern(pattern: RedactionPattern): void;
export declare function getRedactionPatterns(): readonly RedactionPattern[];
//# sourceMappingURL=redaction.d.ts.map