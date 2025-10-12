export interface FailureInfo {
    testName: string;
    errorType?: string;
    stackLocation?: string;
    errorMessage?: string;
}
export interface HistoryEntry {
    timestamp: string;
    fingerprint: string;
    testName: string;
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    location: string;
    runMetadata?: {
        seed?: string;
        runId?: string;
        [key: string]: any;
    };
}
export declare function generateFingerprint(failure: FailureInfo): string;
export declare function extractFailureInfo(testName: string, error?: string, payload?: any): FailureInfo;
//# sourceMappingURL=fingerprint.d.ts.map