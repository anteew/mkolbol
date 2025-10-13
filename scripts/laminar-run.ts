import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { generateAllDigests } from '../src/digest/generator.js';
import { generateFingerprint, extractFailureInfo, type HistoryEntry } from '../src/digest/fingerprint.js';

type SummaryEntry = {
  status: 'pass'|'fail'|'skip';
  duration: number;
  location: string; // file:line
  artifactURI?: string;
  error?: string;
  testName?: string;
};

type StabilityResult = {
  location: string;
  runs: number;
  passes: number;
  fails: number;
  score: number; // percentage 0-100
};

function run(cmd: string, args: string[], env?: Record<string,string>) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  return res.status ?? 0;
}

function runSilent(cmd: string, args: string[], env?: Record<string,string>) {
  const res = spawnSync(cmd, args, { stdio: 'pipe', env: { ...process.env, ...env } });
  return res.status ?? 0;
}

function parseSummary(): SummaryEntry[] {
  const path = 'reports/summary.jsonl';
  if (!fs.existsSync(path)) return [];
  const lines = fs.readFileSync(path, 'utf-8').trim().split(/\n+/);
  const entries: SummaryEntry[] = [];
  for (const line of lines) {
    try { entries.push(JSON.parse(line)); } catch {}
  }
  return entries;
}

function suiteFromLocation(loc: string): string {
  const file = loc.split(':')[0] || 'unknown';
  const m = file.match(/([^\/\\]+)\.[^\.]+$/);
  return m ? m[1] : 'unknown';
}

function caseFromArtifact(uri?: string): string {
  if (!uri) return 'debug.case';
  const m = uri.match(/\/([^\/]+)\.jsonl$/);
  return m ? m[1] : 'debug.case';
}

function updateHistory(entries: SummaryEntry[], runMetadata?: Record<string, any>) {
  fs.mkdirSync('reports', { recursive: true });
  const historyPath = 'reports/history.jsonl';
  const timestamp = new Date().toISOString();
  
  for (const entry of entries) {
    const testName = entry.testName || caseFromArtifact(entry.artifactURI);
    let fingerprint = '';
    
    if (entry.status === 'fail') {
      let payload: any = undefined;
      
      if (entry.artifactURI && fs.existsSync(entry.artifactURI)) {
        try {
          const content = fs.readFileSync(entry.artifactURI, 'utf-8');
          const lines = content.trim().split('\n');
          for (const line of lines) {
            const evt = JSON.parse(line);
            if (evt.lvl === 'error' && evt.payload) {
              payload = evt.payload;
              break;
            }
          }
        } catch {}
      }
      
      const failureInfo = extractFailureInfo(testName, entry.error, payload);
      fingerprint = generateFingerprint(failureInfo);
    }
    
    const historyEntry: HistoryEntry = {
      timestamp,
      fingerprint,
      testName,
      status: entry.status,
      duration: entry.duration,
      location: entry.location,
      runMetadata,
    };
    
    fs.appendFileSync(historyPath, JSON.stringify(historyEntry) + '\n');
  }
}

async function runFlakeDetection(reruns: number = 5) {
  console.log(`\n=== FLAKE DETECTION MODE (${reruns} runs per test) ===\n`);
  
  fs.mkdirSync('reports', { recursive: true });
  
  // Use fixed seed for reproducibility
  const seed = '42';
  const env: Record<string,string> = { TEST_SEED: seed };
  
  const stabilityMap = new Map<string, StabilityResult>();
  
  for (let i = 1; i <= reruns; i++) {
    console.log(`\nRun ${i}/${reruns} (seed: ${seed})...`);
    
    // Clean summary before each run
    if (fs.existsSync('reports/summary.jsonl')) fs.unlinkSync('reports/summary.jsonl');
    
    // Run tests silently after first run
    if (i === 1) {
      run('npm', ['run', 'test:ci'], env);
    } else {
      runSilent('npm', ['run', 'test:ci'], env);
    }
    
    const entries = parseSummary();
    
    // Track stability for each test
    for (const entry of entries) {
      if (entry.status === 'skip') continue;
      
      const loc = entry.location;
      if (!stabilityMap.has(loc)) {
        stabilityMap.set(loc, { location: loc, runs: 0, passes: 0, fails: 0, score: 0 });
      }
      
      const stat = stabilityMap.get(loc)!;
      stat.runs++;
      if (entry.status === 'pass') {
        stat.passes++;
      } else if (entry.status === 'fail') {
        stat.fails++;
      }
    }
  }
  
  // Calculate final scores
  const results: StabilityResult[] = [];
  for (const stat of stabilityMap.values()) {
    stat.score = Math.round((stat.passes / stat.runs) * 100);
    results.push(stat);
  }
  
  // Sort by score (flakiest first)
  results.sort((a, b) => a.score - b.score);
  
  // Report findings
  console.log('\n=== STABILITY REPORT ===\n');
  
  const flakyTests = results.filter(r => r.score < 100 && r.score > 0);
  const alwaysFail = results.filter(r => r.score === 0);
  const stable = results.filter(r => r.score === 100);
  
  if (flakyTests.length > 0) {
    console.log('FLAKY TESTS:');
    for (const t of flakyTests) {
      console.log(`  ${t.score}% stable - ${t.location} (${t.passes}/${t.runs} passed)`);
    }
    console.log('');
  }
  
  if (alwaysFail.length > 0) {
    console.log('ALWAYS FAIL:');
    for (const t of alwaysFail) {
      console.log(`  ${t.location} (0/${t.runs} passed)`);
    }
    console.log('');
  }
  
  console.log(`SUMMARY: ${stable.length} stable, ${flakyTests.length} flaky, ${alwaysFail.length} always fail`);
  
  // Save detailed report
  const reportPath = 'reports/stability-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({ 
    seed,
    reruns,
    timestamp: new Date().toISOString(),
    results 
  }, null, 2));
  console.log(`\nDetailed report saved to ${reportPath}`);
  
  // Update history ledger for flake detection runs
  const finalEntries = parseSummary();
  const runMetadata = {
    seed,
    runId: Date.now().toString(),
    mode: 'flake-detection',
    reruns,
  };
  updateHistory(finalEntries, runMetadata);
  
  // Exit with error if any flaky tests found
  if (flakyTests.length > 0 || alwaysFail.length > 0) {
    process.exit(1);
  }
  
  process.exit(0);
}

async function main() {
  // Check for flake detection mode
  const args = process.argv.slice(2);
  const flakeDetectIdx = args.findIndex(a => a === '--flake-detect' || a === '--flake');
  
  if (flakeDetectIdx !== -1) {
    // Parse N reruns (default 5)
    let reruns = 5;
    if (flakeDetectIdx + 1 < args.length && /^\d+$/.test(args[flakeDetectIdx + 1])) {
      reruns = parseInt(args[flakeDetectIdx + 1], 10);
    }
    await runFlakeDetection(reruns);
    return;
  }
  
  // First pass: fast lane
  fs.mkdirSync('reports', { recursive: true });
  // Clean previous summary
  if (fs.existsSync('reports/summary.jsonl')) fs.unlinkSync('reports/summary.jsonl');
  
  // Set deterministic seed if not already set
  const testEnv: Record<string,string> = process.env.TEST_SEED ? {} as Record<string,string> : { TEST_SEED: '42' };
  const status1 = run('npm', ['run', 'test:ci'], testEnv);

  const entries = parseSummary();
  const fails = entries.filter(e => e.status === 'fail');
  if (fails.length === 0) {
    process.exit(status1);
  }

  // Retry failing tests with debug enabled, one by one
  let overall = status1;
  for (const f of fails) {
    const file = f.location.split(':')[0];
    const isPty = /ptyServerWrapper\.spec\.ts|multiModalOutput\.spec\.ts/.test(file);
    const suite = suiteFromLocation(f.location);
    const caseName = caseFromArtifact(f.artifactURI);
    const env: Record<string,string> = { 
      LAMINAR_DEBUG: '1', 
      LAMINAR_SUITE: suite, 
      LAMINAR_CASE: caseName,
      ...(process.env.TEST_SEED ? {} : { TEST_SEED: '42' })
    };
    if (isPty) {
      // Rerun pty lane for that file
      overall = run('vitest', ['run', '--pool=forks', '--poolOptions.forks.singleFork=true', file, '--reporter=./dist/test/reporter/jsonlReporter.js'], env) || overall;
    } else {
      overall = run('vitest', ['run', '--pool=threads', file, '--reporter=./dist/test/reporter/jsonlReporter.js'], env) || overall;
    }
  }

  // Auto-generate digests for failures
  console.log('\nGenerating digests for failed tests...');
  const digestCount = await generateAllDigests();
  if (digestCount > 0) {
    console.log(`Generated ${digestCount} digest(s) in reports/ directory`);
  }

  // Update history ledger
  const finalEntries = parseSummary();
  const runMetadata = {
    seed: process.env.TEST_SEED || testEnv.TEST_SEED || 'default',
    runId: Date.now().toString(),
  };
  updateHistory(finalEntries, runMetadata);

  process.exit(overall);
}

main().catch((e) => { console.error(e); process.exit(1); });
