import * as fs from 'node:fs';
export class DigestDiffEngine {
    compareDigests(oldDigest, newDigest) {
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
    compareFiles(oldPath, newPath) {
        const oldContent = fs.readFileSync(oldPath, 'utf-8');
        const newContent = fs.readFileSync(newPath, 'utf-8');
        const oldDigest = JSON.parse(oldContent);
        const newDigest = JSON.parse(newContent);
        return this.compareDigests(oldDigest, newDigest);
    }
    findAddedEvents(oldEvents, newEvents) {
        const oldEventSet = new Set(oldEvents.map(e => this.eventKey(e)));
        return newEvents.filter(e => !oldEventSet.has(this.eventKey(e)));
    }
    findRemovedEvents(oldEvents, newEvents) {
        const newEventSet = new Set(newEvents.map(e => this.eventKey(e)));
        return oldEvents.filter(e => !newEventSet.has(this.eventKey(e)));
    }
    eventKey(event) {
        return `${event.ts}:${event.evt}:${event.lvl}:${event.case}`;
    }
    compareSuspects(oldSuspects, newSuspects) {
        const oldMap = new Map();
        const newMap = new Map();
        (oldSuspects || []).forEach(s => oldMap.set(this.eventKey(s), s));
        (newSuspects || []).forEach(s => newMap.set(this.eventKey(s), s));
        const added = (newSuspects || []).filter(s => !oldMap.has(this.eventKey(s)));
        const removed = (oldSuspects || []).filter(s => !newMap.has(this.eventKey(s)));
        const scoreChanged = [];
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
    compareCodeframes(oldFrames, newFrames) {
        const oldMap = new Map();
        const newMap = new Map();
        (oldFrames || []).forEach(f => oldMap.set(this.codeframeKey(f), f));
        (newFrames || []).forEach(f => newMap.set(this.codeframeKey(f), f));
        const added = (newFrames || []).filter(f => !oldMap.has(this.codeframeKey(f)));
        const removed = (oldFrames || []).filter(f => !newMap.has(this.codeframeKey(f)));
        return { added, removed };
    }
    codeframeKey(frame) {
        return `${frame.file}:${frame.line}:${frame.column}`;
    }
    formatAsJson(diff, pretty = true) {
        return JSON.stringify(diff, null, pretty ? 2 : undefined);
    }
    formatAsMarkdown(diff) {
        const lines = [];
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
    writeDiff(diff, outputPath, format = 'json') {
        let content;
        if (format === 'markdown') {
            content = this.formatAsMarkdown(diff);
        }
        else {
            content = this.formatAsJson(diff);
        }
        fs.writeFileSync(outputPath, content, 'utf-8');
    }
}
export function diffDigests(oldPath, newPath, outputPath, format = 'json') {
    const engine = new DigestDiffEngine();
    const diff = engine.compareFiles(oldPath, newPath);
    if (outputPath) {
        engine.writeDiff(diff, outputPath, format);
    }
    return diff;
}
//# sourceMappingURL=diff.js.map