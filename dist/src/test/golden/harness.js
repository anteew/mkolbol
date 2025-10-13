import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
const DEFAULT_MASKS = [
    { pattern: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, replacement: '<TIMESTAMP>' },
    { pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, replacement: '<UUID>' },
    { pattern: /\d{13,}/g, replacement: '<TIMESTAMP_MS>' },
];
export class GoldenHarness {
    options;
    masks;
    constructor(options) {
        this.options = options;
        this.masks = [...DEFAULT_MASKS, ...(options.masks || [])];
    }
    applyMasks(content) {
        let masked = content;
        for (const rule of this.masks) {
            masked = masked.replace(rule.pattern, rule.replacement);
        }
        return masked;
    }
    getSnapshotPath() {
        return join('reports', this.options.suite, `${this.options.case}.snap`);
    }
    snapshot(content) {
        const masked = this.applyMasks(content);
        const snapPath = this.getSnapshotPath();
        const snapDir = dirname(snapPath);
        if (!existsSync(snapDir)) {
            mkdirSync(snapDir, { recursive: true });
        }
        writeFileSync(snapPath, masked, 'utf-8');
    }
    compare(content) {
        const masked = this.applyMasks(content);
        const snapPath = this.getSnapshotPath();
        if (!existsSync(snapPath)) {
            this.snapshot(content);
            return { match: true };
        }
        const expected = readFileSync(snapPath, 'utf-8');
        const match = expected === masked;
        return { match, expected, actual: masked };
    }
    assertSnapshot(content) {
        const result = this.compare(content);
        if (!result.match) {
            throw new Error(`Snapshot mismatch for ${this.options.suite}/${this.options.case}\n` +
                `Expected:\n${result.expected}\n\nActual:\n${result.actual}`);
        }
    }
}
export function createGoldenHarness(options) {
    return new GoldenHarness(options);
}
//# sourceMappingURL=harness.js.map