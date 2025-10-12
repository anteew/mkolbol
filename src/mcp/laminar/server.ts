import * as fs from 'node:fs';
import * as path from 'node:path';
import { DigestEvent, DigestOutput } from '../../digest/generator.js';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

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

export class LaminarMcpServer {
  private reportsDir: string;
  private summaryFile: string;

  constructor(config: McpServerConfig = {}) {
    this.reportsDir = config.reportsDir || 'reports';
    this.summaryFile = config.summaryFile || path.join(this.reportsDir, 'summary.jsonl');
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
    switch (name) {
      case 'query_logs':
        return this.queryLogs(args as QueryLogsParams) as unknown as Json;
      case 'get_digest':
        return this.getDigest((args as { caseName: string }).caseName) as unknown as Json;
      case 'list_failures':
        return this.listFailures() as unknown as Json;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
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

  private async queryLogs(params: QueryLogsParams): Promise<QueryLogsResult> {
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

  async start(): Promise<void> {
    console.log('Laminar MCP Server started');
    console.log(`Reports directory: ${this.reportsDir}`);
    console.log(`Summary file: ${this.summaryFile}`);
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
