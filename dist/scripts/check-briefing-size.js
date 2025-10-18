import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
function approxTokens(text) {
    // Simple heuristic: ~4 chars per token
    return Math.ceil((text || '').length / 4);
}
function parsePosInt(s, dflt) {
    const n = Number.parseInt(String(s ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : dflt;
}
function check(file) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p))
        return null;
    let data;
    try {
        data = JSON.parse(readFileSync(p, 'utf8'));
    }
    catch (e) {
        console.error(`[briefing-check] ERROR: failed to parse ${file}: ${e.message}`);
        process.exit(3);
    }
    const raw = data?.instructions?.briefing;
    if (raw === undefined || raw === null || raw === '')
        return {
            file,
            tokens: 0,
            status: 'ok',
            msg: '[briefing] missing (schema may enforce presence)',
        };
    if (typeof raw !== 'string') {
        return { file, tokens: 0, status: 'fail', msg: 'briefing must be a non-empty string' };
    }
    const tokens = approxTokens(raw);
    const warn = parsePosInt(process.env.BRIEFING_WARN_TOKENS, 600);
    let fail = parsePosInt(process.env.BRIEFING_FAIL_TOKENS, 1200);
    if (fail < warn)
        fail = warn;
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