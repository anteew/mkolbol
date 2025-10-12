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
    
    // Write environment info to summary on init
    if (this.summaryStream) {
      this.summaryStream.write(JSON.stringify({
        type: 'environment',
        ...this.environment
      }) + '\n');
    }
  }

  onCollected(): void {
    const files = this.ctx.state.getFiles();
    this.processFiles(files);
  }

  onFinished(files?: File[]): void {
    if (files) {
      this.processFiles(files);
    }
    if (this.summaryStream) {
      this.summaryStream.end();
    }
    // Close all per-case streams
    for (const stream of this.caseStreams.values()) {
      stream.end();
    }
    this.caseStreams.clear();
    this.generateIndex();
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

    if (this.summaryStream) {
      this.summaryStream.write(JSON.stringify(summary) + '\n');
    }

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

    // Remove existing file if it exists
    if (fs.existsSync(artifactPath)) {
      fs.unlinkSync(artifactPath);
    }

    const stream = fs.createWriteStream(artifactPath, { flags: 'a' });
    const ts = Date.now();

    // Write test lifecycle events
    // 1. Test begin event with environment and seed
    stream.write(JSON.stringify({
      ts,
      lvl: 'info',
      case: caseName,
      phase: 'setup',
      evt: 'case.begin',
      env: this.environment,
      seed: this.testSeed
    }) + '\n');

    // 2. Test execution event
    stream.write(JSON.stringify({
      ts: ts + 1,
      lvl: 'info',
      case: caseName,
      phase: 'execution',
      evt: 'test.run'
    }) + '\n');

    // 3. If there are errors, write error events
    if (errors && errors.length > 0) {
      errors.forEach((error, idx) => {
        stream.write(JSON.stringify({
          ts: ts + 2 + idx,
          lvl: 'error',
          case: caseName,
          phase: 'execution',
          evt: 'test.error',
          payload: {
            message: error.message || String(error),
            stack: error.stack
          }
        }) + '\n');
      });
    }

    // 4. Test end event with result
    stream.write(JSON.stringify({
      ts: ts + 2 + (errors?.length || 0),
      lvl: state === 'fail' ? 'error' : 'info',
      case: caseName,
      phase: 'teardown',
      evt: 'case.end',
      payload: {
        duration,
        status: state === 'pass' ? 'passed' : state === 'fail' ? 'failed' : 'skipped'
      }
    }) + '\n');

    stream.end();
  }

  private generateIndex(): void {
    const index: ArtifactIndex = {
      generated: new Date().toISOString(),
      totalTests: this.indexEntries.length,
      artifacts: this.indexEntries,
      environment: this.environment,
    };

    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }
}
