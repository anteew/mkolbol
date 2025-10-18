import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
function run(cmd, args) {
    const r = spawnSync(cmd, args, { encoding: 'utf8' });
    if (r.status !== 0)
        throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
    return r.stdout;
}
function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--pr')
            args.pr = argv[++i];
        else if (a === '--out')
            args.out = argv[++i];
    }
    return args;
}
function trimAtMarker(body) {
    const marker = '<!-- sprint-json-begin -->';
    const idx = body.indexOf(marker);
    if (idx === -1)
        return body;
    return body.slice(0, idx).trim() + '\n\n' + marker + '\n<!-- trimmed for agent context -->\n';
}
function main() {
    const { pr, out } = parseArgs(process.argv);
    if (!pr)
        throw new Error('Usage: agents-hydrate --pr <NUM> [--out file]');
    const json = run('gh', ['pr', 'view', String(pr), '--comments', '--json', 'comments']);
    const data = JSON.parse(json);
    const comments = (data.comments || []);
    const candidates = comments.filter((c) => c.body && c.body.includes('validator-summary-marker'));
    if (candidates.length === 0)
        throw new Error('No validator summary comment found');
    const chosen = candidates[candidates.length - 1];
    const body = trimAtMarker(chosen.body);
    const target = out || `VEGA/rehydrate-from-pr-${pr}.md`;
    const p = resolve(process.cwd(), target);
    const dir = dirname(p);
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    writeFileSync(p, body, 'utf8');
    console.log(`[agents-hydrate] wrote ${p}`);
}
main();
//# sourceMappingURL=agents-hydrate.js.map