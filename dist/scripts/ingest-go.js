import * as fs from 'node:fs';
import * as path from 'node:path';
export function parseGoTestJSON(input) {
    return input
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    })
        .filter((e) => e !== null);
}
export function convertToLaminar(events) {
    const laminarEvents = [];
    const summary = [];
    const testCases = new Map();
    for (const evt of events) {
        const ts = evt.Time ? new Date(evt.Time).getTime() : Date.now();
        const caseId = evt.Test ? `${evt.Package}/${evt.Test}` : evt.Package;
        if (evt.Action === 'run' && evt.Test) {
            testCases.set(caseId, { start: ts, pkg: evt.Package });
            laminarEvents.push({
                ts,
                lvl: 'info',
                case: caseId,
                phase: 'run',
                evt: 'test.start',
                payload: { package: evt.Package, test: evt.Test }
            });
        }
        else if (evt.Action === 'output' && evt.Output) {
            laminarEvents.push({
                ts,
                lvl: 'info',
                case: caseId,
                phase: 'run',
                evt: 'test.output',
                payload: { output: evt.Output.trim() }
            });
        }
        else if ((evt.Action === 'pass' || evt.Action === 'fail' || evt.Action === 'skip') && evt.Test) {
            const testData = testCases.get(caseId);
            const duration = evt.Elapsed ? Math.round(evt.Elapsed * 1000) : 0;
            laminarEvents.push({
                ts,
                lvl: evt.Action === 'fail' ? 'error' : 'info',
                case: caseId,
                phase: 'complete',
                evt: `test.${evt.Action}`,
                payload: { package: evt.Package, test: evt.Test, elapsed: evt.Elapsed }
            });
            const location = `${evt.Package}/${evt.Test}`;
            const artifactURI = `reports/${location.replace(/\//g, '.')}.jsonl`;
            summary.push({
                status: evt.Action,
                duration,
                location,
                artifactURI
            });
        }
    }
    return { events: laminarEvents, summary };
}
export function writeOutput(laminarEvents, summary) {
    fs.mkdirSync('reports', { recursive: true });
    const caseGroups = new Map();
    for (const evt of laminarEvents) {
        if (evt.case) {
            if (!caseGroups.has(evt.case)) {
                caseGroups.set(evt.case, []);
            }
            caseGroups.get(evt.case).push(evt);
        }
    }
    for (const [caseId, events] of caseGroups) {
        const artifactPath = `reports/${caseId.replace(/\//g, '.')}.jsonl`;
        const dir = path.dirname(artifactPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(artifactPath, events.map(e => JSON.stringify(e)).join('\n') + '\n');
    }
    const summaryPath = 'reports/summary.jsonl';
    fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');
}
export function ingestGoTest(input) {
    const goEvents = parseGoTestJSON(input);
    const { events, summary } = convertToLaminar(goEvents);
    writeOutput(events, summary);
    console.log(`Ingested ${goEvents.length} go test events`);
    console.log(`Generated ${summary.length} test case summaries`);
    console.log(`Wrote artifacts to reports/`);
}
//# sourceMappingURL=ingest-go.js.map