import { DigestOutput, DigestRule } from './generator.js';
import { HistoryEntry } from './fingerprint.js';
export interface Hint {
    tag: string;
    signal: string;
    suggestedCommands: string[];
}
export interface HintContext {
    digest: DigestOutput;
    rules: DigestRule[];
    history?: HistoryEntry[];
}
/**
 * Detects common triage patterns and suggests next actions.
 */
export declare class HintEngine {
    /**
     * Generate hints for a failed test digest.
     */
    generateHints(context: HintContext): Hint[];
    /**
     * Format hints as markdown for human consumption.
     */
    formatMarkdown(hints: Hint[]): string;
    /**
     * Detects when expected domain events are absent from the digest window.
     */
    private detectMissingInclude;
    /**
     * Detects when a rule expects to redact patterns but redactedFields is 0.
     */
    private detectRedactionMismatch;
    /**
     * Detects when budget/window likely clipped interesting events.
     */
    private detectBudgetClipped;
    /**
     * Marks test as new or regressed using history ledger.
     */
    private detectTrend;
}
//# sourceMappingURL=hints.d.ts.map