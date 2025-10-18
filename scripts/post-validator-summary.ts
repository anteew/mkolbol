import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

type RunResult = { ok: boolean; code: number; stdout: string; stderr: string };

function run(cmd: string, args: string[], allowFail = true): RunResult {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  const ok = res.status === 0;
  if (!ok && !allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} failed with code ${res.status}`);
  }
  return { ok, code: res.status ?? 0, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function mdSection(title: string, body: string): string {
  return `### ${title}\n\n${body.trim()}\n`;
}

function badge(ok: boolean): string {
  return ok ? '✅ PASS' : '❌ FAIL (non-gating)';
}

function approxTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}

function loadJSON(pathRel: string): any | null {
  const p = resolve(process.cwd(), pathRel);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function buildBriefingBlock(): string {
  const warn = Number(process.env.BRIEFING_WARN_TOKENS || 600);
  const fail = Number(process.env.BRIEFING_FAIL_TOKENS || 1200);
  const files = ['ampcode.json', 'devex.json'];
  const rows: string[] = [];
  for (const f of files) {
    const data = loadJSON(f);
    if (!data) continue;
    const briefing = data?.instructions?.briefing as string | undefined;
    const tokens = approxTokens(briefing || '');
    const status = tokens >= fail ? 'FAIL' : tokens >= warn ? 'WARN' : 'OK';
    rows.push(`- ${f}: ${tokens} tokens → ${status}`);
  }
  if (rows.length === 0) return '_No sprint files found to compute briefing size._';
  return [`Warn≥${warn}, Fail≥${fail}`, ...rows].join('\n');
}

function buildSprintJSONBlock(): string {
  const out: string[] = [];
  const files = ['ampcode.json', 'devex.json'];
  out.push('<!-- sprint-json-begin -->');
  for (const f of files) {
    const data = loadJSON(f);
    if (!data) continue;
    const pretty = JSON.stringify(data, null, 2);
    out.push(
      [
        '',
        '<details>',
        `<summary>${f}</summary>`,
        '',
        '```json',
        pretty,
        '```',
        '</details>',
        '',
      ].join('\n'),
    );
  }
  out.push('<!-- sprint-json-end -->');
  return out.join('\n');
}

function buildMarkdown(template: RunResult, sprint: RunResult): string {
  const lines: string[] = [];
  lines.push('[Agent Hub → AGENTS.md](AGENTS.md)');
  lines.push('');
  lines.push('## 🧪 Validator Summary');
  lines.push('');
  lines.push(mdSection('Template (agent_template.json)', `Status: **${badge(template.ok)}**`));
  if (!template.ok) {
    lines.push('```');
    lines.push(template.stderr || template.stdout);
    lines.push('```');
  }
  lines.push(
    mdSection(
      'Sprints + Logs (ampcode.json/devex.json + *.log)',
      `Status: **${badge(sprint.ok)}**`,
    ),
  );
  if (!sprint.ok) {
    lines.push('```');
    lines.push(sprint.stderr || sprint.stdout);
    lines.push('```');
  }
  lines.push('');
  lines.push('_Note: This job is informational and non-gating._');
  lines.push('');
  lines.push(mdSection('Briefing Token Budgets', buildBriefingBlock()));
  lines.push('');
  lines.push('## Sprint Specs (for review)');
  lines.push(buildSprintJSONBlock());
  return lines.join('\n');
}

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pr') {
      args.pr = argv[++i];
    } else if (a === '--dry' || a === '--dry-run') {
      args.dry = true;
    } else if (a === '--out') {
      args.out = argv[++i];
    }
  }
  return args as { pr?: string; dry?: boolean; out?: string };
}

async function main() {
  const template = run('node', ['dist/scripts/validate-template.js'], true);
  const sprint = run('node', ['dist/scripts/validate-sprints.js'], true);

  const md = buildMarkdown(template, sprint);
  const { pr, dry, out } = parseArgs(process.argv);

  if (out) {
    const outPath = resolve(process.cwd(), out);
    writeFileSync(outPath, md, 'utf8');
    console.log(`[post-validator-summary] wrote ${outPath}`);
  }

  if (dry || !pr) {
    console.log(md);
    return;
  }

  const hasGh = !!run('which', ['gh']).stdout.trim();
  if (!hasGh) {
    console.error('[post-validator-summary] gh is not installed; use --dry to preview');
    process.exit(0);
  }
  const body = md + '\n\n<!-- validator-summary-marker -->';
  const update = run('gh', ['pr', 'comment', pr, '--edit-last', '-b', body]);
  if (!update.ok) {
    run('gh', ['pr', 'comment', pr, '-b', body], false);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
