import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r.stdout;
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pr') args.pr = argv[++i];
    else if (a === '--trim') args.trim = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--which') args.which = argv[++i]; // last|first
  }
  return args as { pr?: string; trim?: boolean; out?: string; which?: 'last' | 'first' };
}

function extract(body: string, trim: boolean): string {
  // Find our validator summary marker comment
  // We will simply return body, optionally trimming after sprint-json-begin marker
  if (!trim) return body;
  const marker = '<!-- sprint-json-begin -->';
  const idx = body.indexOf(marker);
  if (idx === -1) return body; // nothing to trim
  return body.slice(0, idx).trim() + '\n\n' + marker + '\n<!-- trimmed for agent context -->\n';
}

function main() {
  const { pr, trim, out, which } = parseArgs(process.argv);
  if (!pr)
    throw new Error(
      'Usage: pr-comment-extract --pr <NUM> [--trim] [--out file] [--which last|first]',
    );
  const json = run('gh', ['pr', 'view', String(pr), '--comments', '--json', 'comments']);
  const data = JSON.parse(json);
  const comments = (data.comments || []) as Array<{ body: string; author?: { login?: string } }>;
  const candidates = comments.filter((c) => c.body && c.body.includes('validator-summary-marker'));
  if (candidates.length === 0) throw new Error('No validator summary comment found');
  const chosen = which === 'first' ? candidates[0] : candidates[candidates.length - 1];
  const body = extract(chosen.body, !!trim);
  if (out) {
    const p = resolve(process.cwd(), out);
    writeFileSync(p, body, 'utf8');
    console.log(`[pr-comment-extract] wrote ${p}`);
  } else {
    console.log(body);
  }
}

main();
