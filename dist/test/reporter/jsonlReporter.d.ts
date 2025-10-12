import type { File, Reporter, Vitest } from 'vitest';
export default class JSONLReporter implements Reporter {
    private ctx;
    private summaryPath;
    private indexPath;
    private summaryStream?;
    private processedTests;
    private indexEntries;
    private caseStreams;
    onInit(ctx: Vitest): void;
    onCollected(): void;
    onFinished(files?: File[]): void;
    private processFiles;
    private processTask;
    private reportTest;
    private writePerCaseJSONL;
    private generateIndex;
}
//# sourceMappingURL=jsonlReporter.d.ts.map