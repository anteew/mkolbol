import { DigestOutput, DigestRule } from './generator.js';
import { HistoryEntry } from './fingerprint.js';

export interface Hint {
  tag: string;
  signal: string;
  suggestedCommands: string[];
}

export interface HintContext {
  digest: DigestOutput;
  rules: DigestRule[];
  history?: HistoryEntry[];
}

/**
 * Detects common triage patterns and suggests next actions.
 */
export class HintEngine {
  /**
   * Generate hints for a failed test digest.
   */
  generateHints(context: HintContext): Hint[] {
    const hints: Hint[] = [];

    const missingInclude = this.detectMissingInclude(context);
    if (missingInclude) hints.push(missingInclude);

    const redactionMismatch = this.detectRedactionMismatch(context);
    if (redactionMismatch) hints.push(redactionMismatch);

    const budgetClipped = this.detectBudgetClipped(context);
    if (budgetClipped) hints.push(budgetClipped);

    const trendHint = this.detectTrend(context);
    if (trendHint) hints.push(trendHint);

    return hints;
  }

  /**
   * Format hints as markdown for human consumption.
   */
  formatMarkdown(hints: Hint[]): string {
    if (hints.length === 0) {
      return '# Hints\n\nNo hints available.\n';
    }

    const lines: string[] = [];
    lines.push('# Triage Hints');
    lines.push('');

    for (const hint of hints) {
      lines.push(`## ${hint.tag}`);
      lines.push('');
      lines.push(`**Signal**: ${hint.signal}`);
      lines.push('');
      
      if (hint.suggestedCommands.length > 0) {
        lines.push('**Suggested Commands**:');
        lines.push('');
        for (const cmd of hint.suggestedCommands) {
          lines.push('```bash');
          lines.push(cmd);
          lines.push('```');
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Detects when expected domain events are absent from the digest window.
   */
  private detectMissingInclude(context: HintContext): Hint | null {
    const { digest, rules } = context;

    const includeRules = rules.filter(rule =>
      rule.actions.some(action => action.type === 'include')
    );

    if (includeRules.length === 0) {
      return null;
    }

    const expectedEvents = new Set<string>();
    for (const rule of includeRules) {
      if (rule.match.evt) {
        const events = Array.isArray(rule.match.evt) ? rule.match.evt : [rule.match.evt];
        events.forEach(evt => expectedEvents.add(evt));
      }
    }

    if (expectedEvents.size === 0) {
      return null;
    }

    const actualEvents = new Set(digest.events.map(e => e.evt));
    const missing = Array.from(expectedEvents).filter(evt => !actualEvents.has(evt));

    if (missing.length > 0 && digest.summary.includedEvents < digest.summary.totalEvents) {
      const missingList = missing.slice(0, 3).join(', ');
      return {
        tag: 'missing-include',
        signal: `Expected events not in digest: ${missingList}`,
        suggestedCommands: [
          `npx laminar digest ${digest.case} --expand`,
          `npx laminar tail ${digest.case} --evt "${missing[0]}"`,
        ],
      };
    }

    return null;
  }

  /**
   * Detects when a rule expects to redact patterns but redactedFields is 0.
   */
  private detectRedactionMismatch(context: HintContext): Hint | null {
    const { digest, rules } = context;

    const redactRules = rules.filter(rule =>
      rule.actions.some(action => action.type === 'redact')
    );

    if (redactRules.length === 0) {
      return null;
    }

    if (digest.summary.redactedFields === 0) {
      const patterns = redactRules
        .flatMap(rule => rule.actions.filter(a => a.type === 'redact'))
        .flatMap(action => (Array.isArray(action.field) ? action.field : [action.field]))
        .filter((f): f is string => typeof f === 'string')
        .slice(0, 2);

      const patternStr = patterns.length > 0 ? patterns.join(', ') : 'sensitive data';

      return {
        tag: 'redaction-mismatch',
        signal: `Redaction rules present (${patternStr}) but no fields redacted`,
        suggestedCommands: [
          `npx laminar tail ${digest.case} --raw`,
          `npx laminar config rules --show`,
        ],
      };
    }

    return null;
  }

  /**
   * Detects when budget/window likely clipped interesting events.
   */
  private detectBudgetClipped(context: HintContext): Hint | null {
    const { digest } = context;
    const { budgetUsed, budgetLimit, includedEvents, totalEvents } = digest.summary;

    const budgetUtilization = budgetUsed / budgetLimit;
    const inclusionRatio = includedEvents / totalEvents;

    if (budgetUtilization > 0.85 && inclusionRatio < 0.5) {
      const droppedEvents = totalEvents - includedEvents;
      return {
        tag: 'budget-clipped',
        signal: `Budget at ${(budgetUtilization * 100).toFixed(0)}%, ${droppedEvents} events dropped`,
        suggestedCommands: [
          `npx laminar config --budget-kb ${Math.ceil(budgetLimit / 1024) * 2}`,
          `npx laminar tail ${digest.case} --before-fail 20`,
        ],
      };
    }

    return null;
  }

  /**
   * Marks test as new or regressed using history ledger.
   */
  private detectTrend(context: HintContext): Hint | null {
    const { digest, history } = context;

    if (!history || history.length === 0) {
      return null;
    }

    const currentTest = history.find(h => h.testName === digest.case);
    if (!currentTest) {
      return {
        tag: 'trend/new',
        signal: 'New test failure - no history found',
        suggestedCommands: [
          `npx laminar compare --case ${digest.case}`,
          `git log -p --follow -- "${digest.location}"`,
        ],
      };
    }

    const previousRuns = history
      .filter(h => h.testName === digest.case && h.timestamp < currentTest.timestamp)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (previousRuns.length > 0) {
      const recentPasses = previousRuns.slice(0, 5).filter(h => h.status === 'pass');
      if (recentPasses.length > 0) {
        return {
          tag: 'trend/regression',
          signal: `Regression - passed ${recentPasses.length}/${Math.min(5, previousRuns.length)} recent runs`,
          suggestedCommands: [
            `npx laminar compare ${digest.case} --last-pass`,
            `git log --oneline -10 -- "${digest.location}"`,
          ],
        };
      }
    }

    return null;
  }
}
