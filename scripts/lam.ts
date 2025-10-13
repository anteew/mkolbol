#!/usr/bin/env node
import { spawnSync, execSync } from 'node:child_process';
import * as fs from 'node:fs';
import { ingestGoTest } from './ingest-go.js';
import { ingestPytestJSON } from './ingest-pytest.js';
import { ingestJUnit } from './ingest-junit.js';
import { DigestDiffEngine } from '../src/digest/diff.js';
import { bundleRepro } from './repro-bundle.js';
import { scaffold, printScaffoldPreview } from '../src/init/scaffold.js';

function sh(cmd: string, args: string[], env: Record<string, string> = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  return res.status ?? 0;
}

function printHelp() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  console.log(`Laminar CLI v${pkg.version}
Stream-based test execution and failure analysis toolkit

USAGE
  lam <command> [options]
  npx lam <command> [options]

CONFIGURATION
  init [--template <t>] [--dry-run] [--force]
                                            Initialize Laminar in your project (creates config & setup)
                                            --template: node-defaults (default), go-defaults, minimal
                                            --dry-run: Preview without writing files
                                            --force: Overwrite existing config

TEST EXECUTION
  run [--lane ci|pty|auto] [--filter <p>]  Run tests with Laminar instrumentation
                                            --lane: execution mode (auto=smart detection)
                                            --filter: test name pattern (uses vitest -t flag)

ANALYSIS & REPORTING
  summary [--hints]                         Show test results summary from last run
                                            --hints: Show triage hints for failures (OR with LAMINAR_HINTS=1)
  show --case <suite/case>                  Display detailed logs for a specific test case
       [--around <pattern>]                 Context pattern to search for (default: assert.fail)
       [--window <n>]                       Lines of context around pattern (default: 50)
  digest [--cases <case1,case2,...>]        Generate failure digests for test cases
                                            If --cases omitted, digests all failed tests
  diff <digest1> <digest2>                  Compare two digest files
       [--output <path>]                    Save comparison to file
       [--format json|markdown]             Output format (default: json)
  trends [--since <ts>] [--until <ts>]      Show failure trends over time
         [--top <n>]                        Number of top offenders to display (default: 10)

DEBUGGING
  repro --bundle [--case <case-name>]       Bundle reproduction artifacts for debugging
                                            If --case omitted, bundles all failing tests

INGEST (External Test Frameworks)
  ingest --go [--from-file <path> | --cmd "<command>"]
                                            Import Go test results (go test -json)
  ingest --py|--pytest [--from-file <path> | --cmd "<command>"]
                                            Import pytest JSON reports
  ingest --junit [--from-file <path> | --cmd "<command>"]
                                            Import JUnit XML results

CONFIGURATION MANAGEMENT
  rules get                                 Display current Laminar rules config
  rules set --file <path> | --inline '<json>'
                                            Update Laminar rules configuration

EXAMPLES
  # Quick start
  npx lam init                              # Initialize Laminar with node-defaults template
  npx lam init --dry-run                    # Preview config without creating
  npx lam init --template go-defaults       # Initialize for Go projects
  lam run --lane auto                       # Run tests with auto-detection
  lam summary                               # View results

  # Focused testing
  lam run --lane ci --filter "kernel"       # Run only kernel tests
  lam show --case kernel.spec/connect_moves_data_1_1 --around assert.fail --window 50

  # Analysis workflows
  lam digest                                # Digest all failures
  lam digest --cases kernel.spec/case1,kernel.spec/case2
  lam diff reports/case1.digest.json reports/case2.digest.json --format markdown
  lam trends --top 10 --since 2025-10-01

  # External framework integration
  lam ingest --go --cmd "go test -json ./..."
  lam ingest --pytest --from-file pytest-report.json
  lam ingest --junit --cmd "mvn test"

  # Debugging support
  lam repro --bundle --case kernel.spec/failing_test

  # Configuration
  lam rules get
  lam rules set --inline '{"budget":{"kb":2}}'

LEARN MORE
  Documentation: https://github.com/anteew/mkolbol
  Report issues: https://github.com/anteew/mkolbol/issues
`);
}

function readSummary(): any[] {
  const indexPath = 'reports/index.json';
  if (fs.existsSync(indexPath)) {
    try {
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      return index.artifacts || [];
    } catch (err) {
      console.error('Failed to parse index.json, falling back to summary.jsonl');
    }
  }
  
  const p = 'reports/summary.jsonl';
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf-8').trim().split(/\n+/).map(l => { try { return JSON.parse(l); } catch { return undefined; } }).filter(Boolean);
}

function findTestInIndex(caseId: string): any {
  const indexPath = 'reports/index.json';
  if (!fs.existsSync(indexPath)) return null;
  
  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const artifacts = index.artifacts || [];
    
    // Normalize caseId: suite/test_name format
    const parts = caseId.split('/');
    if (parts.length !== 2) return null;
    
    const [suite, testName] = parts;
    const normalized = testName.replace(/_/g, ' ');
    
    return artifacts.find((a: any) => {
      const entryLocation = a.location || '';
      const entryTestName = a.testName || '';
      return entryLocation.includes(suite) && (
        entryTestName === normalized ||
        entryTestName.replace(/\s+/g, '_') === testName
      );
    });
  } catch (err) {
    return null;
  }
}

function generateHint(digest: any, entry: any): string | null {
  // Extract suite/case for command
  const location = entry.location || '';
  const testName = entry.testName || '';
  const caseId = `${location.split('/').pop()?.replace('.ts', '') || 'unknown'}/${testName.replace(/\s+/g, '_')}`;
  
  // Detect triage patterns
  const summary = digest.summary || {};
  const suspects = digest.suspects || [];
  const topSuspect = suspects[0];
  
  // Pattern: budget-clipped
  if (summary.budgetUsed >= summary.budgetLimit * 0.9) {
    return `[budget-clipped] budget=${summary.budgetUsed}/${summary.budgetLimit} → lam show --case ${caseId} --window 100`;
  }
  
  // Pattern: redaction-mismatch
  if (summary.redactedFields === 0 && summary.totalEvents > 0) {
    return `[redaction-mismatch] no redactions (${summary.totalEvents} events) → lam rules set --inline '{"budget":{"kb":4}}'`;
  }
  
  // Pattern: error-signal (default)
  if (topSuspect) {
    const signal = topSuspect.evt || 'unknown';
    const errorMsg = topSuspect.payload?.message || digest.error || 'unknown error';
    const shortError = errorMsg.split('\n')[0].substring(0, 40);
    return `[error-signal] ${signal}: ${shortError}... → lam show --case ${caseId}`;
  }
  
  // Fallback
  return `[unknown] → lam show --case ${caseId}`;
}

async function main() {
  const [,, cmd, ...rest] = process.argv;
  const args = new Map<string,string|true>();
  for (let i=0; i<rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = rest[i+1] && !rest[i+1].startsWith('--') ? (rest[i+1]) : true;
      if (v !== true) i++;
      args.set(k, v as any);
    }
  }

  switch (cmd) {
    case 'init': {
      const template = (args.get('template') as string) || 'node-defaults';
      const dryRun = args.get('dry-run') === true || args.get('dryrun') === true;
      const force = args.get('force') === true;

      const result = scaffold({
        template: template as any,
        dryRun,
        force,
        silent: false,
      });

      if (dryRun) {
        printScaffoldPreview(result);
      } else if (!result.success) {
        console.error(`Error: ${result.message}`);
        process.exit(1);
      }
      break;
    }
    case 'run': {
      const lane = (args.get('lane') as string) || 'auto';
      const filter = args.get('filter') as (string|undefined);
      if (lane === 'auto') {
        if (filter) {
          // auto with filter: run threaded, then debug rerun single file
          sh('vitest', ['run', '--pool=threads', '--reporter=./dist/test/reporter/jsonlReporter.js', '-t', filter]);
          sh('npm', ['run','laminar:run']);
        } else {
          sh('npm', ['run','laminar:run']);
        }
      } else if (lane === 'ci') {
        const a = ['run','test:ci'];
        if (filter) a.push('--', '-t', filter);
        sh('npm', a);
      } else if (lane === 'pty') {
        const a = ['run','test:pty'];
        if (filter) a.push('--', '-t', filter);
        sh('npm', a);
      } else {
        console.error('Unknown lane. Use ci|pty|auto');
        process.exit(1);
      }
      break;
    }
    case 'summary': {
      const entries = readSummary();
      if (!entries.length) { console.log('No summary found. Run `lam run` first.'); break; }
      
      const hintsEnabled = process.env.LAMINAR_HINTS === '1' || args.get('hints') === true;
      
      for (const e of entries) {
        const status = (e.status || 'unknown').toUpperCase();
        const duration = e.duration || 0;
        const location = e.location || '';
        const testName = e.testName || '';
        
        // Check for digest file
        let digestLink = '';
        let digestPath = '';
        if (e.artifacts?.digestFile && fs.existsSync(e.artifacts.digestFile)) {
          digestLink = ` [digest: ${e.artifacts.digestFile}]`;
          digestPath = e.artifacts.digestFile;
        } else {
          // Try to find digest file based on caseFile path
          const caseFile = e.artifacts?.caseFile || e.artifactURI || '';
          if (caseFile.endsWith('.jsonl')) {
            const dp = caseFile.replace('.jsonl', '.digest.json');
            if (fs.existsSync(dp)) {
              digestLink = ` [digest: ${dp}]`;
              digestPath = dp;
            } else {
              const dpMd = caseFile.replace('.jsonl', '.digest.md');
              if (fs.existsSync(dpMd)) {
                digestLink = ` [digest: ${dpMd}]`;
              }
            }
          }
        }
        
        const artifactURI = e.artifactURI || e.artifacts?.caseFile || '';
        console.log(`${status} ${duration}ms ${location} → ${artifactURI}${digestLink}`);
        
        // Show hint for failed tests if enabled
        if (hintsEnabled && status === 'FAIL' && digestPath && digestPath.endsWith('.json')) {
          try {
            const digest = JSON.parse(fs.readFileSync(digestPath, 'utf-8'));
            const hint = generateHint(digest, e);
            if (hint) {
              console.log(`💡 ${hint}`);
            }
          } catch (err) {
            // Silently skip if digest can't be read or parsed
          }
        }
      }
      break;
    }
    case 'show': {
      const caseId = args.get('case') as string;
      if (!caseId) { console.error('lam show --case <suite/case> [--around <pattern>] [--window <n>]'); process.exit(1); }
      const around = (args.get('around') as string) || 'assert.fail';
      const window = (args.get('window') as string) || '50';
      
      // Find test in index.json to get digest path and case file
      const testEntry = findTestInIndex(caseId);
      let digestPath: string | undefined;
      let caseFile: string | undefined;
      
      if (testEntry?.artifacts?.caseFile) {
        caseFile = testEntry.artifacts.caseFile;
      } else {
        // Fallback: construct from caseId
        const parts = caseId.split('/');
        if (parts.length === 2) {
          const [suite, test] = parts;
          caseFile = `reports/${suite}/${test}.jsonl`;
        }
      }
      
      // Try to find digest file
      if (testEntry?.artifacts?.digestFile && fs.existsSync(testEntry.artifacts.digestFile)) {
        digestPath = testEntry.artifacts.digestFile;
      } else if (caseFile && caseFile.endsWith('.jsonl')) {
        // Derive digest path from case file
        const derived = caseFile.replace('.jsonl', '.digest.md');
        if (fs.existsSync(derived)) {
          digestPath = derived;
        }
      }
      
      if (!digestPath) {
        // Final fallback: try common patterns
        const parts = caseId.split('/');
        if (parts.length === 2) {
          const [suite, test] = parts;
          const candidates = [
            `reports/${suite}/${test}.digest.md`,
            `reports/${caseId}.digest.md`,
          ];
          digestPath = candidates.find(p => fs.existsSync(p));
        }
      }
      
      if (digestPath && fs.existsSync(digestPath)) {
        console.log('=== DIGEST ===');
        console.log(fs.readFileSync(digestPath, 'utf-8'));
        console.log('\n=== FULL LOG ===');
      }
      
      if (!caseFile || !fs.existsSync(caseFile)) {
        console.error(`Case file not found for ${caseId}`);
        process.exit(1);
      }
      
      sh('npm', ['run','logq','--','--around', around, '--window', window, caseFile]);
      break;
    }
    case 'digest': {
      const casesArg = args.get('cases') as string | undefined;
      if (casesArg) {
        const cases = casesArg.split(',').map(c => c.trim());
        sh('npm', ['run', 'laminar:digest', '--', '--cases', cases.join(',')]);
      } else {
        sh('npm', ['run', 'laminar:digest']);
      }
      break;
    }
    case 'diff': {
      const digest1 = rest[0];
      const digest2 = rest[1];
      
      if (!digest1 || !digest2) {
        console.error('lam diff <digest1> <digest2> [--output <path>] [--format json|markdown]');
        process.exit(1);
      }
      
      if (!fs.existsSync(digest1)) {
        console.error(`Digest file not found: ${digest1}`);
        process.exit(1);
      }
      
      if (!fs.existsSync(digest2)) {
        console.error(`Digest file not found: ${digest2}`);
        process.exit(1);
      }
      
      const outputPath = args.get('output') as string | undefined;
      const format = (args.get('format') as string) || 'json';
      
      if (format !== 'json' && format !== 'markdown') {
        console.error('Format must be "json" or "markdown"');
        process.exit(1);
      }
      
      const engine = new DigestDiffEngine();
      const diff = engine.compareFiles(digest1, digest2);
      
      if (outputPath) {
        engine.writeDiff(diff, outputPath, format);
        console.log(`Diff written to: ${outputPath}`);
      } else {
        // Output to terminal
        if (format === 'markdown') {
          console.log(engine.formatAsMarkdown(diff));
        } else {
          console.log(engine.formatAsJson(diff, true));
        }
      }
      break;
    }
    case 'repro': {
      const bundle = args.get('bundle');
      
      if (!bundle) {
        console.error('lam repro --bundle [--case <case-name>]');
        process.exit(1);
      }
      
      const caseName = args.get('case') as string | undefined;
      await bundleRepro(caseName);
      break;
    }
    case 'ingest': {
      const go = args.get('go');
      const py = args.get('py');
      const pytest = args.get('pytest');
      const junit = args.get('junit');
      
      const formats = [go, py, pytest, junit].filter(Boolean);
      
      if (formats.length === 0) {
        console.error('lam ingest requires a format flag: --go, --py, --pytest, or --junit');
        console.error('  lam ingest --go [--from-file <path> | --cmd "<command>"]');
        console.error('  lam ingest --py|--pytest [--from-file <path> | --cmd "<command>"]');
        console.error('  lam ingest --junit [--from-file <path> | --cmd "<command>"]');
        process.exit(1);
      }
      
      if (formats.length > 1) {
        console.error('lam ingest: use only one format flag at a time');
        process.exit(1);
      }
      
      const fromFile = args.get('from-file') as string | undefined;
      const cmd = args.get('cmd') as string | undefined;
      
      if (!fromFile && !cmd) {
        console.error('lam ingest requires --from-file <path> or --cmd "<command>"');
        process.exit(1);
      }
      
      if (fromFile && cmd) {
        console.error('lam ingest: use either --from-file or --cmd, not both');
        process.exit(1);
      }
      
      let input: string;
      if (fromFile) {
        if (!fs.existsSync(fromFile)) {
          console.error(`File not found: ${fromFile}`);
          process.exit(1);
        }
        input = fs.readFileSync(fromFile, 'utf-8');
      } else {
        try {
          input = execSync(cmd!, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        } catch (error: any) {
          input = error.stdout || '';
          if (!input) {
            console.error(`Command failed: ${cmd}`);
            console.error(error.message);
            process.exit(1);
          }
        }
      }
      
      if (go) {
        ingestGoTest(input);
      } else if (py || pytest) {
        ingestPytestJSON(input);
      } else if (junit) {
        ingestJUnit(input);
      }
      break;
    }
    case 'rules': {
      const sub = rest[0];
      if (sub === 'get') {
        if (fs.existsSync('laminar.config.json')) {
          process.stdout.write(fs.readFileSync('laminar.config.json','utf-8'));
        } else {
          console.log('{}');
        }
      } else if (sub === 'set') {
        const file = args.get('file') as string|undefined;
        const inline = args.get('inline') as string|undefined;
        if (!file && !inline) { console.error('lam rules set --file <path> | --inline \"{...}\"'); process.exit(1); }
        const content = file ? fs.readFileSync(file,'utf-8') : inline!;
        JSON.parse(content); // validate
        fs.writeFileSync('laminar.config.json', content);
        console.log('Updated laminar.config.json');
      } else {
        printHelp();
        process.exit(1);
      }
      break;
    }
    case 'trends': {
      const historyPath = 'reports/history.jsonl';
      if (!fs.existsSync(historyPath)) {
        console.error('No history.jsonl found. Run tests first to generate failure history.');
        process.exit(1);
      }
      
      const sinceArg = args.get('since') as string | undefined;
      const untilArg = args.get('until') as string | undefined;
      const topN = parseInt((args.get('top') as string) || '10', 10);
      
      const sinceTs = sinceArg ? new Date(sinceArg).getTime() : 0;
      const untilTs = untilArg ? new Date(untilArg).getTime() : Date.now();
      
      interface HistoryEntry {
        ts: number;
        fingerprint: string;
        caseName: string;
        status: 'fail' | 'pass' | 'skip';
        location?: string;
        errorMessage?: string;
      }

      function normalize(raw: any): HistoryEntry | undefined {
        try {
          const ts = typeof raw.ts === 'number'
            ? raw.ts
            : raw.timestamp
              ? Date.parse(raw.timestamp)
              : (typeof raw.time === 'number' ? raw.time : undefined);
          if (!ts || Number.isNaN(ts)) return undefined;
          const caseName = raw.caseName || raw.testName || raw.name || 'unknown.case';
          const status: 'fail' | 'pass' | 'skip' = (raw.status || 'pass');
          const location = raw.location || raw.file || undefined;
          const fingerprint = raw.fingerprint || raw.fp || '';
          const errorMessage = raw.errorMessage || raw.error || undefined;
          return { ts, fingerprint, caseName, status, location, errorMessage };
        } catch {
          return undefined;
        }
      }
      
      const entries: HistoryEntry[] = fs.readFileSync(historyPath, 'utf-8')
        .trim()
        .split(/\n+/)
        .map(line => { try { return JSON.parse(line); } catch { return undefined; } })
        .filter(Boolean)
        .map((raw: any) => normalize(raw))
        .filter((v): v is HistoryEntry => Boolean(v));
      
      const filtered = entries.filter(e => e.ts >= sinceTs && e.ts <= untilTs);
      
      interface FailureStats {
        fingerprint: string;
        caseName: string;
        count: number;
        firstSeen: number;
        lastSeen: number;
        locations: Set<string>;
        errorSamples: string[];
      }
      
      const failureMap = new Map<string, FailureStats>();
      
      for (const entry of filtered) {
        if (entry.status !== 'fail') continue;
        
        const fp = entry.fingerprint;
        if (!failureMap.has(fp)) {
          failureMap.set(fp, {
            fingerprint: fp,
            caseName: entry.caseName,
            count: 0,
            firstSeen: entry.ts,
            lastSeen: entry.ts,
            locations: new Set(),
            errorSamples: [],
          });
        }
        
        const stats = failureMap.get(fp)!;
        stats.count++;
        stats.lastSeen = Math.max(stats.lastSeen, entry.ts);
        stats.firstSeen = Math.min(stats.firstSeen, entry.ts);
        if (entry.location) stats.locations.add(entry.location);
        if (entry.errorMessage && stats.errorSamples.length < 3) {
          stats.errorSamples.push(entry.errorMessage);
        }
      }
      
      const sorted = Array.from(failureMap.values()).sort((a, b) => b.count - a.count);
      const topFailures = sorted.slice(0, topN);
      
      const totalFailures = filtered.filter(e => e.status === 'fail').length;
      const totalTests = filtered.length;
      const failureRate = totalTests > 0 ? ((totalFailures / totalTests) * 100).toFixed(1) : '0.0';
      
      console.log(`\n=== Laminar Trends ===`);
      console.log(`Period: ${new Date(sinceTs).toISOString()} → ${new Date(untilTs).toISOString()}`);
      console.log(`Total test runs: ${totalTests}`);
      console.log(`Total failures: ${totalFailures}`);
      console.log(`Failure rate: ${failureRate}%`);
      console.log(`Unique failure fingerprints: ${failureMap.size}`);
      console.log(`\n=== Top ${topN} Offenders ===\n`);
      
      for (let i = 0; i < topFailures.length; i++) {
        const f = topFailures[i];
        const firstSeenDate = new Date(f.firstSeen).toISOString();
        const lastSeenDate = new Date(f.lastSeen).toISOString();
        const locationList = Array.from(f.locations).join(', ');
        
        console.log(`#${i + 1} ${f.caseName} (${f.count} failures)`);
        console.log(`   Fingerprint: ${f.fingerprint}`);
        console.log(`   First seen:  ${firstSeenDate}`);
        console.log(`   Last seen:   ${lastSeenDate}`);
        if (locationList) {
          console.log(`   Locations:   ${locationList}`);
        }
        if (f.errorSamples.length > 0) {
          console.log(`   Error:       ${f.errorSamples[0].substring(0, 100)}${f.errorSamples[0].length > 100 ? '...' : ''}`);
        }
        console.log('');
      }
      break;
    }
    default:
      printHelp();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
