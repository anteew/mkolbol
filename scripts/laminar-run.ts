import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { generateAllDigests } from '../src/digest/generator.js';

type SummaryEntry = {
  status: 'pass'|'fail'|'skip';
  duration: number;
  location: string; // file:line
  artifactURI?: string;
  error?: string;
};

function run(cmd: string, args: string[], env?: Record<string,string>) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
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

async function main() {
  // First pass: fast lane
  fs.mkdirSync('reports', { recursive: true });
  // Clean previous summary
  if (fs.existsSync('reports/summary.jsonl')) fs.unlinkSync('reports/summary.jsonl');
  const status1 = run('npm', ['run', 'test:ci']);

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
    const env = { LAMINAR_DEBUG: '1', LAMINAR_SUITE: suite, LAMINAR_CASE: caseName };
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

  process.exit(overall);
}

main().catch((e) => { console.error(e); process.exit(1); });

