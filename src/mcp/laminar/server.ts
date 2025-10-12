import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DigestEvent, DigestOutput, DigestConfig, DigestGenerator, DigestRule, SuspectEvent, generateAllDigests, generateDigestsForCases } from '../../digest/generator.js';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export enum McpErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  IO_ERROR = 'IO_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class McpError extends Error {
  constructor(
    public code: McpErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'McpError';
  }

  toJson(): Json {
    return {
      error: {
        code: this.code as string,
        message: this.message,
        details: (this.details || null) as Json,
      },
    } as Json;
  }
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
  // No input parameters
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
  // No input parameters
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
  // No input parameters
}

export interface FocusOverlayClearOutput {
  success: boolean;
  message: string;
}

export interface FocusOverlayGetInput {
  // No input parameters
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

export class LaminarMcpServer {
  private reportsDir: string;
  private summaryFile: string;
  private configFile: string;
  private digestGenerator: DigestGenerator | null = null;

  constructor(config: McpServerConfig = {}) {
    this.reportsDir = config.reportsDir || 'reports';
    this.summaryFile = config.summaryFile || path.join(this.reportsDir, 'summary.jsonl');
    this.configFile = config.configFile || 'laminar.config.json';
  }

  private getDigestGenerator(): DigestGenerator {
    if (!this.digestGenerator) {
      const config = DigestGenerator.loadConfig(this.configFile);
      this.digestGenerator = new DigestGenerator(config);
    }
    return this.digestGenerator;
  }

  // ============================================================================
  // Input Validation
  // ============================================================================

  private validateQueryLogsInput(input: unknown): QueryLogsInput {
    if (typeof input !== 'object' || input === null) {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'Input must be an object',
        { received: typeof input }
      );
    }

    const params = input as Record<string, unknown>;

    if (params.caseName !== undefined && typeof params.caseName !== 'string') {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'caseName must be a string',
        { received: typeof params.caseName }
      );
    }

    if (params.level !== undefined && typeof params.level !== 'string') {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'level must be a string',
        { received: typeof params.level }
      );
    }

    if (params.event !== undefined && typeof params.event !== 'string') {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'event must be a string',
        { received: typeof params.event }
      );
    }

    if (params.limit !== undefined) {
      if (typeof params.limit !== 'number') {
        throw new McpError(
          McpErrorCode.INVALID_INPUT,
          'limit must be a number',
          { received: typeof params.limit }
        );
      }
      if (params.limit < 1 || params.limit > 1000) {
        throw new McpError(
          McpErrorCode.INVALID_INPUT,
          'limit must be between 1 and 1000',
          { received: params.limit }
        );
      }
    }

    return {
      caseName: params.caseName as string | undefined,
      level: params.level as string | undefined,
      event: params.event as string | undefined,
      limit: params.limit as number | undefined,
    };
  }

  private validateGetDigestInput(input: unknown): GetDigestInput {
    if (typeof input !== 'object' || input === null) {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'Input must be an object',
        { received: typeof input }
      );
    }

    const params = input as Record<string, unknown>;

    if (!params.caseName || typeof params.caseName !== 'string') {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'caseName is required and must be a string',
        { received: params.caseName }
      );
    }

    if (params.caseName.trim() === '') {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'caseName cannot be empty',
        { received: params.caseName }
      );
    }

    return {
      caseName: params.caseName,
    };
  }

  private validateListFailuresInput(input: unknown): ListFailuresInput {
    if (typeof input !== 'object' || input === null) {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'Input must be an object',
        { received: typeof input }
      );
    }
    return {};
  }

  private validateDiffGetInput(input: unknown): DiffGetInput {
    if (typeof input !== 'object' || input === null) {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'Input must be an object',
        { received: typeof input }
      );
    }

    const params = input as Record<string, unknown>;

    if (!params.digest1Path || typeof params.digest1Path !== 'string') {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'digest1Path is required and must be a string',
        { received: params.digest1Path }
      );
    }

    if (!params.digest2Path || typeof params.digest2Path !== 'string') {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'digest2Path is required and must be a string',
        { received: params.digest2Path }
      );
    }

    if (params.outputFormat !== undefined) {
      if (typeof params.outputFormat !== 'string') {
        throw new McpError(
          McpErrorCode.INVALID_INPUT,
          'outputFormat must be a string',
          { received: typeof params.outputFormat }
        );
      }
      if (params.outputFormat !== 'json' && params.outputFormat !== 'markdown') {
        throw new McpError(
          McpErrorCode.INVALID_INPUT,
          'outputFormat must be either "json" or "markdown"',
          { received: params.outputFormat }
        );
      }
    }

    return {
      digest1Path: params.digest1Path,
      digest2Path: params.digest2Path,
      outputFormat: params.outputFormat as 'json' | 'markdown' | undefined,
    };
  }

  private validateReproBundleInput(input: unknown): ReproBundleInput {
    if (typeof input !== 'object' || input === null) {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'Input must be an object',
        { received: typeof input }
      );
    }

    const params = input as Record<string, unknown>;

    if (params.caseName !== undefined && typeof params.caseName !== 'string') {
      throw new McpError(
        McpErrorCode.INVALID_INPUT,
        'caseName must be a string',
        { received: typeof params.caseName }
      );
    }

    if (params.format !== undefined) {
      if (typeof params.format !== 'string') {
        throw new McpError(
          McpErrorCode.INVALID_INPUT,
          'format must be a string',
          { received: typeof params.format }
        );
      }
      if (params.format !== 'json' && params.format !== 'markdown') {
        throw new McpError(
          McpErrorCode.INVALID_INPUT,
          'format must be either "json" or "markdown"',
          { received: params.format }
        );
      }
    }

    return {
      caseName: params.caseName as string | undefined,
      format: params.format as 'json' | 'markdown' | undefined,
    };
  }

  listResources(): McpResource[] {
    const resources: McpResource[] = [];

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

  listTools(): McpTool[] {
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
      {
        name: 'diff.get',
        description: 'Compare two digest files and return differences',
        inputSchema: {
          type: 'object',
          properties: {
            digest1Path: {
              type: 'string',
              description: 'Path to first digest file',
            },
            digest2Path: {
              type: 'string',
              description: 'Path to second digest file',
            },
            outputFormat: {
              type: 'string',
              description: 'Output format: json or markdown (default: json)',
              enum: ['json', 'markdown'],
              default: 'json',
            },
          },
          required: ['digest1Path', 'digest2Path'],
        },
      },
      {
        name: 'repro.bundle',
        description: 'Generate repro bundle with logs and digests',
        inputSchema: {
          type: 'object',
          properties: {
            caseName: {
              type: 'string',
              description: 'Specific case name to bundle (optional, all failures if omitted)',
            },
            format: {
              type: 'string',
              description: 'Bundle format: json or markdown (default: json)',
              enum: ['json', 'markdown'],
              default: 'json',
            },
          },
        },
      },
    ];
  }

  async readResource(uri: string): Promise<string | null> {
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

  async callTool(name: string, args: Json): Promise<Json> {
    try {
      switch (name) {
        case 'run':
          return (await this.run(args as unknown as RunInput)) as unknown as Json;
        case 'rules.get':
          return (await this.rulesGet(args as unknown as RulesGetInput)) as unknown as Json;
        case 'rules.set':
          return (await this.rulesSet(args as unknown as RulesSetInput)) as unknown as Json;
        case 'digest.generate':
          return (await this.digestGenerate(args as unknown as DigestGenerateInput)) as unknown as Json;
        case 'logs.case.get':
          return (await this.logsCaseGet(args as unknown as LogsCaseGetInput)) as unknown as Json;
        case 'query':
        case 'query_logs': {
          const input = this.validateQueryLogsInput(args);
          const result = await this.queryLogs(input);
          return result as unknown as Json;
        }
        case 'repro':
          return (await this.repro(args as unknown as ReproInput)) as unknown as Json;
        case 'get_digest': {
          const input = this.validateGetDigestInput(args);
          const result = await this.getDigest(input.caseName);
          return { digest: result } as unknown as Json;
        }
        case 'list_failures': {
          this.validateListFailuresInput(args);
          const result = await this.listFailures();
          return { failures: result } as unknown as Json;
        }
        case 'focus.overlay.set':
          return (await this.focusOverlaySet(args as unknown as FocusOverlaySetInput)) as unknown as Json;
        case 'focus.overlay.clear':
          return (await this.focusOverlayClear(args as unknown as FocusOverlayClearInput)) as unknown as Json;
        case 'focus.overlay.get':
          return (await this.focusOverlayGet(args as unknown as FocusOverlayGetInput)) as unknown as Json;
        case 'diff.get': {
          const input = this.validateDiffGetInput(args);
          const result = await this.diffGet(input);
          return result as unknown as Json;
        }
        case 'repro.bundle': {
          const input = this.validateReproBundleInput(args);
          const result = await this.reproBundle(input);
          return result as unknown as Json;
        }
        default:
          throw new McpError(
            McpErrorCode.TOOL_NOT_FOUND,
            `Unknown tool: ${name}`,
            { tool: name }
          );
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        McpErrorCode.INTERNAL_ERROR,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { tool: name }
      );
    }
  }

  private async run(params: RunInput): Promise<RunOutput> {
    const { suite, case: caseName, flakeDetect = false, flakeRuns = 5 } = params;

    const args = ['run', 'lam', '--'];
    
    if (flakeDetect) {
      args.push('run', '--lane', 'ci', '--flake-detect', flakeRuns.toString());
    } else {
      args.push('run', '--lane', 'auto');
      
      if (suite) {
        args.push('--filter', suite);
      } else if (caseName) {
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

  private async rulesGet(params: RulesGetInput): Promise<RulesGetOutput> {
    if (fs.existsSync(this.configFile)) {
      const content = fs.readFileSync(this.configFile, 'utf-8');
      const config = JSON.parse(content) as DigestConfig;
      return { config };
    }
    
    return { config: {} };
  }

  private async rulesSet(params: RulesSetInput): Promise<RulesSetOutput> {
    try {
      const content = JSON.stringify(params.config, null, 2);
      fs.writeFileSync(this.configFile, content);
      return {
        success: true,
        message: `Updated ${this.configFile}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update config',
      };
    }
  }

  private async digestGenerate(params: DigestGenerateInput): Promise<DigestGenerateOutput> {
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
        ? new Set(params.cases as string[])
        : null;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const caseName = entry.artifactURI ? path.basename(entry.artifactURI, '.jsonl') : '';
          
          if (casesToProcess && !casesToProcess.has(caseName)) {
            continue;
          }
          
          if (entry.status === 'fail' && entry.artifactURI) {
            const digest = await generator.generateDigest(
              caseName,
              entry.status,
              entry.duration,
              entry.location,
              entry.artifactURI,
              entry.error
            );

            if (digest) {
              const outputDir = path.dirname(entry.artifactURI);
              await generator.writeDigest(digest, outputDir);
              count++;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      return {
        count,
        message: count === 0 ? 'No failing test cases found' : `Generated ${count} digest(s)`,
      };
    } catch (error) {
      return {
        count: 0,
        message: error instanceof Error ? error.message : 'Failed to generate digests',
      };
    }
  }

  private async logsCaseGet(params: LogsCaseGetInput): Promise<LogsCaseGetOutput> {
    const logPath = this.findLogPath(params.caseName);
    
    if (!logPath || !fs.existsSync(logPath)) {
      return { logs: '' };
    }
    
    const logs = fs.readFileSync(logPath, 'utf-8');
    return { logs };
  }

  private async repro(params: ReproInput): Promise<ReproOutput> {
    if (!fs.existsSync(this.summaryFile)) {
      return { commands: [] };
    }

    const content = fs.readFileSync(this.summaryFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: SummaryEntry[] = lines.map(line => JSON.parse(line));

    let failures = entries.filter(entry => entry.status === 'fail');
    
    if (params.caseName) {
      failures = failures.filter(f => {
        const caseName = f.artifactURI ? path.basename(f.artifactURI, '.jsonl') : '';
        return caseName === params.caseName;
      });
    }

    const commands: ReproCommand[] = failures.map(failure => {
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

  private extractTestName(artifactURI: string): string {
    const parts = artifactURI.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace('.jsonl', '').replace(/_/g, ' ');
  }

  private readSummary(): string | null {
    if (!fs.existsSync(this.summaryFile)) {
      return null;
    }
    return fs.readFileSync(this.summaryFile, 'utf-8');
  }

  private readDigest(caseName: string): string | null {
    const digestPath = this.findDigestPath(caseName);
    if (!digestPath || !fs.existsSync(digestPath)) {
      return null;
    }
    return fs.readFileSync(digestPath, 'utf-8');
  }

  private findDigestPath(caseName: string): string | null {
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

  private findDigestFiles(): string[] {
    const results: string[] = [];
    
    if (!fs.existsSync(this.reportsDir)) {
      return results;
    }

    const scanDir = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith('.digest.json')) {
          results.push(fullPath);
        }
      }
    };

    scanDir(this.reportsDir);
    return results;
  }

  private async queryLogs(params: QueryLogsInput): Promise<QueryLogsOutput> {
    const { caseName, level, event, limit = 100 } = params;
    const events: DigestEvent[] = [];

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
        const evt = JSON.parse(line) as DigestEvent;

        if (level && evt.lvl !== level) continue;
        if (event && evt.evt !== event) continue;

        events.push(evt);
        if (events.length >= limit) break;
      } catch (e) {
        continue;
      }
    }

    return {
      events,
      totalCount: events.length,
    };
  }

  private findLogPath(caseName: string): string | null {
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

    const findInDir = (dir: string): string | null => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findInDir(fullPath);
          if (found) return found;
        } else if (entry.name === `${caseName}.jsonl`) {
          return fullPath;
        }
      }
      return null;
    };

    return findInDir(this.reportsDir);
  }

  private async getDigest(caseName: string): Promise<DigestOutput | null> {
    const digestPath = this.findDigestPath(caseName);
    if (!digestPath || !fs.existsSync(digestPath)) {
      return null;
    }

    const content = fs.readFileSync(digestPath, 'utf-8');
    return JSON.parse(content) as DigestOutput;
  }

  private async listFailures(): Promise<SummaryEntry[]> {
    if (!fs.existsSync(this.summaryFile)) {
      return [];
    }

    const content = fs.readFileSync(this.summaryFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const failures: SummaryEntry[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as SummaryEntry;
        if (entry.status === 'fail') {
          failures.push(entry);
        }
      } catch (e) {
        continue;
      }
    }

    return failures;
  }

  private async focusOverlaySet(params: FocusOverlaySetInput): Promise<FocusOverlaySetOutput> {
    try {
      const generator = this.getDigestGenerator();
      generator.setOverlayRules(params.rules);
      return {
        success: true,
        message: `Set ${params.rules.length} overlay rule(s)`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to set overlay rules',
      };
    }
  }

  private async focusOverlayClear(params: FocusOverlayClearInput): Promise<FocusOverlayClearOutput> {
    try {
      const generator = this.getDigestGenerator();
      generator.clearOverlayRules();
      return {
        success: true,
        message: 'Cleared overlay rules',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to clear overlay rules',
      };
    }
  }

  private async focusOverlayGet(params: FocusOverlayGetInput): Promise<FocusOverlayGetOutput> {
    const generator = this.getDigestGenerator();
    const rules = generator.getOverlayRules();
    return { rules };
  }

  private async diffGet(params: DiffGetInput): Promise<DiffGetOutput> {
    const { digest1Path, digest2Path, outputFormat = 'json' } = params;

    if (!fs.existsSync(digest1Path)) {
      throw new McpError(
        McpErrorCode.RESOURCE_NOT_FOUND,
        `Digest file not found: ${digest1Path}`,
        { path: digest1Path }
      );
    }

    if (!fs.existsSync(digest2Path)) {
      throw new McpError(
        McpErrorCode.RESOURCE_NOT_FOUND,
        `Digest file not found: ${digest2Path}`,
        { path: digest2Path }
      );
    }

    try {
      const digest1Content = fs.readFileSync(digest1Path, 'utf-8');
      const digest2Content = fs.readFileSync(digest2Path, 'utf-8');

      const digest1 = JSON.parse(digest1Content) as DigestOutput;
      const digest2 = JSON.parse(digest2Content) as DigestOutput;

      const eventMap1 = new Map(digest1.events.map(e => [e.id || `${e.ts}-${e.evt}`, e]));
      const eventMap2 = new Map(digest2.events.map(e => [e.id || `${e.ts}-${e.evt}`, e]));

      const addedEvents: DigestEvent[] = [];
      const removedEvents: DigestEvent[] = [];

      for (const [id, event] of eventMap2) {
        if (!eventMap1.has(id)) {
          addedEvents.push(event);
        }
      }

      for (const [id, event] of eventMap1) {
        if (!eventMap2.has(id)) {
          removedEvents.push(event);
        }
      }

      const suspectMap1 = new Map((digest1.suspects || []).map(s => [s.id || `${s.ts}-${s.evt}`, s]));
      const suspectMap2 = new Map((digest2.suspects || []).map(s => [s.id || `${s.ts}-${s.evt}`, s]));

      const addedSuspects: SuspectEvent[] = [];
      const removedSuspects: SuspectEvent[] = [];

      for (const [id, suspect] of suspectMap2) {
        if (!suspectMap1.has(id)) {
          addedSuspects.push(suspect);
        }
      }

      for (const [id, suspect] of suspectMap1) {
        if (!suspectMap2.has(id)) {
          removedSuspects.push(suspect);
        }
      }

      const diff = {
        addedEvents,
        removedEvents,
        changedSuspects: {
          added: addedSuspects,
          removed: removedSuspects,
        },
        summary: {
          totalAddedEvents: addedEvents.length,
          totalRemovedEvents: removedEvents.length,
          totalChangedSuspects: addedSuspects.length + removedSuspects.length,
        },
      };

      if (outputFormat === 'markdown') {
        const formatted = this.formatDiffAsMarkdown(diff, digest1, digest2);
        return { diff, formatted };
      }

      return { diff };
    } catch (error) {
      throw new McpError(
        McpErrorCode.PARSE_ERROR,
        `Failed to parse digest files: ${error instanceof Error ? error.message : String(error)}`,
        { digest1Path, digest2Path }
      );
    }
  }

  private formatDiffAsMarkdown(
    diff: DiffGetOutput['diff'],
    digest1: DigestOutput,
    digest2: DigestOutput
  ): string {
    const lines: string[] = [];
    lines.push('# Digest Diff Report\n');
    lines.push(`**Digest 1:** ${digest1.case}`);
    lines.push(`**Digest 2:** ${digest2.case}\n`);
    lines.push('## Summary\n');
    lines.push(`- Added Events: ${diff.summary.totalAddedEvents}`);
    lines.push(`- Removed Events: ${diff.summary.totalRemovedEvents}`);
    lines.push(`- Changed Suspects: ${diff.summary.totalChangedSuspects}\n`);

    if (diff.addedEvents.length > 0) {
      lines.push('## Added Events\n');
      for (const event of diff.addedEvents) {
        lines.push(`- [${event.lvl}] ${event.evt} (ts: ${event.ts})`);
      }
      lines.push('');
    }

    if (diff.removedEvents.length > 0) {
      lines.push('## Removed Events\n');
      for (const event of diff.removedEvents) {
        lines.push(`- [${event.lvl}] ${event.evt} (ts: ${event.ts})`);
      }
      lines.push('');
    }

    if (diff.changedSuspects.added.length > 0) {
      lines.push('## Added Suspects\n');
      for (const suspect of diff.changedSuspects.added) {
        lines.push(`- [${suspect.lvl}] ${suspect.evt} (score: ${suspect.score})`);
        lines.push(`  Reasons: ${suspect.reasons.join(', ')}`);
      }
      lines.push('');
    }

    if (diff.changedSuspects.removed.length > 0) {
      lines.push('## Removed Suspects\n');
      for (const suspect of diff.changedSuspects.removed) {
        lines.push(`- [${suspect.lvl}] ${suspect.evt} (score: ${suspect.score})`);
        lines.push(`  Reasons: ${suspect.reasons.join(', ')}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private async reproBundle(params: ReproBundleInput): Promise<ReproBundleOutput> {
    const { caseName, format = 'json' } = params;

    if (!fs.existsSync(this.summaryFile)) {
      return {
        summary: 'No summary.jsonl found',
      };
    }

    const content = fs.readFileSync(this.summaryFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: SummaryEntry[] = lines.map(line => JSON.parse(line));

    let failures = entries.filter(entry => entry.status === 'fail');
    
    if (caseName) {
      failures = failures.filter(f => {
        const failCaseName = f.artifactURI ? path.basename(f.artifactURI, '.jsonl') : '';
        return failCaseName === caseName;
      });
    }

    if (failures.length === 0) {
      return {
        summary: caseName 
          ? `No failures found for case: ${caseName}`
          : 'No failures found',
      };
    }

    const bundleDir = path.join(this.reportsDir, 'bundles', Date.now().toString());
    fs.mkdirSync(bundleDir, { recursive: true });

    const bundlePaths: string[] = [];

    for (const failure of failures) {
      const failCaseName = failure.artifactURI ? path.basename(failure.artifactURI, '.jsonl') : '';
      const caseDir = path.join(bundleDir, failCaseName);
      fs.mkdirSync(caseDir, { recursive: true });

      const logPath = this.findLogPath(failCaseName);
      if (logPath && fs.existsSync(logPath)) {
        const logDest = path.join(caseDir, `${failCaseName}.jsonl`);
        fs.copyFileSync(logPath, logDest);
      }

      const digestPath = this.findDigestPath(failCaseName);
      if (digestPath && fs.existsSync(digestPath)) {
        const digestDest = path.join(caseDir, `${failCaseName}.digest.json`);
        fs.copyFileSync(digestPath, digestDest);
      }

      const metaPath = path.join(caseDir, 'meta.json');
      fs.writeFileSync(
        metaPath,
        JSON.stringify(
          {
            caseName: failCaseName,
            status: failure.status,
            duration: failure.duration,
            location: failure.location,
            error: failure.error,
            testName: failure.testName,
          },
          null,
          2
        )
      );

      bundlePaths.push(caseDir);
    }

    const manifestPath = path.join(bundleDir, 'manifest.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          generated: new Date().toISOString(),
          caseName,
          totalCases: failures.length,
          cases: failures.map(f => ({
            caseName: f.artifactURI ? path.basename(f.artifactURI, '.jsonl') : '',
            status: f.status,
            duration: f.duration,
            location: f.location,
          })),
        },
        null,
        2
      )
    );

    if (format === 'markdown') {
      const readmePath = path.join(bundleDir, 'README.md');
      const readmeLines: string[] = [];
      readmeLines.push('# Repro Bundle\n');
      readmeLines.push(`Generated: ${new Date().toISOString()}\n`);
      readmeLines.push(`Total Cases: ${failures.length}\n`);
      readmeLines.push('## Cases\n');
      for (const failure of failures) {
        const failCaseName = failure.artifactURI ? path.basename(failure.artifactURI, '.jsonl') : '';
        readmeLines.push(`### ${failCaseName}\n`);
        readmeLines.push(`- Status: ${failure.status}`);
        readmeLines.push(`- Duration: ${failure.duration}ms`);
        readmeLines.push(`- Location: ${failure.location}`);
        if (failure.error) {
          readmeLines.push(`- Error: ${failure.error}`);
        }
        readmeLines.push('');
      }
      fs.writeFileSync(readmePath, readmeLines.join('\n'));
    }

    return {
      bundlePath: bundleDir,
      bundlePaths,
      summary: `Created bundle with ${failures.length} case(s) at ${bundleDir}`,
    };
  }

  async start(): Promise<void> {
    console.log('Laminar MCP Server started');
    console.log(`Reports directory: ${this.reportsDir}`);
    console.log(`Summary file: ${this.summaryFile}`);
    console.log(`Config file: ${this.configFile}`);
    console.log('');
    console.log('Available resources:', this.listResources().length);
    console.log('Available tools:', this.listTools().length);
  }
}

export async function createLaminarServer(config?: McpServerConfig): Promise<LaminarMcpServer> {
  const server = new LaminarMcpServer(config);
  await server.start();
  return server;
}
