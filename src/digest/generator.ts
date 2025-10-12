import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DigestConfig {
  budget?: {
    kb?: number;
    lines?: number;
  };
  rules?: DigestRule[];
  enabled?: boolean;
}

export interface DigestRule {
  match: {
    evt?: string | string[];
    lvl?: string | string[];
    phase?: string | string[];
    case?: string | string[];
    path?: string | string[];
  };
  actions: DigestAction[];
  priority?: number;
}

export interface DigestAction {
  type: 'include' | 'slice' | 'redact';
  window?: number;
  field?: string | string[];
}

export interface DigestEvent {
  ts: number;
  lvl: string;
  case: string;
  phase?: string;
  evt: string;
  id?: string;
  corr?: string;
  path?: string;
  payload?: unknown;
}

export interface SuspectEvent extends DigestEvent {
  score: number;
  reasons: string[];
}

export interface DigestOutput {
  case: string;
  status: 'fail';
  duration: number;
  location: string;
  error?: string;
  summary: {
    totalEvents: number;
    includedEvents: number;
    redactedFields: number;
    budgetUsed: number;
    budgetLimit: number;
  };
  suspects?: SuspectEvent[];
  events: DigestEvent[];
}

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
const DEFAULT_CONFIG: DigestConfig = {
  budget: {
    kb: 10,
    lines: 200,
  },
  enabled: true,
  rules: [
    {
      match: { lvl: 'error' },
      actions: [{ type: 'include' }],
      priority: 10,
    },
    {
      match: { evt: 'assert.fail' },
      actions: [{ type: 'include' }, { type: 'slice', window: 10 }],
      priority: 9,
    },
  ],
};

export class DigestGenerator {
  private config: DigestConfig;

  constructor(config?: DigestConfig) {
    this.config = config || DEFAULT_CONFIG;
  }

  static loadConfig(configPath: string = 'laminar.config.json'): DigestConfig {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content);
      } catch (e) {
        console.warn(`Failed to load ${configPath}, using defaults:`, e);
      }
    }
    return DEFAULT_CONFIG;
  }

  async generateDigest(
    caseName: string,
    status: 'pass' | 'fail' | 'skip',
    duration: number,
    location: string,
    artifactURI: string,
    error?: string
  ): Promise<DigestOutput | null> {
    if (status !== 'fail') {
      return null;
    }

    if (!this.config.enabled) {
      return null;
    }

    const events = this.loadEvents(artifactURI);
    const processedEvents = this.applyRules(events);
    const budgetedEvents = this.enforceBudget(processedEvents);
    const suspects = this.identifySuspects(events);

    const budgetLimit = (this.config.budget?.kb || 10) * 1024;
    const budgetUsed = JSON.stringify(budgetedEvents).length;

    return {
      case: caseName,
      status: 'fail',
      duration,
      location,
      error,
      summary: {
        totalEvents: events.length,
        includedEvents: budgetedEvents.length,
        redactedFields: 0,
        budgetUsed,
        budgetLimit,
      },
      suspects,
      events: budgetedEvents,
    };
  }

  private loadEvents(artifactURI: string): DigestEvent[] {
    if (!fs.existsSync(artifactURI)) {
      return [];
    }

    const content = fs.readFileSync(artifactURI, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const events: DigestEvent[] = [];

    for (const line of lines) {
      try {
        events.push(JSON.parse(line));
      } catch (e) {
        console.warn('Failed to parse event:', line);
      }
    }

    return events;
  }

  private applyRules(events: DigestEvent[]): DigestEvent[] {
    if (!this.config.rules || this.config.rules.length === 0) {
      return events;
    }

    const included = new Set<number>();
    const redactedFields = new Map<number, Set<string>>();
    const rules = [...this.config.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of rules) {
      for (let i = 0; i < events.length; i++) {
        if (this.matchEvent(events[i], rule.match)) {
          for (const action of rule.actions) {
            if (action.type === 'include') {
              included.add(i);
            } else if (action.type === 'slice' && action.window) {
              const window = action.window;
              for (let j = Math.max(0, i - window); j < Math.min(events.length, i + window + 1); j++) {
                included.add(j);
              }
            } else if (action.type === 'redact' && action.field) {
              const fields = Array.isArray(action.field) ? action.field : [action.field];
              if (!redactedFields.has(i)) {
                redactedFields.set(i, new Set());
              }
              fields.forEach(f => redactedFields.get(i)!.add(f));
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
          const fieldsToRedact = redactedFields.get(idx)!;
          for (const field of fieldsToRedact) {
            if (field === 'payload' && event.payload) {
              event.payload = '[REDACTED]';
            } else if (field in event) {
              (event as any)[field] = '[REDACTED]';
            }
          }
        }
        return event;
      });

    return result;
  }

  private matchEvent(event: DigestEvent, match: DigestRule['match']): boolean {
    if (match.evt) {
      const evtMatch = Array.isArray(match.evt) ? match.evt : [match.evt];
      if (!this.matchPattern(event.evt, evtMatch)) return false;
    }

    if (match.lvl) {
      const lvlMatch = Array.isArray(match.lvl) ? match.lvl : [match.lvl];
      if (!this.matchPattern(event.lvl, lvlMatch)) return false;
    }

    if (match.phase) {
      const phaseMatch = Array.isArray(match.phase) ? match.phase : [match.phase];
      if (!event.phase || !this.matchPattern(event.phase, phaseMatch)) return false;
    }

    if (match.case) {
      const caseMatch = Array.isArray(match.case) ? match.case : [match.case];
      if (!this.matchPattern(event.case, caseMatch)) return false;
    }

    if (match.path) {
      const pathMatch = Array.isArray(match.path) ? match.path : [match.path];
      if (!event.path || !this.matchPattern(event.path, pathMatch)) return false;
    }

    return true;
  }

  private matchPattern(value: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(value);
      }
      return value === pattern;
    });
  }

  private enforceBudget(events: DigestEvent[]): DigestEvent[] {
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

  private identifySuspects(events: DigestEvent[]): SuspectEvent[] {
    if (events.length === 0) {
      return [];
    }

    const failureEvents = events.filter(e => e.lvl === 'error' || e.evt.includes('fail'));
    if (failureEvents.length === 0) {
      return [];
    }

    const lastFailureTime = Math.max(...failureEvents.map(e => e.ts));
    const failureCorrelations = new Set(failureEvents.filter(e => e.corr).map(e => e.corr!));

    const scoredEvents: SuspectEvent[] = events.map(event => {
      const score = this.calculateSuspectScore(event, events, lastFailureTime, failureCorrelations);
      const reasons: string[] = [];

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

  private calculateSuspectScore(
    event: DigestEvent,
    allEvents: DigestEvent[],
    failureTime: number,
    failureCorrelations: Set<string>
  ): number {
    let score = 0;

    if (event.lvl === 'error') {
      score += 50;
    } else if (event.lvl === 'warn') {
      score += 20;
    }

    const timeDiff = Math.abs(event.ts - failureTime);
    const proximityScore = Math.max(0, 30 - (timeDiff / 1000) * 10);
    score += proximityScore;

    if (event.corr && failureCorrelations.has(event.corr)) {
      score += 40;
    }

    const similarEvents = allEvents.filter(e => 
      e.evt === event.evt && Math.abs(e.ts - event.ts) < 5000
    );
    if (similarEvents.length > 3) {
      score += Math.min(20, similarEvents.length * 2);
    }

    return score;
  }

  async writeDigest(digest: DigestOutput, outputDir: string = 'reports'): Promise<void> {
    const digestJsonPath = path.join(outputDir, `${digest.case}.digest.json`);
    const digestMdPath = path.join(outputDir, `${digest.case}.digest.md`);

    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(digestJsonPath, JSON.stringify(digest, null, 2));

    const md = this.formatMarkdown(digest);
    fs.writeFileSync(digestMdPath, md);
  }

  private formatMarkdown(digest: DigestOutput): string {
    const lines: string[] = [];

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

export async function generateAllDigests(configPath?: string): Promise<number> {
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
        const digest = await generator.generateDigest(
          caseName,
          entry.status,
          entry.duration,
          entry.location,
          entry.artifactURI,
          entry.error
        );

        if (digest) {
          const outputDir = path.dirname(entry.artifactURI);
          await generator.writeDigest(digest, outputDir);
          console.log(`✓ Generated digest for ${caseName}`);
          count++;
        }
      }
    } catch (e) {
      console.warn('Failed to process entry:', line, e);
    }
  }

  return count;
}

export async function generateDigestsForCases(cases: string[], configPath?: string): Promise<number> {
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
        const digest = await generator.generateDigest(
          caseName,
          entry.status,
          entry.duration,
          entry.location,
          entry.artifactURI,
          entry.error
        );

        if (digest) {
          const outputDir = path.dirname(entry.artifactURI);
          await generator.writeDigest(digest, outputDir);
          console.log(`✓ Generated digest for ${caseName}`);
          count++;
        }
      }
    } catch (e) {
      console.warn('Failed to process entry:', line, e);
    }
  }

  return count;
}
