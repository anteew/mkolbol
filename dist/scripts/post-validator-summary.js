import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
function run(cmd, args, allowFail = true) {
    const res = spawnSync(cmd, args, { encoding: 'utf8' });
    const ok = res.status === 0;
    if (!ok && !allowFail) {
        throw new Error(`${cmd} ${args.join(' ')} failed with code ${res.status}`);
    }
    return { ok, code: res.status ?? 0, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}
function mdSection(title, body) {
    return `### ${title}\n\n${body.trim()}\n`;
}
function badge(ok) {
    return ok ? '✅ PASS' : '❌ FAIL (non-gating)';
}
function buildMarkdown(template, sprint) {
    const lines = [];
    lines.push('## 🧪 Validator Summary');
    lines.push('');
    lines.push(mdSection('Template (agent_template.json)', `Status: **${badge(template.ok)}**`));
    if (!template.ok) {
        lines.push('```');
        lines.push(template.stderr || template.stdout);
        lines.push('```');
    }
    lines.push(mdSection('Sprints + Logs (ampcode.json/devex.json + *.log)', `Status: **${badge(sprint.ok)}**`));
    if (!sprint.ok) {
        lines.push('```');
        lines.push(sprint.stderr || sprint.stdout);
        lines.push('```');
    }
    lines.push('');
    lines.push('_Note: This job is informational and non-gating._');
    return lines.join('\n');
}
function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--pr') {
            args.pr = argv[++i];
        }
        else if (a === '--dry' || a === '--dry-run') {
            args.dry = true;
        }
        else if (a === '--out') {
            args.out = argv[++i];
        }
    }
    return args;
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
//# sourceMappingURL=post-validator-summary.js.map