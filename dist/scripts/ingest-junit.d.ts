export interface JUnitTestCase {
    name: string;
    classname: string;
    time: number;
    failure?: {
        message: string;
        type: string;
        content: string;
    };
    error?: {
        message: string;
        type: string;
        content: string;
    };
    skipped?: {
        message?: string;
    };
}
export interface JUnitTestSuite {
    name: string;
    tests: number;
    failures: number;
    errors: number;
    skipped: number;
    time: number;
    testcases: JUnitTestCase[];
}
export interface LaminarTestEvent {
    ts: number;
    lvl: string;
    case?: string;
    phase?: string;
    evt: string;
    payload?: any;
}
/**
 * Parse JUnit XML format to structured test data.
 * Uses basic regex parsing to avoid external XML dependencies.
 */
export declare function parseJUnitXML(xmlContent: string): JUnitTestSuite[];
/**
 * Convert JUnit test suites to Laminar format
 */
export declare function convertToLaminar(suites: JUnitTestSuite[]): {
    events: LaminarTestEvent[];
    summary: Array<{
        status: string;
        duration: number;
        location: string;
        artifactURI: string;
        testName: string;
        errorMessage?: string;
    }>;
};
/**
 * Write Laminar output to reports directory
 */
export declare function writeOutput(laminarEvents: LaminarTestEvent[], summary: Array<{
    status: string;
    duration: number;
    location: string;
    artifactURI: string;
    testName: string;
    errorMessage?: string;
}>): void;
/**
 * Main ingest function for JUnit XML
 */
export declare function ingestJUnit(xmlContent: string): void;
//# sourceMappingURL=ingest-junit.d.ts.map