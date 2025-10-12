import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parsePytestJSON, convertToLaminar, writeOutput, PytestReport, LaminarTestEvent } from '../../scripts/ingest-pytest.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Pytest Ingest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pytest-ingest-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  describe('parsePytestJSON', () => {
    it('parses simple passing test fixture', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/simple-pass.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);

      expect(report).toBeDefined();
      expect(report.tests).toBeDefined();
      expect(report.tests!.length).toBe(1);
      expect(report.summary?.passed).toBe(1);
    });

    it('parses complex multi-test fixture', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);

      expect(report).toBeDefined();
      expect(report.tests).toBeDefined();
      expect(report.tests!.length).toBe(5);
      expect(report.summary?.collected).toBe(5);
      expect(report.summary?.passed).toBe(2);
      expect(report.summary?.failed).toBe(1);
      expect(report.summary?.error).toBe(1);
      expect(report.summary?.skipped).toBe(1);
    });

    it('parses report metadata correctly', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);

      expect(report.created).toBeDefined();
      expect(report.duration).toBeDefined();
      expect(report.exitcode).toBe(1);
      expect(report.root).toBe('/path/to/project');
    });

    it('parses test node IDs correctly', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);

      const firstTest = report.tests![0];
      expect(firstTest.nodeid).toBe('test_example.py::test_success');
      expect(firstTest.lineno).toBe(5);
      expect(firstTest.outcome).toBe('passed');
    });

    it('throws error on invalid JSON', () => {
      expect(() => parsePytestJSON('invalid json')).toThrow();
    });

    it('handles empty test array', () => {
      const emptyReport = JSON.stringify({
        created: 1678886400.5,
        duration: 0,
        exitcode: 0,
        tests: []
      });
      
      const report = parsePytestJSON(emptyReport);
      expect(report.tests).toEqual([]);
    });
  });

  describe('convertToLaminar', () => {
    it('converts passing tests to Laminar format', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/simple-pass.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events, summary } = convertToLaminar(report);

      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
      expect(summary).toBeDefined();
      expect(summary.length).toBe(1);
    });

    it('creates case.begin events for test start', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/simple-pass.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      const beginEvents = events.filter(e => e.evt === 'case.begin');
      expect(beginEvents.length).toBe(1);

      const beginEvent = beginEvents[0];
      expect(beginEvent.lvl).toBe('info');
      expect(beginEvent.phase).toBe('setup');
      expect(beginEvent.case).toBe('test_simple.py::test_basic');
      expect(beginEvent.payload).toHaveProperty('nodeid');
    });

    it('creates setup events for test setup phase', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/simple-pass.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      const setupEvents = events.filter(e => e.evt === 'test.setup.passed');
      expect(setupEvents.length).toBe(1);
      
      const setupEvent = setupEvents[0];
      expect(setupEvent.lvl).toBe('info');
      expect(setupEvent.phase).toBe('setup');
      expect(setupEvent.payload).toHaveProperty('duration');
    });

    it('creates test.run and test.call.passed events for test execution', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/simple-pass.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      const runEvents = events.filter(e => e.evt === 'test.run');
      expect(runEvents.length).toBe(1);

      const callEvents = events.filter(e => e.evt === 'test.call.passed');
      expect(callEvents.length).toBe(1);
    });

    it('creates case.end events for test completion', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/simple-pass.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      const endEvents = events.filter(e => e.evt === 'case.end');
      expect(endEvents.length).toBe(1);

      const endEvent = endEvents[0];
      expect(endEvent.lvl).toBe('info');
      expect(endEvent.phase).toBe('teardown');
      expect(endEvent.payload).toHaveProperty('duration');
      expect(endEvent.payload.status).toBe('passed');
    });

    it('handles failed tests with error messages', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      const failedTest = events.filter(e => e.case === 'test_example.py::test_failure');
      expect(failedTest.length).toBeGreaterThan(0);

      const errorEvents = failedTest.filter(e => e.evt === 'test.error');
      expect(errorEvents.length).toBe(1);

      const errorEvent = errorEvents[0];
      expect(errorEvent.lvl).toBe('error');
      expect(errorEvent.phase).toBe('execution');
      expect(errorEvent.payload).toHaveProperty('message');
      expect(errorEvent.payload.message).toContain('AssertionError');
    });

    it('extracts stack traces from failed tests', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      const failedTest = events.filter(e => e.case === 'test_example.py::test_failure');
      const errorEvents = failedTest.filter(e => e.evt === 'test.error');
      
      expect(errorEvents.length).toBe(1);
      const errorEvent = errorEvents[0];
      expect(errorEvent.payload).toHaveProperty('stack');
      expect(errorEvent.payload.stack).toBeDefined();
      expect(errorEvent.payload.stack).toContain('test_example.py');
    });

    it('handles error during setup phase', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      const errorTest = events.filter(e => e.case === 'test_example.py::test_error_during_setup');
      expect(errorTest.length).toBeGreaterThan(0);

      const setupErrorEvents = errorTest.filter(e => e.evt === 'test.setup.error');
      expect(setupErrorEvents.length).toBe(1);

      const errorEvents = errorTest.filter(e => e.evt === 'test.error' && e.phase === 'setup');
      expect(errorEvents.length).toBe(1);
      expect(errorEvents[0].payload.message).toContain('NameError');
    });

    it('handles skipped tests correctly', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      const skippedTest = events.filter(e => e.case === 'test_example.py::test_skipped_test');
      expect(skippedTest.length).toBeGreaterThan(0);

      const setupEvents = skippedTest.filter(e => e.evt === 'test.setup.skipped');
      expect(setupEvents.length).toBe(1);
    });

    it('captures stdout from test execution', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      const successTest = events.filter(e => e.case === 'test_example.py::test_success');
      const outputEvents = successTest.filter(e => e.evt === 'test.output');
      
      expect(outputEvents.length).toBe(1);
      expect(outputEvents[0].payload.output).toBe('This test passed successfully.');
    });

    it('generates correct summary for all test outcomes', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { summary } = convertToLaminar(report);

      expect(summary.length).toBe(5);

      const passedTests = summary.filter(s => s.status === 'pass');
      expect(passedTests.length).toBe(2);

      const failedTests = summary.filter(s => s.status === 'fail');
      expect(failedTests.length).toBe(1);

      const errorTests = summary.filter(s => s.status === 'error');
      expect(errorTests.length).toBe(1);

      const skippedTests = summary.filter(s => s.status === 'skip');
      expect(skippedTests.length).toBe(1);
    });

    it('includes duration in summary entries', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { summary } = convertToLaminar(report);

      summary.forEach(entry => {
        expect(entry).toHaveProperty('duration');
        expect(typeof entry.duration).toBe('number');
        expect(entry.duration).toBeGreaterThanOrEqual(0);
      });
    });

    it('includes location in summary entries', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { summary } = convertToLaminar(report);

      summary.forEach(entry => {
        expect(entry).toHaveProperty('location');
        expect(typeof entry.location).toBe('string');
      });

      const firstEntry = summary[0];
      expect(firstEntry.location).toBe('test_example.py::test_success:5');
    });

    it('includes artifactURI in summary entries', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { summary } = convertToLaminar(report);

      summary.forEach(entry => {
        expect(entry).toHaveProperty('artifactURI');
        expect(entry.artifactURI).toMatch(/^reports\//);
        expect(entry.artifactURI).toMatch(/\.jsonl$/);
      });
    });

    it('validates Laminar event structure', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      events.forEach(event => {
        expect(event).toHaveProperty('ts');
        expect(event).toHaveProperty('lvl');
        expect(event).toHaveProperty('evt');
        expect(typeof event.ts).toBe('number');
        expect(typeof event.lvl).toBe('string');
        expect(typeof event.evt).toBe('string');
        
        if (event.case) {
          expect(typeof event.case).toBe('string');
        }
        if (event.phase) {
          expect(typeof event.phase).toBe('string');
          expect(['setup', 'execution', 'teardown']).toContain(event.phase);
        }
      });
    });

    it('preserves timestamp ordering', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      for (let i = 1; i < events.length; i++) {
        expect(events[i].ts).toBeGreaterThanOrEqual(events[i - 1].ts);
      }
    });

    it('handles tests without lineno', () => {
      const reportData = JSON.stringify({
        created: 1678886400.5,
        duration: 0.15,
        exitcode: 0,
        tests: [{
          nodeid: 'test_no_line.py::test_something',
          outcome: 'passed',
          setup: { duration: 0.001, outcome: 'passed' },
          call: { duration: 0.002, outcome: 'passed' },
          teardown: { duration: 0.001, outcome: 'passed' }
        }]
      });

      const report = parsePytestJSON(reportData);
      const { summary } = convertToLaminar(report);

      expect(summary[0].location).toBe('test_no_line.py::test_something');
    });

    it('handles empty report with no tests', () => {
      const emptyReport: PytestReport = {
        created: 1678886400.5,
        duration: 0,
        exitcode: 0,
        tests: []
      };

      const { events, summary } = convertToLaminar(emptyReport);

      expect(events).toEqual([]);
      expect(summary).toEqual([]);
    });
  });

  describe('writeOutput', () => {
    it('writes JSONL files per test case', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events, summary } = convertToLaminar(report);

      const reportsDir = path.join(tmpDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });

      const caseGroups = new Map<string, LaminarTestEvent[]>();
      for (const evt of events) {
        if (evt.case) {
          if (!caseGroups.has(evt.case)) {
            caseGroups.set(evt.case, []);
          }
          caseGroups.get(evt.case)!.push(evt);
        }
      }

      for (const [caseId, caseEvents] of caseGroups) {
        const artifactPath = path.join(reportsDir, `${caseId.replace(/[/:]/g, '.')}.jsonl`);
        fs.writeFileSync(artifactPath, caseEvents.map(e => JSON.stringify(e)).join('\n') + '\n');
      }

      expect(fs.existsSync(reportsDir)).toBe(true);

      const testFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.jsonl'));
      expect(testFiles.length).toBe(5);
    });

    it('writes summary.jsonl file', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events, summary } = convertToLaminar(report);

      const reportsDir = path.join(tmpDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });

      const summaryPath = path.join(reportsDir, 'summary.jsonl');
      fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');

      expect(fs.existsSync(summaryPath)).toBe(true);

      const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
      const summaryLines = summaryContent.trim().split('\n');
      expect(summaryLines.length).toBe(5);

      summaryLines.forEach(line => {
        const entry = JSON.parse(line);
        expect(entry).toHaveProperty('status');
        expect(entry).toHaveProperty('duration');
        expect(entry).toHaveProperty('location');
        expect(entry).toHaveProperty('artifactURI');
      });
    });

    it('groups events by test case correctly', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events } = convertToLaminar(report);

      const reportsDir = path.join(tmpDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });

      const caseGroups = new Map<string, LaminarTestEvent[]>();
      for (const evt of events) {
        if (evt.case) {
          if (!caseGroups.has(evt.case)) {
            caseGroups.set(evt.case, []);
          }
          caseGroups.get(evt.case)!.push(evt);
        }
      }

      for (const [caseId, caseEvents] of caseGroups) {
        const artifactPath = path.join(reportsDir, `${caseId.replace(/[/:]/g, '.')}.jsonl`);
        fs.writeFileSync(artifactPath, caseEvents.map(e => JSON.stringify(e)).join('\n') + '\n');
      }

      const testSuccessPath = path.join(reportsDir, 'test_example.py..test_success.jsonl');
      const testSuccessContent = fs.readFileSync(testSuccessPath, 'utf-8');
      const testSuccessEvents = testSuccessContent.trim().split('\n').map(line => JSON.parse(line));

      expect(testSuccessEvents.length).toBeGreaterThan(0);
      testSuccessEvents.forEach(event => {
        expect(event.case).toBe('test_example.py::test_success');
      });
    });

    it('writes valid JSONL format', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events, summary } = convertToLaminar(report);

      const reportsDir = path.join(tmpDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });

      const caseGroups = new Map<string, LaminarTestEvent[]>();
      for (const evt of events) {
        if (evt.case) {
          if (!caseGroups.has(evt.case)) {
            caseGroups.set(evt.case, []);
          }
          caseGroups.get(evt.case)!.push(evt);
        }
      }

      for (const [caseId, caseEvents] of caseGroups) {
        const artifactPath = path.join(reportsDir, `${caseId.replace(/[/:]/g, '.')}.jsonl`);
        fs.writeFileSync(artifactPath, caseEvents.map(e => JSON.stringify(e)).join('\n') + '\n');
      }

      const summaryPath = path.join(reportsDir, 'summary.jsonl');
      fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');

      const testFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.jsonl'));

      testFiles.forEach(file => {
        const content = fs.readFileSync(path.join(reportsDir, file), 'utf-8');
        const lines = content.trim().split('\n');

        lines.forEach(line => {
          expect(() => JSON.parse(line)).not.toThrow();
        });
      });
    });
  });

  describe('end-to-end integration', () => {
    it('processes fixture data from parsing to output', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/sample-report.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events, summary } = convertToLaminar(report);

      const reportsDir = path.join(tmpDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });

      const caseGroups = new Map<string, LaminarTestEvent[]>();
      for (const evt of events) {
        if (evt.case) {
          if (!caseGroups.has(evt.case)) {
            caseGroups.set(evt.case, []);
          }
          caseGroups.get(evt.case)!.push(evt);
        }
      }

      for (const [caseId, caseEvents] of caseGroups) {
        const artifactPath = path.join(reportsDir, `${caseId.replace(/[/:]/g, '.')}.jsonl`);
        fs.writeFileSync(artifactPath, caseEvents.map(e => JSON.stringify(e)).join('\n') + '\n');
      }

      const summaryPath = path.join(reportsDir, 'summary.jsonl');
      fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');

      expect(report.tests!.length).toBe(5);
      expect(events.length).toBeGreaterThan(0);
      expect(summary.length).toBe(5);

      expect(fs.existsSync(reportsDir)).toBe(true);
      expect(fs.existsSync(summaryPath)).toBe(true);

      const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
      const summaryEntries = summaryContent.trim().split('\n').map(line => JSON.parse(line));

      const passCount = summaryEntries.filter(e => e.status === 'pass').length;
      const failCount = summaryEntries.filter(e => e.status === 'fail').length;
      const errorCount = summaryEntries.filter(e => e.status === 'error').length;
      const skipCount = summaryEntries.filter(e => e.status === 'skip').length;

      expect(passCount).toBe(2);
      expect(failCount).toBe(1);
      expect(errorCount).toBe(1);
      expect(skipCount).toBe(1);
    });

    it('processes simple passing test correctly', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/pytest/simple-pass.json');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const report = parsePytestJSON(fixtureData);
      const { events, summary } = convertToLaminar(report);

      expect(report.tests!.length).toBe(1);
      expect(events.length).toBeGreaterThan(0);
      expect(summary.length).toBe(1);
      expect(summary[0].status).toBe('pass');
    });
  });
});
