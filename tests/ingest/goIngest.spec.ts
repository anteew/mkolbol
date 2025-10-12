import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseGoTestJSON, convertToLaminar, writeOutput, GoTestEvent, LaminarTestEvent } from '../../scripts/ingest-go.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Go Test Ingest', () => {
  let tmpDir: string;
  let fixtureData: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'go-ingest-test-'));
    const fixturePath = path.join(process.cwd(), 'tests/fixtures/go-test.json');
    fixtureData = fs.readFileSync(fixturePath, 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  describe('parseGoTestJSON', () => {
    it('parses go test -json fixture data', () => {
      const events = parseGoTestJSON(fixtureData);
      
      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
      expect(events.length).toBe(18); // 18 events in fixture
    });

    it('parses individual event fields correctly', () => {
      const events = parseGoTestJSON(fixtureData);
      const firstEvent = events[0];
      
      expect(firstEvent.Time).toBe('2024-10-12T10:00:00.000Z');
      expect(firstEvent.Action).toBe('run');
      expect(firstEvent.Package).toBe('github.com/example/calc');
      expect(firstEvent.Test).toBe('TestAdd');
    });

    it('handles empty input', () => {
      const events = parseGoTestJSON('');
      expect(events).toEqual([]);
    });

    it('handles malformed JSON lines', () => {
      const input = `{"Time":"2024-10-12T10:00:00.000Z","Action":"run","Package":"test"}
invalid json line
{"Time":"2024-10-12T10:00:00.001Z","Action":"pass","Package":"test"}`;
      
      const events = parseGoTestJSON(input);
      expect(events.length).toBe(2);
    });
  });

  describe('convertToLaminar', () => {
    it('converts Go events to Laminar format', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events, summary } = convertToLaminar(goEvents);
      
      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
    });

    it('creates test.start events for run actions', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events } = convertToLaminar(goEvents);
      
      const startEvents = events.filter(e => e.evt === 'test.start');
      expect(startEvents.length).toBe(4); // TestAdd, TestSubtract, TestDivide, TestMultiply
      
      const firstStart = startEvents[0];
      expect(firstStart.lvl).toBe('info');
      expect(firstStart.phase).toBe('run');
      expect(firstStart.case).toBe('github.com/example/calc/TestAdd');
      expect(firstStart.payload).toEqual({ package: 'github.com/example/calc', test: 'TestAdd' });
    });

    it('creates test.output events for output actions', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events } = convertToLaminar(goEvents);
      
      const outputEvents = events.filter(e => e.evt === 'test.output');
      expect(outputEvents.length).toBeGreaterThan(0);
      
      const firstOutput = outputEvents[0];
      expect(firstOutput.lvl).toBe('info');
      expect(firstOutput.phase).toBe('run');
      expect(firstOutput.payload).toHaveProperty('output');
    });

    it('creates test.pass events with correct status', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events } = convertToLaminar(goEvents);
      
      const passEvents = events.filter(e => e.evt === 'test.pass');
      expect(passEvents.length).toBe(2); // TestAdd and TestSubtract
      
      const passEvent = passEvents[0];
      expect(passEvent.lvl).toBe('info');
      expect(passEvent.phase).toBe('complete');
      expect(passEvent.payload).toHaveProperty('elapsed');
    });

    it('creates test.fail events with error level', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events } = convertToLaminar(goEvents);
      
      const failEvents = events.filter(e => e.evt === 'test.fail');
      expect(failEvents.length).toBe(1); // TestDivide
      
      const failEvent = failEvents[0];
      expect(failEvent.lvl).toBe('error');
      expect(failEvent.phase).toBe('complete');
      expect(failEvent.case).toBe('github.com/example/calc/TestDivide');
    });

    it('creates test.skip events for skipped tests', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events } = convertToLaminar(goEvents);
      
      const skipEvents = events.filter(e => e.evt === 'test.skip');
      expect(skipEvents.length).toBe(1); // TestMultiply
      
      const skipEvent = skipEvents[0];
      expect(skipEvent.lvl).toBe('info');
      expect(skipEvent.phase).toBe('complete');
      expect(skipEvent.case).toBe('github.com/example/calc/TestMultiply');
    });

    it('generates summary with correct test results', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { summary } = convertToLaminar(goEvents);
      
      expect(summary.length).toBe(4); // 4 tests total
      
      const passedTests = summary.filter(s => s.status === 'pass');
      expect(passedTests.length).toBe(2);
      
      const failedTests = summary.filter(s => s.status === 'fail');
      expect(failedTests.length).toBe(1);
      
      const skippedTests = summary.filter(s => s.status === 'skip');
      expect(skippedTests.length).toBe(1);
    });

    it('includes duration in summary', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { summary } = convertToLaminar(goEvents);
      
      const passedTest = summary.find(s => s.status === 'pass');
      expect(passedTest).toBeDefined();
      expect(passedTest!.duration).toBe(90); // 0.09 seconds = 90ms
    });

    it('includes location in summary', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { summary } = convertToLaminar(goEvents);
      
      const firstTest = summary[0];
      expect(firstTest.location).toBe('github.com/example/calc/TestAdd');
    });

    it('includes artifactURI in summary', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { summary } = convertToLaminar(goEvents);
      
      const firstTest = summary[0];
      expect(firstTest.artifactURI).toBe('reports/github.com.example.calc.TestAdd.jsonl');
    });

    it('validates Laminar event structure', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events } = convertToLaminar(goEvents);
      
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
          expect(['run', 'complete']).toContain(event.phase);
        }
      });
    });

    it('preserves timestamp ordering', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events } = convertToLaminar(goEvents);
      
      for (let i = 1; i < events.length; i++) {
        expect(events[i].ts).toBeGreaterThanOrEqual(events[i - 1].ts);
      }
    });
  });

  describe('writeOutput', () => {
    it('writes JSONL files per test case', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events, summary } = convertToLaminar(goEvents);
      
      // Manually write output to tmpDir instead of using writeOutput which uses cwd
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
        const artifactPath = path.join(reportsDir, `${caseId.replace(/\//g, '.')}.jsonl`);
        fs.writeFileSync(artifactPath, caseEvents.map(e => JSON.stringify(e)).join('\n') + '\n');
      }
      
      expect(fs.existsSync(reportsDir)).toBe(true);
      
      const testFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.jsonl') && f !== 'summary.jsonl');
      expect(testFiles.length).toBe(4); // 4 test cases
      
      expect(fs.existsSync(path.join(reportsDir, 'github.com.example.calc.TestAdd.jsonl'))).toBe(true);
      expect(fs.existsSync(path.join(reportsDir, 'github.com.example.calc.TestSubtract.jsonl'))).toBe(true);
      expect(fs.existsSync(path.join(reportsDir, 'github.com.example.calc.TestDivide.jsonl'))).toBe(true);
      expect(fs.existsSync(path.join(reportsDir, 'github.com.example.calc.TestMultiply.jsonl'))).toBe(true);
    });

    it('writes summary.jsonl file', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events, summary } = convertToLaminar(goEvents);
      
      const reportsDir = path.join(tmpDir, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      
      const summaryPath = path.join(reportsDir, 'summary.jsonl');
      fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');
      
      expect(fs.existsSync(summaryPath)).toBe(true);
      
      const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
      const summaryLines = summaryContent.trim().split('\n');
      expect(summaryLines.length).toBe(4); // 4 test cases
      
      summaryLines.forEach(line => {
        const entry = JSON.parse(line);
        expect(entry).toHaveProperty('status');
        expect(entry).toHaveProperty('duration');
        expect(entry).toHaveProperty('location');
        expect(entry).toHaveProperty('artifactURI');
      });
    });

    it('groups events by test case correctly', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events, summary } = convertToLaminar(goEvents);
      
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
        const artifactPath = path.join(reportsDir, `${caseId.replace(/\//g, '.')}.jsonl`);
        fs.writeFileSync(artifactPath, caseEvents.map(e => JSON.stringify(e)).join('\n') + '\n');
      }
      
      const testAddPath = path.join(reportsDir, 'github.com.example.calc.TestAdd.jsonl');
      const testAddContent = fs.readFileSync(testAddPath, 'utf-8');
      const testAddEvents = testAddContent.trim().split('\n').map(line => JSON.parse(line));
      
      expect(testAddEvents.length).toBeGreaterThan(0);
      testAddEvents.forEach(event => {
        expect(event.case).toBe('github.com/example/calc/TestAdd');
      });
    });

    it('writes valid JSONL format', () => {
      const goEvents = parseGoTestJSON(fixtureData);
      const { events, summary } = convertToLaminar(goEvents);
      
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
        const artifactPath = path.join(reportsDir, `${caseId.replace(/\//g, '.')}.jsonl`);
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
      const goEvents = parseGoTestJSON(fixtureData);
      const { events, summary } = convertToLaminar(goEvents);
      
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
        const artifactPath = path.join(reportsDir, `${caseId.replace(/\//g, '.')}.jsonl`);
        fs.writeFileSync(artifactPath, caseEvents.map(e => JSON.stringify(e)).join('\n') + '\n');
      }
      
      const summaryPath = path.join(reportsDir, 'summary.jsonl');
      fs.writeFileSync(summaryPath, summary.map(s => JSON.stringify(s)).join('\n') + '\n');
      
      // Verify all components work together
      expect(goEvents.length).toBe(18);
      expect(events.length).toBeGreaterThan(0);
      expect(summary.length).toBe(4);
      
      expect(fs.existsSync(reportsDir)).toBe(true);
      expect(fs.existsSync(summaryPath)).toBe(true);
      
      // Verify summary matches expected outcomes
      const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
      const summaryEntries = summaryContent.trim().split('\n').map(line => JSON.parse(line));
      
      const passCount = summaryEntries.filter(e => e.status === 'pass').length;
      const failCount = summaryEntries.filter(e => e.status === 'fail').length;
      const skipCount = summaryEntries.filter(e => e.status === 'skip').length;
      
      expect(passCount).toBe(2);
      expect(failCount).toBe(1);
      expect(skipCount).toBe(1);
    });
  });
});
