#!/usr/bin/env node
import { spawnSync, execSync } from 'node:child_process';
import * as fs from 'node:fs';
import { ingestGoTest } from './ingest-go.js';

function sh(cmd: string, args: string[], env: Record<string, string> = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  return res.status ?? 0;
}

function printHelp() {
  console.log(`Laminar CLI

Usage:
  lam run [--lane ci|pty|auto] [--filter <vitest-pattern>]
  lam summary
  lam show --case <suite/case> [--around <pattern>] [--window <n>]
  lam digest [--cases <case1,case2,...>]
  lam ingest --go [--from-file <path> | --cmd "<command>"]
  lam rules get
  lam rules set --file <path> | --inline '<json>'

Examples:
  lam run --lane auto
  lam summary
  lam show --case kernel.spec/connect_moves_data_1_1 --around assert.fail --window 50
  lam digest
  lam digest --cases kernel.spec/connect_moves_data_1_1,kernel.spec/another_case
  lam ingest --go --from-file go-test-output.json
  lam ingest --go --cmd "go test -json ./..."
  lam rules get
  lam rules set --inline '{"budget":{"kb":2}}'
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
    case 'run': {
      const lane = (args.get('lane') as string) || 'auto';
      const filter = args.get('filter') as (string|undefined);
      if (lane === 'auto') {
        if (filter) {
          // auto with filter: run threaded, then debug rerun single file
          sh('vitest', ['run', '--pool=threads', '--reporter=./dist/test/reporter/jsonlReporter.js', '--filter', filter]);
          sh('npm', ['run','laminar:run']);
        } else {
          sh('npm', ['run','laminar:run']);
        }
      } else if (lane === 'ci') {
        const a = ['run','test:ci'];
        if (filter) a.push('--', '--filter', filter);
        sh('npm', a);
      } else if (lane === 'pty') {
        sh('npm', ['run','test:pty']);
      } else {
        console.error('Unknown lane. Use ci|pty|auto');
        process.exit(1);
      }
      break;
    }
    case 'summary': {
      const entries = readSummary();
      if (!entries.length) { console.log('No summary found. Run `lam run` first.'); break; }
      for (const e of entries) {
        const status = (e.status || 'unknown').toUpperCase();
        const duration = e.duration || 0;
        const location = e.location || '';
        const testName = e.testName || '';
        
        // Check for digest file
        let digestLink = '';
        if (e.artifacts?.digestFile && fs.existsSync(e.artifacts.digestFile)) {
          digestLink = ` [digest: ${e.artifacts.digestFile}]`;
        } else {
          // Try to find digest file based on caseFile path
          const caseFile = e.artifacts?.caseFile || e.artifactURI || '';
          if (caseFile.endsWith('.jsonl')) {
            const digestPath = caseFile.replace('.jsonl', '.digest.md');
            if (fs.existsSync(digestPath)) {
              digestLink = ` [digest: ${digestPath}]`;
            }
          }
        }
        
        const artifactURI = e.artifactURI || e.artifacts?.caseFile || '';
        console.log(`${status} ${duration}ms ${location} → ${artifactURI}${digestLink}`);
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
    case 'ingest': {
      const go = args.get('go');
      if (!go) {
        console.error('lam ingest --go [--from-file <path> | --cmd "<command>"]');
        process.exit(1);
      }
      
      const fromFile = args.get('from-file') as string | undefined;
      const cmd = args.get('cmd') as string | undefined;
      
      if (!fromFile && !cmd) {
        console.error('lam ingest --go requires --from-file <path> or --cmd "<command>"');
        process.exit(1);
      }
      
      if (fromFile && cmd) {
        console.error('lam ingest --go: use either --from-file or --cmd, not both');
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
      
      ingestGoTest(input);
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
    default:
      printHelp();
  }
}

main().catch(e => { console.error(e); process.exit(1); });

