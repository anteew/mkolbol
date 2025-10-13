import { CodeFrame } from './codeframe.js';
import { Hint } from './hints.js';
export interface DigestConfig {
    budget?: {
        kb?: number;
        lines?: number;
    };
    rules?: DigestRule[];
    enabled?: boolean;
    redaction?: {
        enabled?: boolean;
        secrets?: boolean;
        optOut?: boolean;
    };
}
export interface DigestRule {
    match: {
        evt?: string | string[];
        lvl?: string | string[];
        phase?: string | string[];
        case?: string | string[];
        path?: string | string[];
    };
    actions: DigestAction[];
    priority?: number;
}
export interface DigestAction {
    type: 'include' | 'slice' | 'redact' | 'codeframe';
    window?: number;
    field?: string | string[];
    contextLines?: number;
}
export interface DigestEvent {
    ts: number;
    lvl: string;
    case: string;
    phase?: string;
    evt: string;
    id?: string;
    corr?: string;
    path?: string;
    payload?: unknown;
}
export interface SuspectEvent extends DigestEvent {
    score: number;
    reasons: string[];
}
export interface DigestOutput {
    case: string;
    status: 'fail';
    duration: number;
    location: string;
    error?: string;
    summary: {
        totalEvents: number;
        includedEvents: number;
        redactedFields: number;
        budgetUsed: number;
        budgetLimit: number;
    };
    suspects?: SuspectEvent[];
    codeframes?: CodeFrame[];
    hints?: Hint[];
    events: DigestEvent[];
}
export declare class DigestGenerator {
    private config;
    private overlayRules;
    private codeframeExtractor;
    private hintEngine;
    constructor(config?: DigestConfig);
    setOverlayRules(rules: DigestRule[]): void;
    clearOverlayRules(): void;
    getOverlayRules(): DigestRule[];
    static loadConfig(configPath?: string): DigestConfig;
    generateDigest(caseName: string, status: 'pass' | 'fail' | 'skip', duration: number, location: string, artifactURI: string, error?: string): Promise<DigestOutput | null>;
    private loadEvents;
    private applyRules;
    private applySecretRedactions;
    private matchEvent;
    private matchPattern;
    private enforceBudget;
    private extractCodeFrames;
    private identifySuspects;
    private calculateSuspectScore;
    writeDigest(digest: DigestOutput, outputDir?: string): Promise<void>;
    private formatMarkdown;
}
export declare function generateAllDigests(configPath?: string): Promise<number>;
export declare function generateDigestsForCases(cases: string[], configPath?: string): Promise<number>;
//# sourceMappingURL=generator.d.ts.map