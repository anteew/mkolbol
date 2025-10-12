import * as fs from 'node:fs';
import * as path from 'node:path';
export class LaminarMcpServer {
    reportsDir;
    summaryFile;
    constructor(config = {}) {
        this.reportsDir = config.reportsDir || 'reports';
        this.summaryFile = config.summaryFile || path.join(this.reportsDir, 'summary.jsonl');
    }
    listResources() {
        const resources = [];
        if (fs.existsSync(this.summaryFile)) {
            resources.push({
                uri: `laminar://summary`,
                name: 'Test Summary',
                description: 'JSONL file containing summary of all test cases',
                mimeType: 'application/x-ndjson',
            });
        }
        const digestFiles = this.findDigestFiles();
        for (const digestFile of digestFiles) {
            const caseName = path.basename(digestFile, '.digest.json');
            resources.push({
                uri: `laminar://digest/${caseName}`,
                name: `Digest: ${caseName}`,
                description: `Digest for failed test case: ${caseName}`,
                mimeType: 'application/json',
            });
        }
        return resources;
    }
    listTools() {
        return [
            {
                name: 'query_logs',
                description: 'Query test event logs with filters',
                inputSchema: {
                    type: 'object',
                    properties: {
                        caseName: {
                            type: 'string',
                            description: 'Filter by test case name',
                        },
                        level: {
                            type: 'string',
                            description: 'Filter by log level (error, warn, info, debug)',
                        },
                        event: {
                            type: 'string',
                            description: 'Filter by event type',
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of events to return',
                            default: 100,
                        },
                    },
                },
            },
            {
                name: 'get_digest',
                description: 'Get digest for a specific failed test case',
                inputSchema: {
                    type: 'object',
                    properties: {
                        caseName: {
                            type: 'string',
                            description: 'Name of the test case',
                        },
                    },
                    required: ['caseName'],
                },
            },
            {
                name: 'list_failures',
                description: 'List all failed test cases from summary',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ];
    }
    async readResource(uri) {
        if (uri === 'laminar://summary') {
            return this.readSummary();
        }
        const digestMatch = uri.match(/^laminar:\/\/digest\/(.+)$/);
        if (digestMatch) {
            const caseName = digestMatch[1];
            return this.readDigest(caseName);
        }
        return null;
    }
    async callTool(name, args) {
        switch (name) {
            case 'query_logs':
                return this.queryLogs(args);
            case 'get_digest':
                return this.getDigest(args.caseName);
            case 'list_failures':
                return this.listFailures();
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    readSummary() {
        if (!fs.existsSync(this.summaryFile)) {
            return null;
        }
        return fs.readFileSync(this.summaryFile, 'utf-8');
    }
    readDigest(caseName) {
        const digestPath = this.findDigestPath(caseName);
        if (!digestPath || !fs.existsSync(digestPath)) {
            return null;
        }
        return fs.readFileSync(digestPath, 'utf-8');
    }
    findDigestPath(caseName) {
        const patterns = [
            path.join(this.reportsDir, `${caseName}.digest.json`),
            path.join(this.reportsDir, '**', `${caseName}.digest.json`),
        ];
        for (const pattern of patterns) {
            if (fs.existsSync(pattern)) {
                return pattern;
            }
        }
        const digestFiles = this.findDigestFiles();
        return digestFiles.find(f => f.includes(caseName)) || null;
    }
    findDigestFiles() {
        const results = [];
        if (!fs.existsSync(this.reportsDir)) {
            return results;
        }
        const scanDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanDir(fullPath);
                }
                else if (entry.name.endsWith('.digest.json')) {
                    results.push(fullPath);
                }
            }
        };
        scanDir(this.reportsDir);
        return results;
    }
    async queryLogs(params) {
        const { caseName, level, event, limit = 100 } = params;
        const events = [];
        if (!caseName) {
            return { events: [], totalCount: 0 };
        }
        const logPath = this.findLogPath(caseName);
        if (!logPath || !fs.existsSync(logPath)) {
            return { events: [], totalCount: 0 };
        }
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                const evt = JSON.parse(line);
                if (level && evt.lvl !== level)
                    continue;
                if (event && evt.evt !== event)
                    continue;
                events.push(evt);
                if (events.length >= limit)
                    break;
            }
            catch (e) {
                continue;
            }
        }
        return {
            events,
            totalCount: events.length,
        };
    }
    findLogPath(caseName) {
        const patterns = [
            path.join(this.reportsDir, `${caseName}.jsonl`),
            path.join(this.reportsDir, '**', `${caseName}.jsonl`),
        ];
        for (const pattern of patterns) {
            if (fs.existsSync(pattern)) {
                return pattern;
            }
        }
        if (!fs.existsSync(this.reportsDir)) {
            return null;
        }
        const findInDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const found = findInDir(fullPath);
                    if (found)
                        return found;
                }
                else if (entry.name === `${caseName}.jsonl`) {
                    return fullPath;
                }
            }
            return null;
        };
        return findInDir(this.reportsDir);
    }
    async getDigest(caseName) {
        const digestPath = this.findDigestPath(caseName);
        if (!digestPath || !fs.existsSync(digestPath)) {
            return null;
        }
        const content = fs.readFileSync(digestPath, 'utf-8');
        return JSON.parse(content);
    }
    async listFailures() {
        if (!fs.existsSync(this.summaryFile)) {
            return [];
        }
        const content = fs.readFileSync(this.summaryFile, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const failures = [];
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                if (entry.status === 'fail') {
                    failures.push(entry);
                }
            }
            catch (e) {
                continue;
            }
        }
        return failures;
    }
    async start() {
        console.log('Laminar MCP Server started');
        console.log(`Reports directory: ${this.reportsDir}`);
        console.log(`Summary file: ${this.summaryFile}`);
        console.log('');
        console.log('Available resources:', this.listResources().length);
        console.log('Available tools:', this.listTools().length);
    }
}
export async function createLaminarServer(config) {
    const server = new LaminarMcpServer(config);
    await server.start();
    return server;
}
//# sourceMappingURL=server.js.map