import * as fs from 'fs';
import * as path from 'path';
import { createEvent } from './TestEvent.js';
export class TestLogger {
    suite;
    caseName;
    outputPath;
    stream;
    constructor(suite, caseName) {
        this.suite = suite;
        this.caseName = caseName;
        this.outputPath = path.join('reports', suite, `${caseName}.jsonl`);
    }
    ensureStream() {
        if (!this.stream) {
            const dir = path.dirname(this.outputPath);
            fs.mkdirSync(dir, { recursive: true });
            this.stream = fs.createWriteStream(this.outputPath, { flags: 'a' });
        }
        return this.stream;
    }
    beginCase(phase) {
        const event = createEvent('case.begin', this.caseName, { phase });
        this.writeEvent(event);
    }
    endCase(phase, payload) {
        const event = createEvent('case.end', this.caseName, { phase, payload });
        this.writeEvent(event);
    }
    emit(evt, options = {}) {
        const event = createEvent(evt, this.caseName, options);
        this.writeEvent(event);
    }
    writeEvent(event) {
        const stream = this.ensureStream();
        stream.write(JSON.stringify(event) + '\n');
    }
    close() {
        if (this.stream) {
            this.stream.end();
            this.stream = undefined;
        }
    }
}
export function createLogger(suite, caseName) {
    return new TestLogger(suite, caseName);
}
//# sourceMappingURL=logger.js.map