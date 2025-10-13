#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
function extractTestName(artifactURI) {
    const parts = artifactURI.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace('.jsonl', '').replace(/_/g, ' ');
}
function extractTestFile(location) {
    return location.split(':')[0];
}
function main() {
    const summaryPath = join(process.cwd(), 'reports/summary.jsonl');
    if (!existsSync(summaryPath)) {
        console.log('No summary.jsonl found. Run tests first with: npm run test:ci');
        process.exit(0);
    }
    const content = readFileSync(summaryPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries = lines.map(line => JSON.parse(line));
    const failures = entries.filter(entry => entry.status === 'fail');
    if (failures.length === 0) {
        console.log('✓ All tests passed! No failures to reproduce.');
        process.exit(0);
    }
    console.log(`Found ${failures.length} failure(s):\n`);
    for (const failure of failures) {
        const testFile = extractTestFile(failure.location);
        const testName = extractTestName(failure.artifactURI);
        const artifactPath = failure.artifactURI;
        console.log(`Test: ${testName}`);
        console.log(`File: ${testFile}`);
        console.log(`Repro commands:`);
        console.log(`  vitest run --reporter=verbose --pool=threads "${testFile}" -t "${testName}"`);
        console.log(`  npm run logq -- ${artifactPath}`);
        console.log('');
    }
}
main();
//# sourceMappingURL=repro.js.map