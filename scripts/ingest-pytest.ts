import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PytestStage {
  duration?: number;
  outcome: string;
  crash?: {
    path?: string;
    lineno?: number;
    message?: string;
  };
  traceback?: Array<{
    path?: string;
    lineno?: number;
    message?: string;
  }>;
  stdout?: string;
  stderr?: string;
  longrepr?: string;
}

export interface PytestTest {
  nodeid: string;
  lineno?: number;
  keywords?: string[];
  outcome: string;
  setup?: PytestStage | null;
  call?: PytestStage | null;
  teardown?: PytestStage | null;
  metadata?: any;
}

export interface PytestReport {
  created?: number;
  duration?: number;
  exitcode?: number;
  root?: string;
  environment?: any;
  summary?: {
    collected?: number;
    total?: number;
    passed?: number;
    failed?: number;
    error?: number;
    skipped?: number;
    xfailed?: number;
    xpassed?: number;
    [key: string]: any;
  };
  tests?: PytestTest[];
  warnings?: any[];
}

export interface LaminarTestEvent {
  ts: number;
  lvl: string;
  case?: string;
  phase?: string;
  evt: string;
  payload?: any;
}

export function parsePytestJSON(input: string): PytestReport {
  try {
    return JSON.parse(input) as PytestReport;
  } catch (error) {
    throw new Error(`Failed to parse pytest JSON: ${error}`);
  }
}

function mapOutcomeToStatus(outcome: string): string {
  switch (outcome) {
    case 'passed':
      return 'pass';
    case 'failed':
      return 'fail';
    case 'error':
      return 'error';
    case 'skipped':
    case 'xfailed':
    case 'xpassed':
      return 'skip';
    default:
      return outcome;
  }
}

function extractErrorMessage(stage?: PytestStage | null): string | undefined {
  if (!stage) return undefined;
  if (stage.crash?.message) return stage.crash.message;
  if (stage.longrepr) return stage.longrepr;
  return undefined;
}

function extractStackTrace(stage?: PytestStage | null): string | undefined {
  if (!stage?.traceback || stage.traceback.length === 0) return undefined;
  
  return stage.traceback
    .map(entry => {
      const location = entry.path && entry.lineno 
        ? `  at ${entry.path}:${entry.lineno}` 
        : entry.path 
          ? `  at ${entry.path}` 
          : '';
      const message = entry.message ? `\n    ${entry.message}` : '';
      return `${location}${message}`;
    })
    .filter(line => line.trim())
    .join('\n');
}

export function convertToLaminar(report: PytestReport): {
  events: LaminarTestEvent[];
  summary: Array<{ status: string; duration: number; location: string; artifactURI: string }>;
} {
  const laminarEvents: LaminarTestEvent[] = [];
  const summary: Array<{ status: string; duration: number; location: string; artifactURI: string }> = [];
  
  const baseTs = report.created ? Math.floor(report.created * 1000) : Date.now();
  
  if (!report.tests || report.tests.length === 0) {
    return { events: laminarEvents, summary };
  }

  let currentTs = baseTs;

  for (const test of report.tests) {
    const caseId = test.nodeid;
    const location = test.lineno ? `${test.nodeid}:${test.lineno}` : test.nodeid;
    
    const testStartTs = currentTs;
    laminarEvents.push({
      ts: currentTs,
      lvl: 'info',
      case: caseId,
      phase: 'setup',
      evt: 'case.begin',
      payload: { nodeid: test.nodeid, lineno: test.lineno, keywords: test.keywords }
    });
    currentTs += 1;

    if (test.setup) {
      const setupDuration = Math.round((test.setup.duration || 0) * 1000);
      laminarEvents.push({
        ts: currentTs,
        lvl: test.setup.outcome === 'error' || test.setup.outcome === 'failed' ? 'error' : 'info',
        case: caseId,
        phase: 'setup',
        evt: `test.setup.${test.setup.outcome}`,
        payload: { 
          duration: setupDuration,
          stdout: test.setup.stdout,
          stderr: test.setup.stderr
        }
      });
      currentTs += setupDuration || 1;

      if ((test.setup.outcome === 'error' || test.setup.outcome === 'failed') && test.setup.crash) {
        const errorMessage = extractErrorMessage(test.setup);
        const stackTrace = extractStackTrace(test.setup);
        
        laminarEvents.push({
          ts: currentTs,
          lvl: 'error',
          case: caseId,
          phase: 'setup',
          evt: 'test.error',
          payload: {
            message: errorMessage,
            stack: stackTrace,
            crash: test.setup.crash
          }
        });
        currentTs += 1;
      }
    }

    if (test.call) {
      const callDuration = Math.round((test.call.duration || 0) * 1000);
      laminarEvents.push({
        ts: currentTs,
        lvl: 'info',
        case: caseId,
        phase: 'execution',
        evt: 'test.run'
      });
      currentTs += 1;

      if (test.call.stdout) {
        laminarEvents.push({
          ts: currentTs,
          lvl: 'info',
          case: caseId,
          phase: 'execution',
          evt: 'test.output',
          payload: { output: test.call.stdout.trim() }
        });
        currentTs += 1;
      }

      if (test.call.stderr) {
        laminarEvents.push({
          ts: currentTs,
          lvl: 'warn',
          case: caseId,
          phase: 'execution',
          evt: 'test.stderr',
          payload: { output: test.call.stderr.trim() }
        });
        currentTs += 1;
      }

      laminarEvents.push({
        ts: currentTs,
        lvl: test.call.outcome === 'failed' || test.call.outcome === 'error' ? 'error' : 'info',
        case: caseId,
        phase: 'execution',
        evt: `test.call.${test.call.outcome}`,
        payload: { duration: callDuration }
      });
      currentTs += callDuration || 1;

      if ((test.call.outcome === 'failed' || test.call.outcome === 'error') && test.call.crash) {
        const errorMessage = extractErrorMessage(test.call);
        const stackTrace = extractStackTrace(test.call);
        
        laminarEvents.push({
          ts: currentTs,
          lvl: 'error',
          case: caseId,
          phase: 'execution',
          evt: 'test.error',
          payload: {
            message: errorMessage,
            stack: stackTrace,
            crash: test.call.crash
          }
        });
        currentTs += 1;
      }
    }

    if (test.teardown) {
      const teardownDuration = Math.round((test.teardown.duration || 0) * 1000);
      laminarEvents.push({
        ts: currentTs,
        lvl: test.teardown.outcome === 'error' || test.teardown.outcome === 'failed' ? 'error' : 'info',
        case: caseId,
        phase: 'teardown',
        evt: `test.teardown.${test.teardown.outcome}`,
        payload: { 
          duration: teardownDuration,
          stdout: test.teardown.stdout,
          stderr: test.teardown.stderr
        }
      });
      currentTs += teardownDuration || 1;
    }

    const totalDuration = Math.round(
      ((test.setup?.duration || 0) + 
       (test.call?.duration || 0) + 
       (test.teardown?.duration || 0)) * 1000
    );

    const finalOutcome = mapOutcomeToStatus(test.outcome);
    laminarEvents.push({
      ts: currentTs,
      lvl: finalOutcome === 'fail' || finalOutcome === 'error' ? 'error' : 'info',
      case: caseId,
      phase: 'teardown',
      evt: 'case.end',
      payload: {
        duration: totalDuration,
        status: test.outcome === 'passed' ? 'passed' : 'failed'
      }
    });
    currentTs += 1;

    const artifactURI = `reports/${caseId.replace(/[/:]/g, '.')}.jsonl`;
    summary.push({
      status: finalOutcome,
      duration: totalDuration,
      location,
      artifactURI
    });
  }

  return { events: laminarEvents, summary };
}

export function writeOutput(
  laminarEvents: LaminarTestEvent[],
  summary: Array<{ status: string; duration: number; location: string; artifactURI: string }>
): void {
  fs.mkdirSync('reports', { recursive: true });

  const caseGroups = new Map<string, LaminarTestEvent[]>();
  for (const evt of laminarEvents) {
    if (evt.case) {
      if (!caseGroups.has(evt.case)) {
        caseGroups.set(evt.case, []);
      }
      caseGroups.get(evt.case)!.push(evt);
    }
  }

  for (const [caseId, events] of caseGroups) {
    const artifactPath = `reports/${caseId.replace(/[/:]/g, '.')}.jsonl`;
    const dir = path.dirname(artifactPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(artifactPath, events.map(e => JSON.stringify(e)).join('\n') + '\n');
  }

  const summaryPath = 'reports/summary.jsonl';
  fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');
}

export function ingestPytestJSON(input: string): void {
  const report = parsePytestJSON(input);
  const { events, summary } = convertToLaminar(report);
  writeOutput(events, summary);
  
  console.log(`Ingested pytest report with ${report.tests?.length || 0} tests`);
  console.log(`Generated ${summary.length} test case summaries`);
  console.log(`Wrote artifacts to reports/`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const fromFileIndex = args.indexOf('--from-file');
  
  if (fromFileIndex === -1 || !args[fromFileIndex + 1]) {
    console.error('Usage: ingest-pytest.ts --from-file <path>');
    process.exit(1);
  }
  
  const filePath = args[fromFileIndex + 1];
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  const input = fs.readFileSync(filePath, 'utf-8');
  ingestPytestJSON(input);
}
