import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { File, Reporter, Task, Vitest } from 'vitest';

interface RuntimeEnvironment {
  nodeVersion: string;
  platform: string;
  arch: string;
  os: string;
  seed?: number;
  envVars?: Record<string, string>;
}

interface TestSummary {
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  location: string;
  artifactURI?: string;
  error?: string;
  seed?: number;
  env?: RuntimeEnvironment;
}

interface ArtifactIndexEntry {
  testName: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  location: string;
  timestamp: string;
  artifacts: {
    summary: string;
    caseFile?: string;
    digestFile?: string;
  };
}

interface ArtifactIndex {
  generated: string;
  totalTests: number;
  artifacts: ArtifactIndexEntry[];
  environment: RuntimeEnvironment;
}

export default class JSONLReporter implements Reporter {
  private ctx!: Vitest;
  private summaryPath = 'reports/summary.jsonl';
  private indexPath = 'reports/index.json';
  private summaryStream?: fs.WriteStream;
  private processedTests = new Set<string>();
  private indexEntries: ArtifactIndexEntry[] = [];
  private caseStreams = new Map<string, fs.WriteStream>();
  private environment: RuntimeEnvironment;
  private testSeed: number;
  private pendingWrites: Promise<void>[] = [];

  constructor() {
    // Fixed seed for determinism (can be overridden via env var)
    this.testSeed = process.env.TEST_SEED 
      ? parseInt(process.env.TEST_SEED, 10)
      : 42;
    
    this.environment = this.captureEnvironment();
  }

  private captureEnvironment(): RuntimeEnvironment {
    const relevantEnvVars: Record<string, string> = {};
    const envKeys = ['CI', 'NODE_ENV', 'TEST_SEED', 'LAMINAR_DEBUG', 'LAMINAR_SUITE', 'LAMINAR_CASE'];
    
    for (const key of envKeys) {
      if (process.env[key]) {
        relevantEnvVars[key] = process.env[key]!;
      }
    }

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      os: `${os.type()} ${os.release()}`,
      seed: this.testSeed,
      envVars: Object.keys(relevantEnvVars).length > 0 ? relevantEnvVars : undefined,
    };
  }

  onInit(ctx: Vitest): void {
    this.ctx = ctx;
    const dir = path.dirname(this.summaryPath);
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(this.summaryPath)) {
      fs.unlinkSync(this.summaryPath);
    }
    this.summaryStream = fs.createWriteStream(this.summaryPath, { flags: 'a' });
    this.indexEntries = [];
    this.pendingWrites = [];
    
    // Write environment info to summary on init
    if (this.summaryStream) {
      this.writeSummaryLine(JSON.stringify({
        type: 'environment',
        ...this.environment
      }) + '\n');
    }
  }

  onCollected(): void {
    const files = this.ctx.state.getFiles();
    this.processFiles(files);
  }

  async onFinished(files?: File[]): Promise<void> {
    if (files) {
      this.processFiles(files);
    }
    
    // Wait for all pending writes to complete
    await Promise.all(this.pendingWrites);
    this.pendingWrites = [];
    
    // Close all per-case streams first and wait for them
    const caseStreamPromises: Promise<void>[] = [];
    for (const stream of this.caseStreams.values()) {
      caseStreamPromises.push(new Promise((resolve, reject) => {
        stream.end((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      }));
    }
    await Promise.all(caseStreamPromises);
    this.caseStreams.clear();
    
    // Close summary stream and wait for it to finish
    if (this.summaryStream) {
      await new Promise<void>((resolve, reject) => {
        this.summaryStream!.end((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    // Generate index only after all streams are flushed (deterministic order: summary.jsonl → index.json)
    this.generateIndex();
  }

  private writeSummaryLine(line: string): void {
    if (!this.summaryStream) return;
    
    const writePromise = new Promise<void>((resolve, reject) => {
      if (!this.summaryStream!.write(line)) {
        this.summaryStream!.once('drain', () => resolve());
      } else {
        resolve();
      }
    });
    
    this.pendingWrites.push(writePromise);
  }

  private processFiles(files: File[]): void {
    for (const file of files) {
      this.processTask(file);
    }
  }

  private processTask(task: Task): void {
    if (task.type === 'test' && task.result?.state) {
      const testId = `${task.file?.filepath}:${task.name}`;
      if (!this.processedTests.has(testId)) {
        this.processedTests.add(testId);
        this.reportTest(task);
      }
    }

    if ('tasks' in task && Array.isArray(task.tasks)) {
      for (const child of task.tasks) {
        this.processTask(child);
      }
    }
  }

  private reportTest(task: Task): void {
    const result = task.result!;
    const state = result.state;
    
    if (state !== 'pass' && state !== 'fail' && state !== 'skip') {
      return;
    }

    const duration = result.duration || 0;
    const file = task.file;
    const location = file ? `${file.filepath}:${task.location?.line || 0}` : 'unknown';
    
    const status = state === 'pass' ? '✓' : state === 'fail' ? '✗' : '○';
    const color = state === 'pass' ? '\x1b[32m' : state === 'fail' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    
    console.log(`${color}${status}${reset} ${task.name} (${duration.toFixed(0)}ms)`);

    const suiteName = file ? path.basename(file.filepath, path.extname(file.filepath)) : 'unknown';
    const caseName = task.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const artifactURI = `reports/${suiteName}/${caseName}.jsonl`;

    // Write per-case JSONL file with test lifecycle events
    this.writePerCaseJSONL(artifactURI, task.name, state, duration, result.errors);

    const summary: TestSummary = {
      status: state,
      duration,
      location,
      artifactURI,
      seed: this.testSeed,
    };

    if (result.errors && result.errors.length > 0) {
      summary.error = result.errors.map(e => e.message || String(e)).join('; ');
    }

    this.writeSummaryLine(JSON.stringify(summary) + '\n');

    const suitePath = file ? path.basename(file.filepath, path.extname(file.filepath)) : 'unknown';
    const digestPath = `reports/${suitePath}/digest.jsonl`;
    
    this.indexEntries.push({
      testName: task.name,
      status: state,
      duration,
      location,
      timestamp: new Date().toISOString(),
      artifacts: {
        summary: this.summaryPath,
        caseFile: artifactURI,
        digestFile: fs.existsSync(digestPath) ? digestPath : undefined,
      },
    });
  }

  private writePerCaseJSONL(
    artifactPath: string,
    caseName: string,
    state: 'pass' | 'fail' | 'skip',
    duration: number,
    errors?: any[]
  ): void {
    const dir = path.dirname(artifactPath);
    fs.mkdirSync(dir, { recursive: true });

    const ts = Date.now();
    const events: string[] = [];

    // Build test lifecycle events
    // 1. Test begin event with environment and seed
    events.push(JSON.stringify({
      ts,
      lvl: 'info',
      case: caseName,
      phase: 'setup',
      evt: 'case.begin',
      env: this.environment,
      seed: this.testSeed
    }));

    // 2. Test execution event
    events.push(JSON.stringify({
      ts: ts + 1,
      lvl: 'info',
      case: caseName,
      phase: 'execution',
      evt: 'test.run'
    }));

    // 3. If there are errors, write error events
    if (errors && errors.length > 0) {
      errors.forEach((error, idx) => {
        events.push(JSON.stringify({
          ts: ts + 2 + idx,
          lvl: 'error',
          case: caseName,
          phase: 'execution',
          evt: 'test.error',
          payload: {
            message: error.message || String(error),
            stack: error.stack
          }
        }));
      });
    }

    // 4. Test end event with result
    events.push(JSON.stringify({
      ts: ts + 2 + (errors?.length || 0),
      lvl: state === 'fail' ? 'error' : 'info',
      case: caseName,
      phase: 'teardown',
      evt: 'case.end',
      payload: {
        duration,
        status: state === 'pass' ? 'passed' : state === 'fail' ? 'failed' : 'skipped'
      }
    }));

    // Atomic write: write to temp file then rename
    const tempPath = `${artifactPath}.tmp`;
    fs.writeFileSync(tempPath, events.join('\n') + '\n');
    fs.renameSync(tempPath, artifactPath);
  }

  private generateIndex(): void {
    const index: ArtifactIndex = {
      generated: new Date().toISOString(),
      totalTests: this.indexEntries.length,
      artifacts: this.indexEntries,
      environment: this.environment,
    };

    // Atomic write: write to temp file then rename
    const tempPath = `${this.indexPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(index, null, 2));
    fs.renameSync(tempPath, this.indexPath);
  }
}
