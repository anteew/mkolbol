import * as fs from 'fs';
import * as path from 'path';
export default class JSONLReporter {
    ctx;
    summaryPath = 'reports/summary.jsonl';
    summaryStream;
    processedTests = new Set();
    onInit(ctx) {
        this.ctx = ctx;
        const dir = path.dirname(this.summaryPath);
        fs.mkdirSync(dir, { recursive: true });
        if (fs.existsSync(this.summaryPath)) {
            fs.unlinkSync(this.summaryPath);
        }
        this.summaryStream = fs.createWriteStream(this.summaryPath, { flags: 'a' });
    }
    onCollected() {
        const files = this.ctx.state.getFiles();
        this.processFiles(files);
    }
    onFinished(files) {
        if (files) {
            this.processFiles(files);
        }
        if (this.summaryStream) {
            this.summaryStream.end();
        }
    }
    processFiles(files) {
        for (const file of files) {
            this.processTask(file);
        }
    }
    processTask(task) {
        if (task.type === 'test' && task.result?.state) {
            const testId = `${task.file?.filepath}:${task.name}`;
            if (!this.processedTests.has(testId)) {
                this.processedTests.add(testId);
                this.reportTest(task);
            }
        }
        if ('tasks' in task && Array.isArray(task.tasks)) {
            for (const child of task.tasks) {
                this.processTask(child);
            }
        }
    }
    reportTest(task) {
        const result = task.result;
        const state = result.state;
        if (state !== 'pass' && state !== 'fail' && state !== 'skip') {
            return;
        }
        const duration = result.duration || 0;
        const file = task.file;
        const location = file ? `${file.filepath}:${task.location?.line || 0}` : 'unknown';
        const status = state === 'pass' ? '✓' : state === 'fail' ? '✗' : '○';
        const color = state === 'pass' ? '\x1b[32m' : state === 'fail' ? '\x1b[31m' : '\x1b[33m';
        const reset = '\x1b[0m';
        console.log(`${color}${status}${reset} ${task.name} (${duration.toFixed(0)}ms)`);
        const suiteName = file ? path.basename(file.filepath, path.extname(file.filepath)) : 'unknown';
        const caseName = task.name.replace(/[^a-zA-Z0-9-_]/g, '_');
        const artifactURI = `reports/${suiteName}/${caseName}.jsonl`;
        const summary = {
            status: state,
            duration,
            location,
            artifactURI,
        };
        if (result.errors && result.errors.length > 0) {
            summary.error = result.errors.map(e => e.message || String(e)).join('; ');
        }
        if (this.summaryStream) {
            this.summaryStream.write(JSON.stringify(summary) + '\n');
        }
    }
}
//# sourceMappingURL=jsonlReporter.js.map