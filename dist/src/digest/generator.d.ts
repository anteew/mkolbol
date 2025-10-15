import type { DigestConfig, DigestEvent, DigestOutput } from './types.js';
export { DigestConfig, DigestEvent, DigestOutput };
export declare class DigestGenerator {
    private config;
    constructor(config: DigestConfig);
    generateDigest(caseId: string, status: string, duration: number, location: string, artifactPath: string): Promise<DigestOutput | null>;
    private loadEvents;
    private sortRulesByPriority;
    private applyRules;
    private matchesRule;
    private shouldApplyRedaction;
    private redactEvents;
    private generateSummary;
}
//# sourceMappingURL=generator.d.ts.map