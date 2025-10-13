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
        scoreChanged: Array<{
            event: string;
            oldScore: number;
            newScore: number;
        }>;
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
export declare class DigestDiffEngine {
    compareDigests(oldDigest: DigestOutput, newDigest: DigestOutput): DigestDiff;
    compareFiles(oldPath: string, newPath: string): DigestDiff;
    private findAddedEvents;
    private findRemovedEvents;
    private eventKey;
    private compareSuspects;
    private compareCodeframes;
    private codeframeKey;
    formatAsJson(diff: DigestDiff, pretty?: boolean): string;
    formatAsMarkdown(diff: DigestDiff): string;
    writeDiff(diff: DigestDiff, outputPath: string, format?: 'json' | 'markdown'): void;
}
export declare function diffDigests(oldPath: string, newPath: string, outputPath?: string, format?: 'json' | 'markdown'): DigestDiff;
//# sourceMappingURL=diff.d.ts.map