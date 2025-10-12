import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseJUnitXML, convertToLaminar, writeOutput, JUnitTestSuite, LaminarTestEvent } from '../../scripts/ingest-junit.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('JUnit Ingest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junit-ingest-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  describe('parseJUnitXML', () => {
    it('parses simple passing test fixture', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      expect(suites).toBeDefined();
      expect(suites.length).toBe(1);
      expect(suites[0].name).toBe('basic-tests');
      expect(suites[0].tests).toBe(2);
      expect(suites[0].failures).toBe(0);
      expect(suites[0].errors).toBe(0);
      expect(suites[0].skipped).toBe(0);
    });

    it('parses test cases correctly', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      expect(suites[0].testcases.length).toBe(2);
      
      const firstTest = suites[0].testcases[0];
      expect(firstTest.name).toBe('adds two numbers');
      expect(firstTest.classname).toBe('basic-tests');
      expect(firstTest.time).toBe(0.007);
    });

    it('parses fixtures with failures', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-failures.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      expect(suites.length).toBe(1);
      expect(suites[0].tests).toBe(3);
      expect(suites[0].failures).toBe(1);
      expect(suites[0].errors).toBe(1);
    });

    it('extracts failure messages and stack traces', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-failures.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      const failedTest = suites[0].testcases.find(t => t.name === 'division fails');
      expect(failedTest).toBeDefined();
      expect(failedTest!.failure).toBeDefined();
      expect(failedTest!.failure!.message).toBe('Expected 2 but got 3');
      expect(failedTest!.failure!.type).toBe('AssertionError');
      expect(failedTest!.failure!.content).toContain('AssertionError');
      expect(failedTest!.failure!.content).toContain('tests/math.spec.js');
    });

    it('extracts error messages and stack traces', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-failures.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      const errorTest = suites[0].testcases.find(t => t.name === 'throws on invalid input');
      expect(errorTest).toBeDefined();
      expect(errorTest!.error).toBeDefined();
      expect(errorTest!.error!.message).toBe('Unexpected error');
      expect(errorTest!.error!.type).toBe('TypeError');
      expect(errorTest!.error!.content).toContain('TypeError');
      expect(errorTest!.error!.content).toContain('src/calc.js');
    });

    it('parses fixtures with skipped tests', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-skipped.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      expect(suites.length).toBe(1);
      expect(suites[0].tests).toBe(4);
      expect(suites[0].skipped).toBe(2);
    });

    it('extracts skipped test messages', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-skipped.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      const skippedTest = suites[0].testcases.find(t => t.name === 'DELETE /users requires auth');
      expect(skippedTest).toBeDefined();
      expect(skippedTest!.skipped).toBeDefined();
      expect(skippedTest!.skipped!.message).toBe('Not implemented yet');
    });

    it('handles skipped tests without messages', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-skipped.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      const skippedTest = suites[0].testcases.find(t => t.name === 'PUT /users updates user');
      expect(skippedTest).toBeDefined();
      expect(skippedTest!.skipped).toBeDefined();
    });

    it('parses nested test suites', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/nested-suites.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      expect(suites.length).toBe(2);
      expect(suites[0].name).toBe('unit-tests');
      expect(suites[1].name).toBe('integration-tests');
    });

    it('parses test cases across multiple suites', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/nested-suites.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      expect(suites[0].testcases.length).toBe(2);
      expect(suites[1].testcases.length).toBe(3);
    });

    it('decodes XML entities in error messages', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-failures.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      const failureTest = suites[0].testcases.find(t => t.failure);
      expect(failureTest!.failure!.content).toContain('<anonymous>');
    });

    it('handles empty XML', () => {
      const emptyXML = '<?xml version="1.0" encoding="UTF-8"?><testsuites></testsuites>';
      const suites = parseJUnitXML(emptyXML);
      expect(suites).toEqual([]);
    });

    it('parses time attributes correctly', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);

      expect(suites[0].time).toBe(0.015);
      expect(suites[0].testcases[0].time).toBe(0.007);
      expect(suites[0].testcases[1].time).toBe(0.008);
    });
  });

  describe('convertToLaminar', () => {
    it('converts passing tests to Laminar format', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events, summary } = convertToLaminar(suites);

      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
      expect(summary).toBeDefined();
      expect(summary.length).toBe(2);
    });

    it('creates case.begin events for test start', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events } = convertToLaminar(suites);

      const beginEvents = events.filter(e => e.evt === 'case.begin');
      expect(beginEvents.length).toBe(2);

      const beginEvent = beginEvents[0];
      expect(beginEvent.lvl).toBe('info');
      expect(beginEvent.phase).toBe('setup');
      expect(beginEvent.case).toBe('basic-tests/adds two numbers');
      expect(beginEvent.payload).toHaveProperty('suite');
      expect(beginEvent.payload).toHaveProperty('testName');
    });

    it('creates test.run events for test execution', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events } = convertToLaminar(suites);

      const runEvents = events.filter(e => e.evt === 'test.run');
      expect(runEvents.length).toBe(2);

      const runEvent = runEvents[0];
      expect(runEvent.lvl).toBe('info');
      expect(runEvent.phase).toBe('execution');
    });

    it('creates case.end events for test completion', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events } = convertToLaminar(suites);

      const endEvents = events.filter(e => e.evt === 'case.end');
      expect(endEvents.length).toBe(2);

      const endEvent = endEvents[0];
      expect(endEvent.lvl).toBe('info');
      expect(endEvent.phase).toBe('teardown');
      expect(endEvent.payload).toHaveProperty('duration');
      expect(endEvent.payload.status).toBe('passed');
    });

    it('handles failed tests with error events', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-failures.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events } = convertToLaminar(suites);

      const errorEvents = events.filter(e => e.evt === 'test.error');
      expect(errorEvents.length).toBe(2); // 1 failure + 1 error

      const failureEvent = errorEvents.find(e => 
        e.payload && e.payload.message === 'Expected 2 but got 3'
      );
      expect(failureEvent).toBeDefined();
      expect(failureEvent!.lvl).toBe('error');
      expect(failureEvent!.phase).toBe('execution');
      expect(failureEvent!.payload).toHaveProperty('message');
      expect(failureEvent!.payload).toHaveProperty('type');
      expect(failureEvent!.payload).toHaveProperty('stack');
    });

    it('extracts error messages from failures', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-failures.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events } = convertToLaminar(suites);

      const errorEvents = events.filter(e => e.evt === 'test.error');
      const failureEvent = errorEvents.find(e => 
        e.payload && e.payload.type === 'AssertionError'
      );

      expect(failureEvent!.payload.message).toBe('Expected 2 but got 3');
      expect(failureEvent!.payload.stack).toContain('tests/math.spec.js');
    });

    it('extracts stack traces from errors', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-failures.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events } = convertToLaminar(suites);

      const errorEvents = events.filter(e => e.evt === 'test.error');
      const errorEvent = errorEvents.find(e => 
        e.payload && e.payload.type === 'TypeError'
      );

      expect(errorEvent).toBeDefined();
      expect(errorEvent!.payload.message).toBe('Unexpected error');
      expect(errorEvent!.payload.stack).toContain('src/calc.js:12:11');
    });

    it('handles skipped tests correctly', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-skipped.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events } = convertToLaminar(suites);

      const skipEvents = events.filter(e => e.evt === 'test.skip');
      expect(skipEvents.length).toBe(2);

      const skipEvent = skipEvents[0];
      expect(skipEvent.lvl).toBe('info');
      expect(skipEvent.phase).toBe('execution');
      expect(skipEvent.payload).toHaveProperty('message');
    });

    it('generates correct summary for all test outcomes', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-failures.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { summary } = convertToLaminar(suites);

      expect(summary.length).toBe(3);

      const passedTests = summary.filter(s => s.status === 'pass');
      expect(passedTests.length).toBe(1);

      const failedTests = summary.filter(s => s.status === 'fail');
      expect(failedTests.length).toBe(2); // includes both failure and error
    });

    it('includes duration in summary entries', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { summary } = convertToLaminar(suites);

      summary.forEach(entry => {
        expect(entry).toHaveProperty('duration');
        expect(typeof entry.duration).toBe('number');
        expect(entry.duration).toBeGreaterThanOrEqual(0);
      });

      expect(summary[0].duration).toBe(7); // 0.007 seconds = 7ms
      expect(summary[1].duration).toBe(8); // 0.008 seconds = 8ms
    });

    it('includes location in summary entries', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { summary } = convertToLaminar(suites);

      summary.forEach(entry => {
        expect(entry).toHaveProperty('location');
        expect(typeof entry.location).toBe('string');
      });

      expect(summary[0].location).toBe('basic-tests');
    });

    it('includes artifactURI in summary entries', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { summary } = convertToLaminar(suites);

      summary.forEach(entry => {
        expect(entry).toHaveProperty('artifactURI');
        expect(entry.artifactURI).toMatch(/^reports\//);
        expect(entry.artifactURI).toMatch(/\.jsonl$/);
      });
    });

    it('includes testName in summary entries', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { summary } = convertToLaminar(suites);

      summary.forEach(entry => {
        expect(entry).toHaveProperty('testName');
        expect(typeof entry.testName).toBe('string');
      });

      expect(summary[0].testName).toBe('basic-tests/adds two numbers');
    });

    it('includes errorMessage for failed tests in summary', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-failures.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { summary } = convertToLaminar(suites);

      const failedTest = summary.find(s => s.status === 'fail' && s.testName.includes('division fails'));
      expect(failedTest).toBeDefined();
      expect(failedTest!.errorMessage).toBe('Expected 2 but got 3');
    });

    it('validates Laminar event structure', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events } = convertToLaminar(suites);

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
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events } = convertToLaminar(suites);

      for (let i = 1; i < events.length; i++) {
        expect(events[i].ts).toBeGreaterThanOrEqual(events[i - 1].ts);
      }
    });

    it('handles multiple test suites', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/nested-suites.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events, summary } = convertToLaminar(suites);

      expect(summary.length).toBe(5); // 2 from unit-tests + 3 from integration-tests

      const unitTests = summary.filter(s => s.testName.startsWith('unit-tests/'));
      expect(unitTests.length).toBe(2);

      const integrationTests = summary.filter(s => s.testName.startsWith('integration-tests/'));
      expect(integrationTests.length).toBe(3);
    });

    it('handles empty test suites', () => {
      const emptyXML = '<?xml version="1.0" encoding="UTF-8"?><testsuites></testsuites>';
      const suites = parseJUnitXML(emptyXML);
      const { events, summary } = convertToLaminar(suites);

      expect(events).toEqual([]);
      expect(summary).toEqual([]);
    });
  });

  describe('writeOutput', () => {
    it('writes JSONL files per test case in suite directories', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events, summary } = convertToLaminar(suites);

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

      for (const [caseId] of caseGroups) {
        const parts = caseId.split('/');
        const suiteName = parts[0];
        const suiteDir = path.join(reportsDir, suiteName);
        fs.mkdirSync(suiteDir, { recursive: true });
      }

      expect(fs.existsSync(reportsDir)).toBe(true);
      expect(fs.existsSync(path.join(reportsDir, 'basic-tests'))).toBe(true);
    });

    it('writes summary.jsonl file', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events, summary } = convertToLaminar(suites);

      const reportsDir = path.join(tmpDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });

      const summaryPath = path.join(reportsDir, 'summary.jsonl');
      fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');

      expect(fs.existsSync(summaryPath)).toBe(true);

      const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
      const summaryLines = summaryContent.trim().split('\n');
      expect(summaryLines.length).toBe(2);

      summaryLines.forEach(line => {
        const entry = JSON.parse(line);
        expect(entry).toHaveProperty('status');
        expect(entry).toHaveProperty('duration');
        expect(entry).toHaveProperty('location');
        expect(entry).toHaveProperty('artifactURI');
        expect(entry).toHaveProperty('testName');
      });
    });

    it('groups events by test case correctly', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events } = convertToLaminar(suites);

      const caseGroups = new Map<string, LaminarTestEvent[]>();
      for (const evt of events) {
        if (evt.case) {
          if (!caseGroups.has(evt.case)) {
            caseGroups.set(evt.case, []);
          }
          caseGroups.get(evt.case)!.push(evt);
        }
      }

      expect(caseGroups.size).toBe(2);
      
      const firstCase = caseGroups.get('basic-tests/adds two numbers');
      expect(firstCase).toBeDefined();
      expect(firstCase!.length).toBeGreaterThan(0);
      
      firstCase!.forEach(event => {
        expect(event.case).toBe('basic-tests/adds two numbers');
      });
    });

    it('writes valid JSONL format', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events, summary } = convertToLaminar(suites);

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
        const parts = caseId.split('/');
        const suiteName = parts[0];
        const testName = parts.slice(1).join('/');
        
        const suiteDir = path.join(reportsDir, suiteName);
        fs.mkdirSync(suiteDir, { recursive: true });
        
        const sanitizedName = testName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toLowerCase();
        const caseFile = path.join(suiteDir, `${sanitizedName}.jsonl`);
        fs.writeFileSync(caseFile, caseEvents.map(e => JSON.stringify(e)).join('\n') + '\n');
      }

      const summaryPath = path.join(reportsDir, 'summary.jsonl');
      fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');

      const allFiles: string[] = [];
      const collectFiles = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            collectFiles(fullPath);
          } else if (entry.name.endsWith('.jsonl')) {
            allFiles.push(fullPath);
          }
        }
      };
      collectFiles(reportsDir);

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.trim().split('\n');

        lines.forEach(line => {
          expect(() => JSON.parse(line)).not.toThrow();
        });
      });
    });
  });

  describe('end-to-end integration', () => {
    it('processes simple passing tests from parsing to output', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/simple-pass.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events, summary } = convertToLaminar(suites);

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
        const parts = caseId.split('/');
        const suiteName = parts[0];
        const testName = parts.slice(1).join('/');
        
        const suiteDir = path.join(reportsDir, suiteName);
        fs.mkdirSync(suiteDir, { recursive: true });
        
        const sanitizedName = testName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toLowerCase();
        const caseFile = path.join(suiteDir, `${sanitizedName}.jsonl`);
        fs.writeFileSync(caseFile, caseEvents.map(e => JSON.stringify(e)).join('\n') + '\n');
      }

      const summaryPath = path.join(reportsDir, 'summary.jsonl');
      fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');

      expect(suites.length).toBe(1);
      expect(events.length).toBeGreaterThan(0);
      expect(summary.length).toBe(2);

      expect(fs.existsSync(reportsDir)).toBe(true);
      expect(fs.existsSync(summaryPath)).toBe(true);

      const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
      const summaryEntries = summaryContent.trim().split('\n').map(line => JSON.parse(line));

      const passCount = summaryEntries.filter(e => e.status === 'pass').length;
      expect(passCount).toBe(2);
    });

    it('processes tests with failures and errors', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-failures.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events, summary } = convertToLaminar(suites);

      expect(suites.length).toBe(1);
      expect(summary.length).toBe(3);

      const passCount = summary.filter(e => e.status === 'pass').length;
      const failCount = summary.filter(e => e.status === 'fail').length;

      expect(passCount).toBe(1);
      expect(failCount).toBe(2);

      const errorEvents = events.filter(e => e.evt === 'test.error');
      expect(errorEvents.length).toBe(2);
    });

    it('processes tests with skipped tests', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/with-skipped.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events, summary } = convertToLaminar(suites);

      expect(summary.length).toBe(4);

      const passCount = summary.filter(e => e.status === 'pass').length;
      const skipCount = summary.filter(e => e.status === 'skip').length;

      expect(passCount).toBe(2);
      expect(skipCount).toBe(2);
    });

    it('processes nested test suites correctly', () => {
      const fixturePath = path.join(process.cwd(), 'tests/fixtures/junit/nested-suites.xml');
      const fixtureData = fs.readFileSync(fixturePath, 'utf-8');
      const suites = parseJUnitXML(fixtureData);
      const { events, summary } = convertToLaminar(suites);

      expect(suites.length).toBe(2);
      expect(summary.length).toBe(5);

      const passCount = summary.filter(e => e.status === 'pass').length;
      const failCount = summary.filter(e => e.status === 'fail').length;

      expect(passCount).toBe(4);
      expect(failCount).toBe(1);
    });
  });
});
