export interface GoTestEvent {
    Time?: string;
    Action?: string;
    Package?: string;
    Test?: string;
    Output?: string;
    Elapsed?: number;
}
export interface LaminarTestEvent {
    ts: number;
    lvl: string;
    case?: string;
    phase?: string;
    evt: string;
    payload?: any;
}
export declare function parseGoTestJSON(input: string): GoTestEvent[];
export declare function convertToLaminar(events: GoTestEvent[]): {
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
export declare function ingestGoTest(input: string): void;
//# sourceMappingURL=ingest-go.d.ts.map