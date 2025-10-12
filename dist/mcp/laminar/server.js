import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DigestGenerator } from '../../digest/generator.js';
export var McpErrorCode;
(function (McpErrorCode) {
    McpErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    McpErrorCode["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    McpErrorCode["TOOL_NOT_FOUND"] = "TOOL_NOT_FOUND";
    McpErrorCode["IO_ERROR"] = "IO_ERROR";
    McpErrorCode["PARSE_ERROR"] = "PARSE_ERROR";
    McpErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(McpErrorCode || (McpErrorCode = {}));
export class McpError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'McpError';
    }
    toJson() {
        return {
            error: {
                code: this.code,
                message: this.message,
                details: (this.details || null),
            },
        };
    }
}
export class LaminarMcpServer {
    reportsDir;
    summaryFile;
    configFile;
    digestGenerator = null;
    constructor(config = {}) {
        this.reportsDir = config.reportsDir || 'reports';
        this.summaryFile = config.summaryFile || path.join(this.reportsDir, 'summary.jsonl');
        this.configFile = config.configFile || 'laminar.config.json';
    }
    getDigestGenerator() {
        if (!this.digestGenerator) {
            const config = DigestGenerator.loadConfig(this.configFile);
            this.digestGenerator = new DigestGenerator(config);
        }
        return this.digestGenerator;
    }
    // ============================================================================
    // Input Validation
    // ============================================================================
    validateQueryLogsInput(input) {
        if (typeof input !== 'object' || input === null) {
            throw new McpError(McpErrorCode.INVALID_INPUT, 'Input must be an object', { received: typeof input });
        }
        const params = input;
        if (params.caseName !== undefined && typeof params.caseName !== 'string') {
            throw new McpError(McpErrorCode.INVALID_INPUT, 'caseName must be a string', { received: typeof params.caseName });
        }
        if (params.level !== undefined && typeof params.level !== 'string') {
            throw new McpError(McpErrorCode.INVALID_INPUT, 'level must be a string', { received: typeof params.level });
        }
        if (params.event !== undefined && typeof params.event !== 'string') {
            throw new McpError(McpErrorCode.INVALID_INPUT, 'event must be a string', { received: typeof params.event });
        }
        if (params.limit !== undefined) {
            if (typeof params.limit !== 'number') {
                throw new McpError(McpErrorCode.INVALID_INPUT, 'limit must be a number', { received: typeof params.limit });
            }
            if (params.limit < 1 || params.limit > 1000) {
                throw new McpError(McpErrorCode.INVALID_INPUT, 'limit must be between 1 and 1000', { received: params.limit });
            }
        }
        return {
            caseName: params.caseName,
            level: params.level,
            event: params.event,
            limit: params.limit,
        };
    }
    validateGetDigestInput(input) {
        if (typeof input !== 'object' || input === null) {
            throw new McpError(McpErrorCode.INVALID_INPUT, 'Input must be an object', { received: typeof input });
        }
        const params = input;
        if (!params.caseName || typeof params.caseName !== 'string') {
            throw new McpError(McpErrorCode.INVALID_INPUT, 'caseName is required and must be a string', { received: params.caseName });
        }
        if (params.caseName.trim() === '') {
            throw new McpError(McpErrorCode.INVALID_INPUT, 'caseName cannot be empty', { received: params.caseName });
        }
        return {
            caseName: params.caseName,
        };
    }
    validateListFailuresInput(input) {
        if (typeof input !== 'object' || input === null) {
            throw new McpError(McpErrorCode.INVALID_INPUT, 'Input must be an object', { received: typeof input });
        }
        return {};
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
                name: 'run',
                description: 'Execute tests with options for suite, case, and flake detection',
                inputSchema: {
                    type: 'object',
                    properties: {
                        suite: {
                            type: 'string',
                            description: 'Test suite/file to run (optional)',
                        },
                        case: {
                            type: 'string',
                            description: 'Specific test case name to run (optional)',
                        },
                        flakeDetect: {
                            type: 'boolean',
                            description: 'Enable flake detection mode (default: false)',
                            default: false,
                        },
                        flakeRuns: {
                            type: 'number',
                            description: 'Number of runs for flake detection (default: 5)',
                            default: 5,
                        },
                    },
                },
            },
            {
                name: 'rules.get',
                description: 'Get current digest rules from laminar.config.json',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'rules.set',
                description: 'Update digest rules in laminar.config.json',
                inputSchema: {
                    type: 'object',
                    properties: {
                        config: {
                            type: 'object',
                            description: 'Digest configuration object',
                        },
                    },
                    required: ['config'],
                },
            },
            {
                name: 'digest.generate',
                description: 'Generate digests for specific cases or all failing cases',
                inputSchema: {
                    type: 'object',
                    properties: {
                        cases: {
                            type: 'array',
                            description: 'Array of case names to generate digests for (optional, all failures if omitted)',
                        },
                    },
                },
            },
            {
                name: 'logs.case.get',
                description: 'Retrieve per-case JSONL logs',
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
                name: 'query',
                description: 'Query logs with filters (alias for query_logs)',
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
                name: 'repro',
                description: 'Get reproduction commands for failures',
                inputSchema: {
                    type: 'object',
                    properties: {
                        caseName: {
                            type: 'string',
                            description: 'Specific case name to get repro command for (optional)',
                        },
                    },
                },
            },
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
            {
                name: 'focus.overlay.set',
                description: 'Set ephemeral focus overlay rules (non-persistent)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        rules: {
                            type: 'array',
                            description: 'Array of digest rules for the overlay',
                        },
                    },
                    required: ['rules'],
                },
            },
            {
                name: 'focus.overlay.clear',
                description: 'Clear all ephemeral focus overlay rules',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'focus.overlay.get',
                description: 'Get current ephemeral focus overlay rules',
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
        try {
            switch (name) {
                case 'run':
                    return (await this.run(args));
                case 'rules.get':
                    return (await this.rulesGet(args));
                case 'rules.set':
                    return (await this.rulesSet(args));
                case 'digest.generate':
                    return (await this.digestGenerate(args));
                case 'logs.case.get':
                    return (await this.logsCaseGet(args));
                case 'query':
                case 'query_logs': {
                    const input = this.validateQueryLogsInput(args);
                    const result = await this.queryLogs(input);
                    return result;
                }
                case 'repro':
                    return (await this.repro(args));
                case 'get_digest': {
                    const input = this.validateGetDigestInput(args);
                    const result = await this.getDigest(input.caseName);
                    return { digest: result };
                }
                case 'list_failures': {
                    this.validateListFailuresInput(args);
                    const result = await this.listFailures();
                    return { failures: result };
                }
                case 'focus.overlay.set':
                    return (await this.focusOverlaySet(args));
                case 'focus.overlay.clear':
                    return (await this.focusOverlayClear(args));
                case 'focus.overlay.get':
                    return (await this.focusOverlayGet(args));
                default:
                    throw new McpError(McpErrorCode.TOOL_NOT_FOUND, `Unknown tool: ${name}`, { tool: name });
            }
        }
        catch (error) {
            if (error instanceof McpError) {
                throw error;
            }
            throw new McpError(McpErrorCode.INTERNAL_ERROR, `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`, { tool: name });
        }
    }
    async run(params) {
        const { suite, case: caseName, flakeDetect = false, flakeRuns = 5 } = params;
        const args = ['run', 'lam', '--'];
        if (flakeDetect) {
            args.push('run', '--lane', 'ci', '--flake-detect', flakeRuns.toString());
        }
        else {
            args.push('run', '--lane', 'auto');
            if (suite) {
                args.push('--filter', suite);
            }
            else if (caseName) {
                args.push('--filter', caseName);
            }
        }
        const result = spawnSync('npm', args, {
            stdio: 'pipe',
            encoding: 'utf-8',
        });
        return {
            exitCode: result.status || 0,
            message: result.status === 0 ? 'Tests completed successfully' : 'Tests failed',
        };
    }
    async rulesGet(params) {
        if (fs.existsSync(this.configFile)) {
            const content = fs.readFileSync(this.configFile, 'utf-8');
            const config = JSON.parse(content);
            return { config };
        }
        return { config: {} };
    }
    async rulesSet(params) {
        try {
            const content = JSON.stringify(params.config, null, 2);
            fs.writeFileSync(this.configFile, content);
            return {
                success: true,
                message: `Updated ${this.configFile}`,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update config',
            };
        }
    }
    async digestGenerate(params) {
        try {
            const generator = this.getDigestGenerator();
            let count = 0;
            if (!fs.existsSync(this.summaryFile)) {
                return {
                    count: 0,
                    message: 'No summary.jsonl found',
                };
            }
            const content = fs.readFileSync(this.summaryFile, 'utf-8');
            const lines = content.trim().split('\n').filter(Boolean);
            const casesToProcess = params.cases && params.cases.length > 0
                ? new Set(params.cases)
                : null;
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    const caseName = entry.artifactURI ? path.basename(entry.artifactURI, '.jsonl') : '';
                    if (casesToProcess && !casesToProcess.has(caseName)) {
                        continue;
                    }
                    if (entry.status === 'fail' && entry.artifactURI) {
                        const digest = await generator.generateDigest(caseName, entry.status, entry.duration, entry.location, entry.artifactURI, entry.error);
                        if (digest) {
                            const outputDir = path.dirname(entry.artifactURI);
                            await generator.writeDigest(digest, outputDir);
                            count++;
                        }
                    }
                }
                catch (e) {
                    continue;
                }
            }
            return {
                count,
                message: count === 0 ? 'No failing test cases found' : `Generated ${count} digest(s)`,
            };
        }
        catch (error) {
            return {
                count: 0,
                message: error instanceof Error ? error.message : 'Failed to generate digests',
            };
        }
    }
    async logsCaseGet(params) {
        const logPath = this.findLogPath(params.caseName);
        if (!logPath || !fs.existsSync(logPath)) {
            return { logs: '' };
        }
        const logs = fs.readFileSync(logPath, 'utf-8');
        return { logs };
    }
    async repro(params) {
        if (!fs.existsSync(this.summaryFile)) {
            return { commands: [] };
        }
        const content = fs.readFileSync(this.summaryFile, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const entries = lines.map(line => JSON.parse(line));
        let failures = entries.filter(entry => entry.status === 'fail');
        if (params.caseName) {
            failures = failures.filter(f => {
                const caseName = f.artifactURI ? path.basename(f.artifactURI, '.jsonl') : '';
                return caseName === params.caseName;
            });
        }
        const commands = failures.map(failure => {
            const testFile = failure.location.split(':')[0];
            const testName = this.extractTestName(failure.artifactURI);
            const artifactPath = failure.artifactURI;
            return {
                testName,
                testFile,
                vitestCommand: `vitest run --reporter=verbose --pool=threads "${testFile}" -t "${testName}"`,
                logCommand: `npm run logq -- ${artifactPath}`,
            };
        });
        return { commands };
    }
    extractTestName(artifactURI) {
        const parts = artifactURI.split('/');
        const filename = parts[parts.length - 1];
        return filename.replace('.jsonl', '').replace(/_/g, ' ');
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
    async focusOverlaySet(params) {
        try {
            const generator = this.getDigestGenerator();
            generator.setOverlayRules(params.rules);
            return {
                success: true,
                message: `Set ${params.rules.length} overlay rule(s)`,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to set overlay rules',
            };
        }
    }
    async focusOverlayClear(params) {
        try {
            const generator = this.getDigestGenerator();
            generator.clearOverlayRules();
            return {
                success: true,
                message: 'Cleared overlay rules',
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to clear overlay rules',
            };
        }
    }
    async focusOverlayGet(params) {
        const generator = this.getDigestGenerator();
        const rules = generator.getOverlayRules();
        return { rules };
    }
    async start() {
        console.log('Laminar MCP Server started');
        console.log(`Reports directory: ${this.reportsDir}`);
        console.log(`Summary file: ${this.summaryFile}`);
        console.log(`Config file: ${this.configFile}`);
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