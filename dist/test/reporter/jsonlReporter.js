import * as fs from 'fs';
import * as path from 'path';
export default class JSONLReporter {
    ctx;
    summaryPath = 'reports/summary.jsonl';
    indexPath = 'reports/index.json';
    summaryStream;
    processedTests = new Set();
    indexEntries = [];
    caseStreams = new Map();
    onInit(ctx) {
        this.ctx = ctx;
        const dir = path.dirname(this.summaryPath);
        fs.mkdirSync(dir, { recursive: true });
        if (fs.existsSync(this.summaryPath)) {
            fs.unlinkSync(this.summaryPath);
        }
        this.summaryStream = fs.createWriteStream(this.summaryPath, { flags: 'a' });
        this.indexEntries = [];
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
        // Close all per-case streams
        for (const stream of this.caseStreams.values()) {
            stream.end();
        }
        this.caseStreams.clear();
        this.generateIndex();
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
        // Write per-case JSONL file with test lifecycle events
        this.writePerCaseJSONL(artifactURI, task.name, state, duration, result.errors);
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
        const suitePath = file ? path.basename(file.filepath, path.extname(file.filepath)) : 'unknown';
        const digestPath = `reports/${suitePath}/digest.jsonl`;
        this.indexEntries.push({
            testName: task.name,
            status: state,
            duration,
            location,
            timestamp: new Date().toISOString(),
            artifacts: {
                summary: this.summaryPath,
                caseFile: artifactURI,
                digestFile: fs.existsSync(digestPath) ? digestPath : undefined,
            },
        });
    }
    writePerCaseJSONL(artifactPath, caseName, state, duration, errors) {
        const dir = path.dirname(artifactPath);
        fs.mkdirSync(dir, { recursive: true });
        // Remove existing file if it exists
        if (fs.existsSync(artifactPath)) {
            fs.unlinkSync(artifactPath);
        }
        const stream = fs.createWriteStream(artifactPath, { flags: 'a' });
        const ts = Date.now();
        // Write test lifecycle events
        // 1. Test begin event
        stream.write(JSON.stringify({
            ts,
            lvl: 'info',
            case: caseName,
            phase: 'setup',
            evt: 'case.begin'
        }) + '\n');
        // 2. Test execution event
        stream.write(JSON.stringify({
            ts: ts + 1,
            lvl: 'info',
            case: caseName,
            phase: 'execution',
            evt: 'test.run'
        }) + '\n');
        // 3. If there are errors, write error events
        if (errors && errors.length > 0) {
            errors.forEach((error, idx) => {
                stream.write(JSON.stringify({
                    ts: ts + 2 + idx,
                    lvl: 'error',
                    case: caseName,
                    phase: 'execution',
                    evt: 'test.error',
                    payload: {
                        message: error.message || String(error),
                        stack: error.stack
                    }
                }) + '\n');
            });
        }
        // 4. Test end event with result
        stream.write(JSON.stringify({
            ts: ts + 2 + (errors?.length || 0),
            lvl: state === 'fail' ? 'error' : 'info',
            case: caseName,
            phase: 'teardown',
            evt: 'case.end',
            payload: {
                duration,
                status: state === 'pass' ? 'passed' : state === 'fail' ? 'failed' : 'skipped'
            }
        }) + '\n');
        stream.end();
    }
    generateIndex() {
        const index = {
            generated: new Date().toISOString(),
            totalTests: this.indexEntries.length,
            artifacts: this.indexEntries,
        };
        fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
    }
}
//# sourceMappingURL=jsonlReporter.js.map