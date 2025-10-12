import type { File, Reporter, Vitest } from 'vitest';
export default class JSONLReporter implements Reporter {
    private ctx;
    private summaryPath;
    private summaryStream?;
    private processedTests;
    onInit(ctx: Vitest): void;
    onCollected(): void;
    onFinished(files?: File[]): void;
    private processFiles;
    private processTask;
    private reportTest;
}
//# sourceMappingURL=jsonlReporter.d.ts.map