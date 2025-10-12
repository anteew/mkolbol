import * as fs from 'node:fs';
import { DigestOutput, DigestEvent, SuspectEvent } from './generator.js';
import { CodeFrame } from './codeframe.js';

export interface DigestDiff {
  oldDigest: string;
  newDigest: string;
  summary: {
    eventsAdded: number;
    eventsRemoved: number;
    eventsChanged: number;
    suspectsChanged: boolean;
    codeframesChanged: boolean;
    durationDelta: number;
  };
  addedEvents: DigestEvent[];
  removedEvents: DigestEvent[];
  changedSuspects?: {
    added: SuspectEvent[];
    removed: SuspectEvent[];
    scoreChanged: Array<{ event: string; oldScore: number; newScore: number }>;
  };
  changedCodeframes?: {
    added: CodeFrame[];
    removed: CodeFrame[];
  };
  metadataChanges: {
    durationChanged: boolean;
    oldDuration: number;
    newDuration: number;
    locationChanged: boolean;
    oldLocation: string;
    newLocation: string;
    errorChanged: boolean;
    oldError?: string;
    newError?: string;
  };
}

export class DigestDiffEngine {
  compareDigests(oldDigest: DigestOutput, newDigest: DigestOutput): DigestDiff {
    const addedEvents = this.findAddedEvents(oldDigest.events, newDigest.events);
    const removedEvents = this.findRemovedEvents(oldDigest.events, newDigest.events);
    const changedSuspects = this.compareSuspects(oldDigest.suspects, newDigest.suspects);
    const changedCodeframes = this.compareCodeframes(oldDigest.codeframes, newDigest.codeframes);
    
    const durationDelta = newDigest.duration - oldDigest.duration;
    
    return {
      oldDigest: oldDigest.case,
      newDigest: newDigest.case,
      summary: {
        eventsAdded: addedEvents.length,
        eventsRemoved: removedEvents.length,
        eventsChanged: addedEvents.length + removedEvents.length,
        suspectsChanged: changedSuspects.added.length > 0 || changedSuspects.removed.length > 0 || changedSuspects.scoreChanged.length > 0,
        codeframesChanged: changedCodeframes.added.length > 0 || changedCodeframes.removed.length > 0,
        durationDelta,
      },
      addedEvents,
      removedEvents,
      changedSuspects,
      changedCodeframes,
      metadataChanges: {
        durationChanged: oldDigest.duration !== newDigest.duration,
        oldDuration: oldDigest.duration,
        newDuration: newDigest.duration,
        locationChanged: oldDigest.location !== newDigest.location,
        oldLocation: oldDigest.location,
        newLocation: newDigest.location,
        errorChanged: oldDigest.error !== newDigest.error,
        oldError: oldDigest.error,
        newError: newDigest.error,
      },
    };
  }

  compareFiles(oldPath: string, newPath: string): DigestDiff {
    const oldContent = fs.readFileSync(oldPath, 'utf-8');
    const newContent = fs.readFileSync(newPath, 'utf-8');
    
    const oldDigest: DigestOutput = JSON.parse(oldContent);
    const newDigest: DigestOutput = JSON.parse(newContent);
    
    return this.compareDigests(oldDigest, newDigest);
  }

  private findAddedEvents(oldEvents: DigestEvent[], newEvents: DigestEvent[]): DigestEvent[] {
    const oldEventSet = new Set(oldEvents.map(e => this.eventKey(e)));
    return newEvents.filter(e => !oldEventSet.has(this.eventKey(e)));
  }

  private findRemovedEvents(oldEvents: DigestEvent[], newEvents: DigestEvent[]): DigestEvent[] {
    const newEventSet = new Set(newEvents.map(e => this.eventKey(e)));
    return oldEvents.filter(e => !newEventSet.has(this.eventKey(e)));
  }

  private eventKey(event: DigestEvent): string {
    return `${event.ts}:${event.evt}:${event.lvl}:${event.case}`;
  }

  private compareSuspects(
    oldSuspects: SuspectEvent[] | undefined,
    newSuspects: SuspectEvent[] | undefined
  ): {
    added: SuspectEvent[];
    removed: SuspectEvent[];
    scoreChanged: Array<{ event: string; oldScore: number; newScore: number }>;
  } {
    const oldMap = new Map<string, SuspectEvent>();
    const newMap = new Map<string, SuspectEvent>();

    (oldSuspects || []).forEach(s => oldMap.set(this.eventKey(s), s));
    (newSuspects || []).forEach(s => newMap.set(this.eventKey(s), s));

    const added = (newSuspects || []).filter(s => !oldMap.has(this.eventKey(s)));
    const removed = (oldSuspects || []).filter(s => !newMap.has(this.eventKey(s)));
    
    const scoreChanged: Array<{ event: string; oldScore: number; newScore: number }> = [];
    for (const [key, oldSuspect] of oldMap) {
      const newSuspect = newMap.get(key);
      if (newSuspect && oldSuspect.score !== newSuspect.score) {
        scoreChanged.push({
          event: oldSuspect.evt,
          oldScore: oldSuspect.score,
          newScore: newSuspect.score,
        });
      }
    }

    return { added, removed, scoreChanged };
  }

  private compareCodeframes(
    oldFrames: CodeFrame[] | undefined,
    newFrames: CodeFrame[] | undefined
  ): {
    added: CodeFrame[];
    removed: CodeFrame[];
  } {
    const oldMap = new Map<string, CodeFrame>();
    const newMap = new Map<string, CodeFrame>();

    (oldFrames || []).forEach(f => oldMap.set(this.codeframeKey(f), f));
    (newFrames || []).forEach(f => newMap.set(this.codeframeKey(f), f));

    const added = (newFrames || []).filter(f => !oldMap.has(this.codeframeKey(f)));
    const removed = (oldFrames || []).filter(f => !newMap.has(this.codeframeKey(f)));

    return { added, removed };
  }

  private codeframeKey(frame: CodeFrame): string {
    return `${frame.file}:${frame.line}:${frame.column}`;
  }

  formatAsJson(diff: DigestDiff, pretty: boolean = true): string {
    return JSON.stringify(diff, null, pretty ? 2 : undefined);
  }

  formatAsMarkdown(diff: DigestDiff): string {
    const lines: string[] = [];

    lines.push(`# Digest Diff: ${diff.oldDigest} → ${diff.newDigest}`);
    lines.push('');

    lines.push('## Summary');
    lines.push(`- Events Added: ${diff.summary.eventsAdded}`);
    lines.push(`- Events Removed: ${diff.summary.eventsRemoved}`);
    lines.push(`- Events Changed: ${diff.summary.eventsChanged}`);
    lines.push(`- Suspects Changed: ${diff.summary.suspectsChanged ? 'Yes' : 'No'}`);
    lines.push(`- Codeframes Changed: ${diff.summary.codeframesChanged ? 'Yes' : 'No'}`);
    lines.push(`- Duration Delta: ${diff.summary.durationDelta > 0 ? '+' : ''}${diff.summary.durationDelta}ms`);
    lines.push('');

    if (diff.metadataChanges.durationChanged || diff.metadataChanges.locationChanged || diff.metadataChanges.errorChanged) {
      lines.push('## Metadata Changes');
      if (diff.metadataChanges.durationChanged) {
        lines.push(`- **Duration**: ${diff.metadataChanges.oldDuration}ms → ${diff.metadataChanges.newDuration}ms`);
      }
      if (diff.metadataChanges.locationChanged) {
        lines.push(`- **Location**: ${diff.metadataChanges.oldLocation} → ${diff.metadataChanges.newLocation}`);
      }
      if (diff.metadataChanges.errorChanged) {
        lines.push(`- **Error**: ${diff.metadataChanges.oldError || '(none)'} → ${diff.metadataChanges.newError || '(none)'}`);
      }
      lines.push('');
    }

    if (diff.addedEvents.length > 0) {
      lines.push('## Added Events');
      for (const evt of diff.addedEvents) {
        lines.push(`- \`${evt.evt}\` (${evt.lvl}) at ${new Date(evt.ts).toISOString()}`);
      }
      lines.push('');
    }

    if (diff.removedEvents.length > 0) {
      lines.push('## Removed Events');
      for (const evt of diff.removedEvents) {
        lines.push(`- \`${evt.evt}\` (${evt.lvl}) at ${new Date(evt.ts).toISOString()}`);
      }
      lines.push('');
    }

    if (diff.changedSuspects && (diff.changedSuspects.added.length > 0 || diff.changedSuspects.removed.length > 0 || diff.changedSuspects.scoreChanged.length > 0)) {
      lines.push('## Suspect Changes');
      
      if (diff.changedSuspects.added.length > 0) {
        lines.push('### Added Suspects');
        for (const suspect of diff.changedSuspects.added) {
          lines.push(`- \`${suspect.evt}\` (score: ${suspect.score.toFixed(1)})`);
          lines.push(`  - Reasons: ${suspect.reasons.join(', ')}`);
        }
        lines.push('');
      }

      if (diff.changedSuspects.removed.length > 0) {
        lines.push('### Removed Suspects');
        for (const suspect of diff.changedSuspects.removed) {
          lines.push(`- \`${suspect.evt}\` (score: ${suspect.score.toFixed(1)})`);
        }
        lines.push('');
      }

      if (diff.changedSuspects.scoreChanged.length > 0) {
        lines.push('### Score Changes');
        for (const change of diff.changedSuspects.scoreChanged) {
          lines.push(`- \`${change.event}\`: ${change.oldScore.toFixed(1)} → ${change.newScore.toFixed(1)}`);
        }
        lines.push('');
      }
    }

    if (diff.changedCodeframes && (diff.changedCodeframes.added.length > 0 || diff.changedCodeframes.removed.length > 0)) {
      lines.push('## Codeframe Changes');
      
      if (diff.changedCodeframes.added.length > 0) {
        lines.push('### Added Codeframes');
        for (const frame of diff.changedCodeframes.added) {
          lines.push(`- ${frame.file}:${frame.line}:${frame.column}`);
        }
        lines.push('');
      }

      if (diff.changedCodeframes.removed.length > 0) {
        lines.push('### Removed Codeframes');
        for (const frame of diff.changedCodeframes.removed) {
          lines.push(`- ${frame.file}:${frame.line}:${frame.column}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  writeDiff(diff: DigestDiff, outputPath: string, format: 'json' | 'markdown' = 'json'): void {
    let content: string;
    
    if (format === 'markdown') {
      content = this.formatAsMarkdown(diff);
    } else {
      content = this.formatAsJson(diff);
    }
    
    fs.writeFileSync(outputPath, content, 'utf-8');
  }
}

export function diffDigests(oldPath: string, newPath: string, outputPath?: string, format: 'json' | 'markdown' = 'json'): DigestDiff {
  const engine = new DigestDiffEngine();
  const diff = engine.compareFiles(oldPath, newPath);
  
  if (outputPath) {
    engine.writeDiff(diff, outputPath, format);
  }
  
  return diff;
}
