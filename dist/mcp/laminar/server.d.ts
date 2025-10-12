import { DigestEvent, DigestOutput, DigestConfig, DigestRule, SuspectEvent } from '../../digest/generator.js';
export type Json = null | boolean | number | string | Json[] | {
    [k: string]: Json;
};
export declare enum McpErrorCode {
    INVALID_INPUT = "INVALID_INPUT",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    TOOL_NOT_FOUND = "TOOL_NOT_FOUND",
    IO_ERROR = "IO_ERROR",
    PARSE_ERROR = "PARSE_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
export declare class McpError extends Error {
    code: McpErrorCode;
    details?: Record<string, unknown> | undefined;
    constructor(code: McpErrorCode, message: string, details?: Record<string, unknown> | undefined);
    toJson(): Json;
}
export interface JsonSchema {
    type: string;
    properties?: Record<string, JsonSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
}
export interface JsonSchemaProperty {
    type: string;
    description?: string;
    default?: unknown;
    enum?: string[];
    minimum?: number;
    maximum?: number;
}
export interface McpResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}
export interface McpTool {
    name: string;
    description: string;
    inputSchema: JsonSchema;
}
export interface QueryLogsInput {
    caseName?: string;
    level?: string;
    event?: string;
    limit?: number;
}
export interface QueryLogsOutput {
    events: DigestEvent[];
    totalCount: number;
}
export interface GetDigestInput {
    caseName: string;
}
export interface GetDigestOutput {
    digest: DigestOutput | null;
}
export interface ListFailuresInput {
}
export interface ListFailuresOutput {
    failures: SummaryEntry[];
}
export interface RunInput {
    suite?: string;
    case?: string;
    flakeDetect?: boolean;
    flakeRuns?: number;
}
export interface RunOutput {
    exitCode: number;
    message: string;
}
export interface RulesGetInput {
}
export interface RulesGetOutput {
    config: DigestConfig;
}
export interface RulesSetInput {
    config: DigestConfig;
}
export interface RulesSetOutput {
    success: boolean;
    message: string;
}
export interface DigestGenerateInput {
    cases?: string[];
}
export interface DigestGenerateOutput {
    count: number;
    message: string;
}
export interface FocusOverlaySetInput {
    rules: DigestRule[];
}
export interface FocusOverlaySetOutput {
    success: boolean;
    message: string;
}
export interface FocusOverlayClearInput {
}
export interface FocusOverlayClearOutput {
    success: boolean;
    message: string;
}
export interface FocusOverlayGetInput {
}
export interface FocusOverlayGetOutput {
    rules: DigestRule[];
}
export interface LogsCaseGetInput {
    caseName: string;
}
export interface LogsCaseGetOutput {
    logs: string;
}
export interface DiffGetInput {
    digest1Path: string;
    digest2Path: string;
    outputFormat?: 'json' | 'markdown';
}
export interface DiffGetOutput {
    diff: {
        addedEvents: DigestEvent[];
        removedEvents: DigestEvent[];
        changedSuspects: {
            added: SuspectEvent[];
            removed: SuspectEvent[];
        };
        summary: {
            totalAddedEvents: number;
            totalRemovedEvents: number;
            totalChangedSuspects: number;
        };
    };
    formatted?: string;
}
export interface ReproBundleInput {
    caseName?: string;
    format?: 'json' | 'markdown';
}
export interface ReproBundleOutput {
    bundlePath?: string;
    bundlePaths?: string[];
    summary: string;
}
export interface ReproInput {
    caseName?: string;
}
export interface ReproOutput {
    commands: ReproCommand[];
}
export interface ReproCommand {
    testName: string;
    testFile: string;
    vitestCommand: string;
    logCommand: string;
}
export interface McpServerConfig {
    reportsDir?: string;
    summaryFile?: string;
    configFile?: string;
}
export interface SummaryEntry {
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    location: string;
    artifactURI: string;
    error?: string;
    testName?: string;
}
export declare class LaminarMcpServer {
    private reportsDir;
    private summaryFile;
    private configFile;
    private digestGenerator;
    /**
     * Creates a new Laminar MCP server instance.
     *
     * @param config - Server configuration options
     */
    constructor(config?: McpServerConfig);
    private getDigestGenerator;
    private validateQueryLogsInput;
    private validateGetDigestInput;
    private validateListFailuresInput;
    private validateDiffGetInput;
    private validateReproBundleInput;
    /**
     * Lists all available MCP resources (test summaries and digests).
     *
     * @returns Array of MCP resource descriptors
     */
    listResources(): McpResource[];
    /**
     * Lists all available MCP tools with their schemas.
     * Each tool defines name, description, and JSON schema for input validation.
     *
     * @returns Array of MCP tool definitions
     * @example
     * const tools = server.listTools();
     * console.log(tools.map(t => t.name)); // ['run', 'query', 'get_digest', ...]
     */
    listTools(): McpTool[];
    readResource(uri: string): Promise<string | null>;
    callTool(name: string, args: Json): Promise<Json>;
    private run;
    private rulesGet;
    private rulesSet;
    private digestGenerate;
    private logsCaseGet;
    private repro;
    private extractTestName;
    private readSummary;
    private readDigest;
    private findDigestPath;
    private findDigestFiles;
    private queryLogs;
    private findLogPath;
    private getDigest;
    private listFailures;
    private focusOverlaySet;
    private focusOverlayClear;
    private focusOverlayGet;
    private diffGet;
    private formatDiffAsMarkdown;
    private reproBundle;
    /**
     * Starts the MCP server and displays available resources and tools.
     */
    start(): Promise<void>;
}
export declare function createLaminarServer(config?: McpServerConfig): Promise<LaminarMcpServer>;
//# sourceMappingURL=server.d.ts.map