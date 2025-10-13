export interface PytestStage {
    duration?: number;
    outcome: string;
    crash?: {
        path?: string;
        lineno?: number;
        message?: string;
    };
    traceback?: Array<{
        path?: string;
        lineno?: number;
        message?: string;
    }>;
    stdout?: string;
    stderr?: string;
    longrepr?: string;
}
export interface PytestTest {
    nodeid: string;
    lineno?: number;
    keywords?: string[];
    outcome: string;
    setup?: PytestStage | null;
    call?: PytestStage | null;
    teardown?: PytestStage | null;
    metadata?: any;
}
export interface PytestReport {
    created?: number;
    duration?: number;
    exitcode?: number;
    root?: string;
    environment?: any;
    summary?: {
        collected?: number;
        total?: number;
        passed?: number;
        failed?: number;
        error?: number;
        skipped?: number;
        xfailed?: number;
        xpassed?: number;
        [key: string]: any;
    };
    tests?: PytestTest[];
    warnings?: any[];
}
export interface LaminarTestEvent {
    ts: number;
    lvl: string;
    case?: string;
    phase?: string;
    evt: string;
    payload?: any;
}
export declare function parsePytestJSON(input: string): PytestReport;
export declare function convertToLaminar(report: PytestReport): {
    events: LaminarTestEvent[];
    summary: Array<{
        status: string;
        duration: number;
        location: string;
        artifactURI: string;
    }>;
};
export declare function writeOutput(laminarEvents: LaminarTestEvent[], summary: Array<{
    status: string;
    duration: number;
    location: string;
    artifactURI: string;
}>): void;
export declare function ingestPytestJSON(input: string): void;
//# sourceMappingURL=ingest-pytest.d.ts.map