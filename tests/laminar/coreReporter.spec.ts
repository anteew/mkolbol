import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const REPORTS_DIR = 'reports';
const INDEX_PATH = path.join(REPORTS_DIR, 'index.json');
const SUMMARY_PATH = path.join(REPORTS_DIR, 'summary.jsonl');

interface ArtifactIndexEntry {
  testName: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  location: string;
  timestamp: string;
  artifacts: {
    summary: string;
    caseFile?: string;
    digestFile?: string;
  };
}

interface ArtifactIndex {
  generated: string;
  totalTests: number;
  artifacts: ArtifactIndexEntry[];
}

describe('Laminar Core Reporter - Per-case JSONL and Index', () => {
  let indexData: ArtifactIndex;

  beforeAll(() => {
    expect(fs.existsSync(INDEX_PATH), 'index.json should exist').toBe(true);
    const indexContent = fs.readFileSync(INDEX_PATH, 'utf-8');
    indexData = JSON.parse(indexContent);
  });

  describe('index.json generation', () => {
    it('should generate index.json with valid structure', () => {
      expect(indexData).toBeDefined();
      expect(indexData.generated).toBeDefined();
      expect(indexData.totalTests).toBeGreaterThan(0);
      expect(Array.isArray(indexData.artifacts)).toBe(true);
    });

    it('should have valid timestamp format', () => {
      const timestamp = new Date(indexData.generated);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('should have totalTests matching artifacts length', () => {
      expect(indexData.totalTests).toBe(indexData.artifacts.length);
    });

    it('should have at least one artifact entry', () => {
      expect(indexData.artifacts.length).toBeGreaterThan(0);
    });
  });

  describe('index.json artifact entries', () => {
    it('should have valid structure for each artifact entry', () => {
      indexData.artifacts.forEach((entry, idx) => {
        expect(entry.testName, `artifact[${idx}].testName`).toBeDefined();
        expect(entry.status, `artifact[${idx}].status`).toMatch(/^(pass|fail|skip)$/);
        expect(typeof entry.duration, `artifact[${idx}].duration type`).toBe('number');
        expect(entry.location, `artifact[${idx}].location`).toBeDefined();
        expect(entry.timestamp, `artifact[${idx}].timestamp`).toBeDefined();
        expect(entry.artifacts, `artifact[${idx}].artifacts`).toBeDefined();
      });
    });

    it('should have valid timestamps for each entry', () => {
      indexData.artifacts.forEach((entry, idx) => {
        const timestamp = new Date(entry.timestamp);
        expect(timestamp.toString(), `artifact[${idx}] timestamp`).not.toBe('Invalid Date');
      });
    });

    it('should reference summary.jsonl in artifacts', () => {
      indexData.artifacts.forEach((entry, idx) => {
        expect(entry.artifacts.summary, `artifact[${idx}].artifacts.summary`).toBe('reports/summary.jsonl');
      });
    });

    it('should have caseFile path for each entry', () => {
      indexData.artifacts.forEach((entry, idx) => {
        expect(entry.artifacts.caseFile, `artifact[${idx}].artifacts.caseFile`).toBeDefined();
        expect(entry.artifacts.caseFile, `artifact[${idx}].artifacts.caseFile`).toMatch(/^reports\/.+\.jsonl$/);
      });
    });

    it('should have valid location paths', () => {
      indexData.artifacts.forEach((entry, idx) => {
        expect(entry.location, `artifact[${idx}].location`).toMatch(/\.ts:\d+$/);
      });
    });
  });

  describe('per-case JSONL files existence', () => {
    it('should create JSONL file for each test case', () => {
      indexData.artifacts.forEach((entry) => {
        if (entry.artifacts.caseFile) {
          const caseFilePath = path.join(entry.artifacts.caseFile);
          expect(
            fs.existsSync(caseFilePath),
            `Case file should exist: ${caseFilePath}`
          ).toBe(true);
        }
      });
    });

    it('should organize case files in suite directories', () => {
      indexData.artifacts.forEach((entry) => {
        if (entry.artifacts.caseFile) {
          const parts = entry.artifacts.caseFile.split('/');
          expect(parts.length, `${entry.artifacts.caseFile} should have suite directory`).toBeGreaterThanOrEqual(3);
          expect(parts[0]).toBe('reports');
          expect(parts[1]).toMatch(/\.(spec|test)$/);
        }
      });
    });
  });

  describe('per-case JSONL file structure', () => {
    it('should contain valid JSONL format', () => {
      const sampleEntry = indexData.artifacts.find(e => e.status === 'pass');
      if (sampleEntry?.artifacts.caseFile) {
        const content = fs.readFileSync(sampleEntry.artifacts.caseFile, 'utf-8');
        const lines = content.trim().split('\n');
        
        lines.forEach((line, idx) => {
          expect(() => JSON.parse(line), `Line ${idx} should be valid JSON`).not.toThrow();
        });
      }
    });

    it('should include case.begin event', () => {
      const sampleEntry = indexData.artifacts[0];
      if (sampleEntry?.artifacts.caseFile) {
        const content = fs.readFileSync(sampleEntry.artifacts.caseFile, 'utf-8');
        const lines = content.trim().split('\n').map(l => JSON.parse(l));
        
        const beginEvent = lines.find(e => e.evt === 'case.begin');
        expect(beginEvent, 'case.begin event should exist').toBeDefined();
        expect(beginEvent?.phase).toBe('setup');
        expect(beginEvent?.lvl).toBe('info');
        expect(beginEvent?.case).toBeDefined();
      }
    });

    it('should include test.run event', () => {
      const sampleEntry = indexData.artifacts[0];
      if (sampleEntry?.artifacts.caseFile) {
        const content = fs.readFileSync(sampleEntry.artifacts.caseFile, 'utf-8');
        const lines = content.trim().split('\n').map(l => JSON.parse(l));
        
        const runEvent = lines.find(e => e.evt === 'test.run');
        expect(runEvent, 'test.run event should exist').toBeDefined();
        expect(runEvent?.phase).toBe('execution');
        expect(runEvent?.lvl).toBe('info');
      }
    });

    it('should include case.end event with payload', () => {
      const sampleEntry = indexData.artifacts[0];
      if (sampleEntry?.artifacts.caseFile) {
        const content = fs.readFileSync(sampleEntry.artifacts.caseFile, 'utf-8');
        const lines = content.trim().split('\n').map(l => JSON.parse(l));
        
        const endEvent = lines.find(e => e.evt === 'case.end');
        expect(endEvent, 'case.end event should exist').toBeDefined();
        expect(endEvent?.phase).toBe('teardown');
        expect(endEvent?.payload).toBeDefined();
        expect(endEvent?.payload?.duration).toBeGreaterThanOrEqual(0);
        expect(endEvent?.payload?.status).toMatch(/^(passed|failed|skipped)$/);
      }
    });

    it('should have timestamps for all events', () => {
      const sampleEntry = indexData.artifacts[0];
      if (sampleEntry?.artifacts.caseFile) {
        const content = fs.readFileSync(sampleEntry.artifacts.caseFile, 'utf-8');
        const lines = content.trim().split('\n').map(l => JSON.parse(l));
        
        lines.forEach((event, idx) => {
          expect(event.ts, `Event ${idx} should have timestamp`).toBeDefined();
          expect(typeof event.ts, `Event ${idx} ts should be number`).toBe('number');
        });
      }
    });

    it('should have chronological timestamps', () => {
      const sampleEntry = indexData.artifacts[0];
      if (sampleEntry?.artifacts.caseFile) {
        const content = fs.readFileSync(sampleEntry.artifacts.caseFile, 'utf-8');
        const lines = content.trim().split('\n').map(l => JSON.parse(l));
        
        for (let i = 1; i < lines.length; i++) {
          expect(lines[i].ts, `Event ${i} timestamp should be >= previous`).toBeGreaterThanOrEqual(lines[i - 1].ts);
        }
      }
    });
  });

  describe('failed test case JSONL structure', () => {
    it('should include test.error events for failed tests', () => {
      const failedEntry = indexData.artifacts.find(e => e.status === 'fail');
      if (failedEntry?.artifacts.caseFile && fs.existsSync(failedEntry.artifacts.caseFile)) {
        const content = fs.readFileSync(failedEntry.artifacts.caseFile, 'utf-8');
        const lines = content.trim().split('\n').map(l => JSON.parse(l));
        
        const errorEvent = lines.find(e => e.evt === 'test.error');
        expect(errorEvent, 'test.error event should exist for failed test').toBeDefined();
        expect(errorEvent?.lvl).toBe('error');
        expect(errorEvent?.payload).toBeDefined();
        expect(errorEvent?.payload?.message).toBeDefined();
      }
    });

    it('should have error-level log for case.end of failed tests', () => {
      const failedEntry = indexData.artifacts.find(e => e.status === 'fail');
      if (failedEntry?.artifacts.caseFile && fs.existsSync(failedEntry.artifacts.caseFile)) {
        const content = fs.readFileSync(failedEntry.artifacts.caseFile, 'utf-8');
        const lines = content.trim().split('\n').map(l => JSON.parse(l));
        
        const endEvent = lines.find(e => e.evt === 'case.end');
        expect(endEvent?.lvl).toBe('error');
        expect(endEvent?.payload?.status).toBe('failed');
      }
    });
  });

  describe('cross-references validation', () => {
    it('should have summary.jsonl file', () => {
      expect(fs.existsSync(SUMMARY_PATH), 'summary.jsonl should exist').toBe(true);
    });

    it('should have matching test count between index and summary', () => {
      const summaryContent = fs.readFileSync(SUMMARY_PATH, 'utf-8');
      const summaryLines = summaryContent.trim().split('\n');
      expect(summaryLines.length).toBeGreaterThanOrEqual(indexData.totalTests);
    });

    it('should have valid JSONL in summary file', () => {
      const summaryContent = fs.readFileSync(SUMMARY_PATH, 'utf-8');
      const summaryLines = summaryContent.trim().split('\n').filter(l => l.length > 0);
      
      summaryLines.forEach((line, idx) => {
        expect(() => JSON.parse(line), `Summary line ${idx} should be valid JSON`).not.toThrow();
      });
    });

    it('should cross-reference between index and case files', () => {
      indexData.artifacts.slice(0, 5).forEach((entry) => {
        if (entry.artifacts.caseFile) {
          expect(fs.existsSync(entry.artifacts.caseFile)).toBe(true);
          
          const caseContent = fs.readFileSync(entry.artifacts.caseFile, 'utf-8');
          const events = caseContent.trim().split('\n').map(l => JSON.parse(l));
          
          const endEvent = events.find(e => e.evt === 'case.end');
          expect(endEvent?.payload?.duration).toBe(entry.duration);
        }
      });
    });

    it('should have case name in JSONL events matching test name', () => {
      const sampleEntry = indexData.artifacts[0];
      if (sampleEntry?.artifacts.caseFile) {
        const content = fs.readFileSync(sampleEntry.artifacts.caseFile, 'utf-8');
        const events = content.trim().split('\n').map(l => JSON.parse(l));
        
        events.forEach((event) => {
          expect(event.case).toBe(sampleEntry.testName);
        });
      }
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle test names with special characters', () => {
      const specialCharsEntry = indexData.artifacts.find(e => 
        e.testName.includes('-') || e.testName.includes('/')
      );
      
      if (specialCharsEntry?.artifacts.caseFile) {
        const fileName = path.basename(specialCharsEntry.artifacts.caseFile);
        expect(fileName).toMatch(/^[a-zA-Z0-9_-]+\.jsonl$/);
        expect(fs.existsSync(specialCharsEntry.artifacts.caseFile)).toBe(true);
      }
    });

    it('should have unique case file paths', () => {
      const casePaths = indexData.artifacts
        .map(e => e.artifacts.caseFile)
        .filter(Boolean);
      
      const uniquePaths = new Set(casePaths);
      expect(uniquePaths.size).toBe(casePaths.length);
    });

    it('should have all case files in reports directory', () => {
      indexData.artifacts.forEach((entry) => {
        if (entry.artifacts.caseFile) {
          expect(entry.artifacts.caseFile).toMatch(/^reports\//);
        }
      });
    });

    it('should have consistent status values', () => {
      indexData.artifacts.forEach((entry) => {
        const validStatuses = ['pass', 'fail', 'skip'];
        expect(validStatuses).toContain(entry.status);
      });
    });
  });
});
