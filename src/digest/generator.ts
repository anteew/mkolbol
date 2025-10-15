import * as fs from 'node:fs';
import * as readline from 'node:readline';
import type { DigestConfig, DigestEvent, DigestOutput, DigestRule } from './types.js';
import { redactValue } from './redaction.js';

export { DigestConfig, DigestEvent, DigestOutput };

export class DigestGenerator {
  private config: DigestConfig;

  constructor(config: DigestConfig) {
    this.config = config;
  }

  async generateDigest(
    caseId: string,
    status: string,
    duration: number,
    location: string,
    artifactPath: string
  ): Promise<DigestOutput | null> {
    if (!this.config.enabled) {
      return null;
    }

    const allEvents = await this.loadEvents(artifactPath);
    const caseEvents = allEvents.filter(e => e.case === caseId);

    if (caseEvents.length === 0) {
      return null;
    }

    const rules = this.config.rules || [];
    const sortedRules = this.sortRulesByPriority(rules);
    
    let filteredEvents = this.applyRules(caseEvents, sortedRules);

    const shouldRedact = this.shouldApplyRedaction();
    let totalRedactedFields = 0;

    if (shouldRedact) {
      const redactionResult = this.redactEvents(filteredEvents);
      filteredEvents = redactionResult.events;
      totalRedactedFields = redactionResult.redactedCount;
    }

    const budget = this.config.budget;
    if (budget && budget.lines) {
      filteredEvents = filteredEvents.slice(0, budget.lines);
    }

    const summary = this.generateSummary(filteredEvents, totalRedactedFields);

    return {
      metadata: {
        generated: Date.now(),
        source: artifactPath,
        eventCount: allEvents.length,
        filteredCount: filteredEvents.length
      },
      events: filteredEvents,
      summary
    };
  }

  private async loadEvents(eventsPath: string): Promise<DigestEvent[]> {
    const allEvents: DigestEvent[] = [];
    
    const fileStream = fs.createReadStream(eventsPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          const event = JSON.parse(line) as DigestEvent;
          allEvents.push(event);
        } catch {
          continue;
        }
      }
    }

    return allEvents;
  }

  private sortRulesByPriority(rules: DigestRule[]): DigestRule[] {
    return [...rules].sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });
  }

  private applyRules(events: DigestEvent[], rules: DigestRule[]): DigestEvent[] {
    const included = new Set<number>();
    const excluded = new Set<number>();

    for (const rule of rules) {
      const hasIncludeAction = rule.actions.some(a => a.type === 'include');
      const hasExcludeAction = rule.actions.some(a => a.type === 'exclude');

      for (let i = 0; i < events.length; i++) {
        if (excluded.has(i)) continue;

        const event = events[i];
        if (this.matchesRule(event, rule)) {
          if (hasExcludeAction) {
            excluded.add(i);
            included.delete(i);
          } else if (hasIncludeAction) {
            if (!excluded.has(i)) {
              included.add(i);
            }

            const sliceAction = rule.actions.find(a => a.type === 'slice');
            if (sliceAction && sliceAction.window) {
              const window = sliceAction.window;
              for (let j = Math.max(0, i - window); j <= Math.min(events.length - 1, i + window); j++) {
                if (!excluded.has(j)) {
                  included.add(j);
                }
              }
            }
          }
        }
      }
    }

    if (included.size === 0) {
      return events.filter((_, i) => !excluded.has(i));
    }

    return events.filter((_, i) => included.has(i) && !excluded.has(i));
  }

  private matchesRule(event: DigestEvent, rule: DigestRule): boolean {
    const match = rule.match;

    if (match.lvl && event.lvl !== match.lvl) {
      return false;
    }

    if (match.evt) {
      if (Array.isArray(match.evt)) {
        if (!match.evt.includes(event.evt)) {
          return false;
        }
      } else {
        if (event.evt !== match.evt) {
          return false;
        }
      }
    }

    if (match.pattern) {
      const pattern = match.pattern instanceof RegExp 
        ? match.pattern 
        : new RegExp(match.pattern);
      
      const searchText = `${event.case} ${event.evt} ${event.phase || ''}`;
      if (!pattern.test(searchText)) {
        return false;
      }
    }

    return true;
  }

  private shouldApplyRedaction(): boolean {
    const redactionConfig = this.config.redaction;
    if (!redactionConfig) {
      return true;
    }

    if (redactionConfig.optOut === true) {
      return false;
    }

    if (redactionConfig.enabled === false) {
      return false;
    }

    if (redactionConfig.secrets === false) {
      return false;
    }

    return true;
  }

  private redactEvents(events: DigestEvent[]): { events: DigestEvent[]; redactedCount: number } {
    let totalRedactedCount = 0;
    const redactedEvents: DigestEvent[] = [];

    for (const event of events) {
      const redactedEvent = { ...event };
      
      if (event.payload) {
        const result = redactValue(event.payload);
        redactedEvent.payload = result.value;
        totalRedactedCount += result.redactedCount;
      }

      redactedEvents.push(redactedEvent);
    }

    return { events: redactedEvents, redactedCount: totalRedactedCount };
  }

  private generateSummary(events: DigestEvent[], redactedFields: number) {
    const byLevel: Record<DigestEvent['lvl'], number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    };
    
    const byEventType: Record<string, number> = {};

    for (const event of events) {
      byLevel[event.lvl]++;
      byEventType[event.evt] = (byEventType[event.evt] || 0) + 1;
    }

    return {
      totalEvents: events.length,
      byLevel,
      byEventType,
      redactedFields,
      includedEvents: events.length
    };
  }
}
