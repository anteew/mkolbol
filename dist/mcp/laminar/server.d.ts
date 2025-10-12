import { DigestEvent } from '../../digest/generator.js';
export type Json = null | boolean | number | string | Json[] | {
    [k: string]: Json;
};
export interface McpResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
}
export interface McpTool {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}
export interface McpServerConfig {
    reportsDir?: string;
    summaryFile?: string;
}
export interface SummaryEntry {
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    location: string;
    artifactURI: string;
    error?: string;
}
export interface QueryLogsParams {
    caseName?: string;
    level?: string;
    event?: string;
    limit?: number;
}
export interface QueryLogsResult {
    events: DigestEvent[];
    totalCount: number;
}
export declare class LaminarMcpServer {
    private reportsDir;
    private summaryFile;
    constructor(config?: McpServerConfig);
    listResources(): McpResource[];
    listTools(): McpTool[];
    readResource(uri: string): Promise<string | null>;
    callTool(name: string, args: Json): Promise<Json>;
    private readSummary;
    private readDigest;
    private findDigestPath;
    private findDigestFiles;
    private queryLogs;
    private findLogPath;
    private getDigest;
    private listFailures;
    start(): Promise<void>;
}
export declare function createLaminarServer(config?: McpServerConfig): Promise<LaminarMcpServer>;
//# sourceMappingURL=server.d.ts.map