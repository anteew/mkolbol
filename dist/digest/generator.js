import * as fs from 'node:fs';
import * as path from 'node:path';
import { CodeFrameExtractor } from './codeframe.js';
import { HintEngine } from './hints.js';
/**
 * Default digest configuration.
 *
 * These rules work with both native Vitest events and ingested test data
 * from external sources (e.g., Go test via `laminar:ingest go`).
 *
 * The rules match:
 * - Any event with lvl='error' (includes Go test.fail events)
 * - Any event name containing 'fail' (includes assert.fail, test.fail, etc.)
 */
const DEFAULT_CONFIG = {
    budget: {
        kb: 10,
        lines: 200,
    },
    enabled: true,
    rules: [
        {
            match: { lvl: 'error' },
            actions: [{ type: 'include' }, { type: 'codeframe', contextLines: 2 }],
            priority: 10,
        },
        {
            match: { evt: 'assert.fail' },
            actions: [{ type: 'include' }, { type: 'slice', window: 10 }, { type: 'codeframe', contextLines: 2 }],
            priority: 9,
        },
    ],
};
export class DigestGenerator {
    config;
    overlayRules = [];
    codeframeExtractor;
    hintEngine;
    constructor(config) {
        this.config = config || DEFAULT_CONFIG;
        this.codeframeExtractor = new CodeFrameExtractor(2);
        this.hintEngine = new HintEngine();
    }
    setOverlayRules(rules) {
        this.overlayRules = rules;
    }
    clearOverlayRules() {
        this.overlayRules = [];
    }
    getOverlayRules() {
        return [...this.overlayRules];
    }
    static loadConfig(configPath = 'laminar.config.json') {
        if (fs.existsSync(configPath)) {
            try {
                const content = fs.readFileSync(configPath, 'utf-8');
                return JSON.parse(content);
            }
            catch (e) {
                console.warn(`Failed to load ${configPath}, using defaults:`, e);
            }
        }
        return DEFAULT_CONFIG;
    }
    async generateDigest(caseName, status, duration, location, artifactURI, error) {
        if (status !== 'fail') {
            return null;
        }
        if (!this.config.enabled) {
            return null;
        }
        const events = this.loadEvents(artifactURI);
        const processedEvents = this.applyRules(events);
        const { events: redactedEvents, count: redactedCount } = this.applySecretRedactions(processedEvents);
        const budgetedEvents = this.enforceBudget(redactedEvents);
        const suspects = this.identifySuspects(events);
        const codeframes = this.extractCodeFrames(events);
        const budgetLimit = (this.config.budget?.kb || 10) * 1024;
        let budgetUsed = JSON.stringify(budgetedEvents).length;
        if (codeframes && codeframes.length > 0) {
            budgetUsed += JSON.stringify(codeframes).length;
        }
        const digest = {
            case: caseName,
            status: 'fail',
            duration,
            location,
            error,
            summary: {
                totalEvents: events.length,
                includedEvents: budgetedEvents.length,
                redactedFields: redactedCount,
                budgetUsed,
                budgetLimit,
            },
            suspects,
            codeframes: codeframes && codeframes.length > 0 ? codeframes : undefined,
            events: budgetedEvents,
        };
        const hints = this.hintEngine.generateHints({
            digest,
            rules: [...(this.config.rules || []), ...this.overlayRules],
        });
        if (hints.length > 0) {
            digest.hints = hints;
        }
        return digest;
    }
    loadEvents(artifactURI) {
        if (!fs.existsSync(artifactURI)) {
            return [];
        }
        const content = fs.readFileSync(artifactURI, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const events = [];
        for (const line of lines) {
            try {
                events.push(JSON.parse(line));
            }
            catch (e) {
                console.warn('Failed to parse event:', line);
            }
        }
        return events;
    }
    applyRules(events) {
        const baseRules = this.config.rules || [];
        const mergedRules = [...baseRules, ...this.overlayRules];
        if (mergedRules.length === 0) {
            return events;
        }
        const included = new Set();
        const redactedFields = new Map();
        const rules = mergedRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        for (const rule of rules) {
            for (let i = 0; i < events.length; i++) {
                if (this.matchEvent(events[i], rule.match)) {
                    for (const action of rule.actions) {
                        if (action.type === 'include') {
                            included.add(i);
                        }
                        else if (action.type === 'slice' && action.window) {
                            const window = action.window;
                            for (let j = Math.max(0, i - window); j < Math.min(events.length, i + window + 1); j++) {
                                included.add(j);
                            }
                        }
                        else if (action.type === 'redact' && action.field) {
                            const fields = Array.isArray(action.field) ? action.field : [action.field];
                            if (!redactedFields.has(i)) {
                                redactedFields.set(i, new Set());
                            }
                            fields.forEach(f => redactedFields.get(i).add(f));
                        }
                    }
                }
            }
        }
        if (included.size === 0) {
            return events;
        }
        const result = Array.from(included)
            .sort((a, b) => a - b)
            .map(idx => {
            const event = { ...events[idx] };
            if (redactedFields.has(idx)) {
                const fieldsToRedact = redactedFields.get(idx);
                for (const field of fieldsToRedact) {
                    if (field === 'payload' && event.payload) {
                        event.payload = '[REDACTED]';
                    }
                    else if (field in event) {
                        event[field] = '[REDACTED]';
                    }
                }
            }
            return event;
        });
        return result;
    }
    // Apply built-in secret redaction patterns to included events, unless disabled via config
    applySecretRedactions(events) {
        const redaction = this.config.redaction || {};
        if (redaction.optOut === true || redaction.enabled === false || redaction.secrets === false) {
            return { events, count: 0 };
        }
        let total = 0;
        const redactValue = (val) => {
            if (typeof val === 'string') {
                // Private key (replace entire value)
                if (val.includes('-----BEGIN RSA PRIVATE KEY-----')) {
                    return { value: '[REDACTED:private-key]', count: 1 };
                }
                let out = val;
                let count = 0;
                // JWT tokens
                const jwtRe = /\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\b/g;
                out = out.replace(jwtRe, () => { count++; return '[REDACTED:jwt]'; });
                // AWS access key
                const awsKeyRe = /\bAKIA[0-9A-Z]{16}\b/g;
                out = out.replace(awsKeyRe, () => { count++; return '[REDACTED:aws-key]'; });
                // AWS secret in common config line
                const awsSecretLineRe = /(aws_secret_access_key\s*=\s*)([^\s]+)/g;
                out = out.replace(awsSecretLineRe, (_, p1) => { count++; return p1 + '[REDACTED:aws-secret]'; });
                // API keys (sanitized prefix to avoid push protection)
                const apiKeyRe = /\bzz_(?:live|test)_[A-Za-z0-9]{16,}\b/g;
                out = out.replace(apiKeyRe, () => { count++; return '[REDACTED:api-key]'; });
                // URL credentials: scheme://user:pass@host → scheme://[REDACTED:url-creds]@host
                const urlCredsRe = /(\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/)([^:\/@\s]+):([^@\s]+)@/g;
                out = out.replace(urlCredsRe, (_, p1) => { count++; return p1 + '[REDACTED:url-creds]@'; });
                return { value: out, count };
            }
            if (Array.isArray(val)) {
                let totalCount = 0;
                const arr = val.map(v => { const r = redactValue(v); totalCount += r.count; return r.value; });
                return { value: arr, count: totalCount };
            }
            if (val && typeof val === 'object') {
                let totalCount = 0;
                const obj = Array.isArray(val) ? [] : { ...val };
                for (const k of Object.keys(val)) {
                    const r = redactValue(val[k]);
                    obj[k] = r.value;
                    totalCount += r.count;
                }
                return { value: obj, count: totalCount };
            }
            return { value: val, count: 0 };
        };
        const transformed = events.map(e => {
            if (e.payload !== undefined) {
                const r = redactValue(e.payload);
                total += r.count;
                return { ...e, payload: r.value };
            }
            return e;
        });
        return { events: transformed, count: total };
    }
    matchEvent(event, match) {
        if (match.evt) {
            const evtMatch = Array.isArray(match.evt) ? match.evt : [match.evt];
            if (!this.matchPattern(event.evt, evtMatch))
                return false;
        }
        if (match.lvl) {
            const lvlMatch = Array.isArray(match.lvl) ? match.lvl : [match.lvl];
            if (!this.matchPattern(event.lvl, lvlMatch))
                return false;
        }
        if (match.phase) {
            const phaseMatch = Array.isArray(match.phase) ? match.phase : [match.phase];
            if (!event.phase || !this.matchPattern(event.phase, phaseMatch))
                return false;
        }
        if (match.case) {
            const caseMatch = Array.isArray(match.case) ? match.case : [match.case];
            if (!this.matchPattern(event.case, caseMatch))
                return false;
        }
        if (match.path) {
            const pathMatch = Array.isArray(match.path) ? match.path : [match.path];
            if (!event.path || !this.matchPattern(event.path, pathMatch))
                return false;
        }
        return true;
    }
    matchPattern(value, patterns) {
        return patterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(value);
            }
            return value === pattern;
        });
    }
    enforceBudget(events) {
        const budgetKb = this.config.budget?.kb || 10;
        const budgetLines = this.config.budget?.lines || 200;
        const budgetBytes = budgetKb * 1024;
        if (events.length <= budgetLines) {
            const size = JSON.stringify(events).length;
            if (size <= budgetBytes) {
                return events;
            }
        }
        let currentEvents = events.slice(0, Math.min(events.length, budgetLines));
        while (currentEvents.length > 0) {
            const size = JSON.stringify(currentEvents).length;
            if (size <= budgetBytes) {
                break;
            }
            currentEvents = currentEvents.slice(0, currentEvents.length - 1);
        }
        return currentEvents;
    }
    extractCodeFrames(events) {
        if (!this.config.rules) {
            return [];
        }
        const shouldExtractCodeframes = this.config.rules.some(rule => rule.actions.some(action => action.type === 'codeframe'));
        if (!shouldExtractCodeframes) {
            return [];
        }
        const codeframes = [];
        const errorEvents = events.filter(e => e.lvl === 'error' &&
            e.payload &&
            typeof e.payload === 'object' &&
            'stack' in e.payload);
        for (const event of errorEvents) {
            const payload = event.payload;
            if (payload.stack) {
                const frames = this.codeframeExtractor.extractFromStack(payload.stack);
                codeframes.push(...frames);
                if (codeframes.length >= 5) {
                    break;
                }
            }
        }
        return codeframes.slice(0, 5);
    }
    identifySuspects(events) {
        if (events.length === 0) {
            return [];
        }
        const failureEvents = events.filter(e => e.lvl === 'error' || e.evt.includes('fail'));
        if (failureEvents.length === 0) {
            return [];
        }
        const lastFailureTime = Math.max(...failureEvents.map(e => e.ts));
        const failureCorrelations = new Set(failureEvents.filter(e => e.corr).map(e => e.corr));
        const scoredEvents = events.map(event => {
            const score = this.calculateSuspectScore(event, events, lastFailureTime, failureCorrelations);
            const reasons = [];
            if (event.lvl === 'error') {
                reasons.push('error level');
            }
            if (event.evt.includes('fail')) {
                reasons.push('failure event');
            }
            if (event.corr && failureCorrelations.has(event.corr)) {
                reasons.push('correlated with failure');
            }
            if (Math.abs(event.ts - lastFailureTime) < 1000) {
                reasons.push('close proximity to failure');
            }
            return { ...event, score, reasons };
        });
        return scoredEvents
            .filter(e => e.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    }
    calculateSuspectScore(event, allEvents, failureTime, failureCorrelations) {
        let score = 0;
        if (event.lvl === 'error') {
            score += 50;
        }
        else if (event.lvl === 'warn') {
            score += 20;
        }
        const timeDiff = Math.abs(event.ts - failureTime);
        const proximityScore = Math.max(0, 30 - (timeDiff / 1000) * 10);
        score += proximityScore;
        if (event.corr && failureCorrelations.has(event.corr)) {
            score += 40;
        }
        const similarEvents = allEvents.filter(e => e.evt === event.evt && Math.abs(e.ts - event.ts) < 5000);
        if (similarEvents.length > 3) {
            score += Math.min(20, similarEvents.length * 2);
        }
        return score;
    }
    async writeDigest(digest, outputDir = 'reports') {
        const digestJsonPath = path.join(outputDir, `${digest.case}.digest.json`);
        const digestMdPath = path.join(outputDir, `${digest.case}.digest.md`);
        const hintsJsonPath = path.join(outputDir, `${digest.case}.hints.json`);
        const hintsMdPath = path.join(outputDir, `${digest.case}.hints.md`);
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(digestJsonPath, JSON.stringify(digest, null, 2));
        const md = this.formatMarkdown(digest);
        fs.writeFileSync(digestMdPath, md);
        if (digest.hints && digest.hints.length > 0) {
            fs.writeFileSync(hintsJsonPath, JSON.stringify(digest.hints, null, 2));
            const hintsMd = this.hintEngine.formatMarkdown(digest.hints);
            fs.writeFileSync(hintsMdPath, hintsMd);
        }
    }
    formatMarkdown(digest) {
        const lines = [];
        lines.push(`# Digest: ${digest.case}`);
        lines.push('');
        lines.push(`**Status**: ${digest.status}`);
        lines.push(`**Duration**: ${digest.duration}ms`);
        lines.push(`**Location**: ${digest.location}`);
        if (digest.error) {
            lines.push(`**Error**: ${digest.error}`);
        }
        lines.push('');
        lines.push('## Summary');
        lines.push(`- Total Events: ${digest.summary.totalEvents}`);
        lines.push(`- Included Events: ${digest.summary.includedEvents}`);
        lines.push(`- Budget Used: ${digest.summary.budgetUsed} / ${digest.summary.budgetLimit} bytes`);
        lines.push('');
        if (digest.hints && digest.hints.length > 0) {
            lines.push('## Hints');
            for (const hint of digest.hints) {
                lines.push(`### ${hint.tag}`);
                lines.push(`**Signal**: ${hint.signal}`);
                lines.push('');
                lines.push('**Suggested Commands**:');
                for (const cmd of hint.suggestedCommands) {
                    lines.push(`\`\`\`bash`);
                    lines.push(cmd);
                    lines.push(`\`\`\``);
                }
                lines.push('');
            }
        }
        if (digest.suspects && digest.suspects.length > 0) {
            lines.push('## Suspects');
            for (const suspect of digest.suspects) {
                lines.push(`- **Score: ${suspect.score.toFixed(1)}** - ${suspect.evt} (${suspect.lvl})`);
                lines.push(`  - Reasons: ${suspect.reasons.join(', ')}`);
                lines.push(`  - Time: ${new Date(suspect.ts).toISOString()}`);
                if (suspect.corr) {
                    lines.push(`  - Correlation: ${suspect.corr}`);
                }
            }
            lines.push('');
        }
        if (digest.codeframes && digest.codeframes.length > 0) {
            lines.push('## Code Frames');
            for (const frame of digest.codeframes) {
                lines.push('```');
                lines.push(this.codeframeExtractor.formatCodeFrame(frame));
                lines.push('```');
                lines.push('');
            }
        }
        if (digest.events.length > 0) {
            lines.push('## Events');
            lines.push('```json');
            for (const evt of digest.events) {
                lines.push(JSON.stringify(evt));
            }
            lines.push('```');
        }
        return lines.join('\n');
    }
}
export async function generateAllDigests(configPath) {
    const summaryPath = 'reports/summary.jsonl';
    if (!fs.existsSync(summaryPath)) {
        console.log('No summary.jsonl found');
        return 0;
    }
    const config = DigestGenerator.loadConfig(configPath);
    const generator = new DigestGenerator(config);
    const content = fs.readFileSync(summaryPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    let count = 0;
    for (const line of lines) {
        try {
            const entry = JSON.parse(line);
            if (entry.status === 'fail' && entry.artifactURI) {
                const caseName = path.basename(entry.artifactURI, '.jsonl');
                const digest = await generator.generateDigest(caseName, entry.status, entry.duration, entry.location, entry.artifactURI, entry.error);
                if (digest) {
                    const outputDir = path.dirname(entry.artifactURI);
                    await generator.writeDigest(digest, outputDir);
                    console.log(`✓ Generated digest for ${caseName}`);
                    count++;
                }
            }
        }
        catch (e) {
            console.warn('Failed to process entry:', line, e);
        }
    }
    return count;
}
export async function generateDigestsForCases(cases, configPath) {
    const summaryPath = 'reports/summary.jsonl';
    if (!fs.existsSync(summaryPath)) {
        console.log('No summary.jsonl found');
        return 0;
    }
    const config = DigestGenerator.loadConfig(configPath);
    const generator = new DigestGenerator(config);
    const content = fs.readFileSync(summaryPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const caseSet = new Set(cases);
    let count = 0;
    for (const line of lines) {
        try {
            const entry = JSON.parse(line);
            const caseName = entry.artifactURI ? path.basename(entry.artifactURI, '.jsonl') : '';
            if (caseSet.has(caseName) && entry.status === 'fail' && entry.artifactURI) {
                const digest = await generator.generateDigest(caseName, entry.status, entry.duration, entry.location, entry.artifactURI, entry.error);
                if (digest) {
                    const outputDir = path.dirname(entry.artifactURI);
                    await generator.writeDigest(digest, outputDir);
                    console.log(`✓ Generated digest for ${caseName}`);
                    count++;
                }
            }
        }
        catch (e) {
            console.warn('Failed to process entry:', line, e);
        }
    }
    return count;
}
//# sourceMappingURL=generator.js.map