import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
function approxTokens(text) {
    // Simple heuristic: ~4 chars per token
    return Math.ceil((text || '').length / 4);
}
function check(file) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p))
        return null;
    const data = JSON.parse(readFileSync(p, 'utf8'));
    const briefing = data?.instructions?.briefing;
    if (!briefing)
        return {
            file,
            tokens: 0,
            status: 'ok',
            msg: '[briefing] missing (schema may enforce presence)',
        };
    const tokens = approxTokens(briefing);
    const warn = Number(process.env.BRIEFING_WARN_TOKENS || 600);
    const fail = Number(process.env.BRIEFING_FAIL_TOKENS || 1200);
    if (tokens >= fail)
        return { file, tokens, status: 'fail', msg: `exceeds FAIL threshold (${fail})` };
    if (tokens >= warn)
        return { file, tokens, status: 'warn', msg: `exceeds WARN threshold (${warn})` };
    return { file, tokens, status: 'ok', msg: 'within budget' };
}
function main() {
    const targets = ['ampcode.json', 'devex.json'];
    const results = targets
        .map(check)
        .filter((x) => x !== null);
    let hasFail = false;
    let hasWarn = false;
    for (const r of results) {
        if (r.status === 'fail')
            hasFail = true;
        if (r.status === 'warn')
            hasWarn = true;
        console.log(`[briefing-check] ${r.file}: tokens=${r.tokens} → ${r.status.toUpperCase()} (${r.msg})`);
    }
    if (hasFail) {
        console.error('[briefing-check] FAIL: briefing too large. Please prune.');
        process.exit(2);
    }
    if (hasWarn) {
        console.warn('[briefing-check] WARN: briefing approaching budget. Consider pruning.');
    }
}
main();
//# sourceMappingURL=check-briefing-size.js.map