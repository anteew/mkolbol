import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DigestDiffEngine, diffDigests, DigestDiff } from '../../src/digest/diff.js';
import { bundleRepro } from '../../scripts/repro-bundle.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('DigestDiffEngine', () => {
  let tmpDir: string;
  let engine: DigestDiffEngine;

  const fixturesDir = path.join(process.cwd(), 'tests/fixtures/digest-diff');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diff-test-'));
    engine = new DigestDiffEngine();
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  describe('digest diff scenarios', () => {
    it('detects identical digests (no diff)', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-identical.json');

      const diff = engine.compareFiles(oldPath, newPath);

      expect(diff.summary.eventsAdded).toBe(0);
      expect(diff.summary.eventsRemoved).toBe(0);
      expect(diff.summary.eventsChanged).toBe(0);
      expect(diff.summary.suspectsChanged).toBe(false);
      expect(diff.summary.codeframesChanged).toBe(false);
      expect(diff.summary.durationDelta).toBe(0);
      expect(diff.addedEvents).toHaveLength(0);
      expect(diff.removedEvents).toHaveLength(0);
    });

    it('detects added events in new digest', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-added-events.json');

      const diff = engine.compareFiles(oldPath, newPath);

      expect(diff.summary.eventsAdded).toBe(2);
      expect(diff.summary.eventsRemoved).toBe(0);
      expect(diff.summary.eventsChanged).toBe(2);
      expect(diff.addedEvents).toHaveLength(2);
      
      const addedEventNames = diff.addedEvents.map(e => e.evt);
      expect(addedEventNames).toContain('deprecation.warning');
      expect(addedEventNames).toContain('cleanup.error');
    });

    it('detects removed events from old digest', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-removed-events.json');

      const diff = engine.compareFiles(oldPath, newPath);

      expect(diff.summary.eventsAdded).toBe(0);
      expect(diff.summary.eventsRemoved).toBe(1);
      expect(diff.summary.eventsChanged).toBe(1);
      expect(diff.removedEvents).toHaveLength(1);
      expect(diff.removedEvents[0].evt).toBe('test.end');
    });

    it('detects changed suspects (score changes)', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-changed-suspects.json');

      const diff = engine.compareFiles(oldPath, newPath);

      expect(diff.summary.suspectsChanged).toBe(true);
      expect(diff.changedSuspects).toBeDefined();
      expect(diff.changedSuspects!.scoreChanged).toHaveLength(1);
      expect(diff.changedSuspects!.scoreChanged[0].event).toBe('assert.fail');
      expect(diff.changedSuspects!.scoreChanged[0].oldScore).toBe(85.5);
      expect(diff.changedSuspects!.scoreChanged[0].newScore).toBe(92.0);
    });

    it('detects changed codeframes', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-changed-codeframes.json');

      const diff = engine.compareFiles(oldPath, newPath);

      expect(diff.summary.codeframesChanged).toBe(true);
      expect(diff.changedCodeframes).toBeDefined();
      expect(diff.changedCodeframes!.added).toHaveLength(2);
      expect(diff.changedCodeframes!.removed).toHaveLength(1);
      
      const addedFiles = diff.changedCodeframes!.added.map(f => f.file);
      expect(addedFiles).toContain('test.spec.ts');
      expect(addedFiles).toContain('helper.ts');
    });

    it('detects mixed changes (events, suspects, codeframes)', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-added-events.json');

      const diff = engine.compareFiles(oldPath, newPath);

      expect(diff.summary.eventsAdded).toBeGreaterThan(0);
      expect(diff.summary.suspectsChanged).toBe(true);
      expect(diff.changedSuspects!.added).toHaveLength(1);
      expect(diff.changedSuspects!.added[0].evt).toBe('cleanup.error');
    });

    it('tracks metadata changes (duration, location, error)', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-changed-codeframes.json');

      const diff = engine.compareFiles(oldPath, newPath);

      expect(diff.metadataChanges.durationChanged).toBe(false);
      expect(diff.metadataChanges.locationChanged).toBe(true);
      expect(diff.metadataChanges.oldLocation).toBe('test.spec.ts:10');
      expect(diff.metadataChanges.newLocation).toBe('test.spec.ts:12');
      expect(diff.metadataChanges.errorChanged).toBe(false);
    });

    it('calculates duration delta correctly', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-added-events.json');

      const diff = engine.compareFiles(oldPath, newPath);

      expect(diff.summary.durationDelta).toBe(300);
      expect(diff.metadataChanges.oldDuration).toBe(1500);
      expect(diff.metadataChanges.newDuration).toBe(1800);
    });
  });

  describe('Go test fixture support', () => {
    it('diffs Go test digests correctly', () => {
      const oldPath = path.join(fixturesDir, 'go-test-v1.json');
      const newPath = path.join(fixturesDir, 'go-test-v2-fixed.json');

      const diff = engine.compareFiles(oldPath, newPath);

      expect(diff.oldDigest).toBe('github.com.example.calc.TestDivide');
      expect(diff.newDigest).toBe('github.com.example.calc.TestDivide');
      expect(diff.summary.eventsRemoved).toBe(1);
      expect(diff.summary.durationDelta).toBe(-5);
    });

    it('handles Go test event structure', () => {
      const oldPath = path.join(fixturesDir, 'go-test-v1.json');
      const newPath = path.join(fixturesDir, 'go-test-v2-fixed.json');

      const diff = engine.compareFiles(oldPath, newPath);

      const removedEvent = diff.removedEvents.find(e => e.evt === 'test.output');
      expect(removedEvent).toBeDefined();
      expect(removedEvent!.phase).toBe('run');
      expect(removedEvent!.payload).toBeDefined();
    });
  });

  describe('diff output formats', () => {
    it('generates valid JSON output', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-added-events.json');

      const diff = engine.compareFiles(oldPath, newPath);
      const json = engine.formatAsJson(diff);

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('addedEvents');
      expect(parsed).toHaveProperty('removedEvents');
      expect(parsed).toHaveProperty('metadataChanges');
    });

    it('generates readable markdown output', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-added-events.json');

      const diff = engine.compareFiles(oldPath, newPath);
      const markdown = engine.formatAsMarkdown(diff);

      expect(markdown).toContain('# Digest Diff:');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('Events Added: 2');
      expect(markdown).toContain('Events Removed: 0');
      expect(markdown).toContain('## Added Events');
      expect(markdown).toContain('deprecation.warning');
      expect(markdown).toContain('cleanup.error');
    });

    it('writes diff to file in JSON format', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-added-events.json');
      const outputPath = path.join(tmpDir, 'diff.json');

      const diff = engine.compareFiles(oldPath, newPath);
      engine.writeDiff(diff, outputPath, 'json');

      expect(fs.existsSync(outputPath)).toBe(true);
      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('writes diff to file in markdown format', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-added-events.json');
      const outputPath = path.join(tmpDir, 'diff.md');

      const diff = engine.compareFiles(oldPath, newPath);
      engine.writeDiff(diff, outputPath, 'markdown');

      expect(fs.existsSync(outputPath)).toBe(true);
      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('# Digest Diff:');
      expect(content).toContain('## Summary');
    });
  });

  describe('diffDigests convenience function', () => {
    it('performs diff and writes output', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-added-events.json');
      const outputPath = path.join(tmpDir, 'result.json');

      const diff = diffDigests(oldPath, newPath, outputPath, 'json');

      expect(diff).toBeDefined();
      expect(diff.summary.eventsAdded).toBe(2);
      expect(fs.existsSync(outputPath)).toBe(true);
    });

    it('works without output file', () => {
      const oldPath = path.join(fixturesDir, 'digest-v1.json');
      const newPath = path.join(fixturesDir, 'digest-v2-added-events.json');

      const diff = diffDigests(oldPath, newPath);

      expect(diff).toBeDefined();
      expect(diff.summary.eventsAdded).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('handles digests with no suspects', () => {
      const oldDigest = {
        case: 'test-1',
        status: 'fail' as const,
        duration: 1000,
        location: 'test.ts:1',
        summary: {
          totalEvents: 1,
          includedEvents: 1,
          redactedFields: 0,
          budgetUsed: 100,
          budgetLimit: 1000,
        },
        events: [{ ts: 1000, lvl: 'error', case: 'test-1', evt: 'fail' }],
      };

      const newDigest = {
        ...oldDigest,
        duration: 1200,
      };

      const diff = engine.compareDigests(oldDigest, newDigest);

      expect(diff.changedSuspects).toBeDefined();
      expect(diff.changedSuspects!.added).toHaveLength(0);
      expect(diff.changedSuspects!.removed).toHaveLength(0);
      expect(diff.changedSuspects!.scoreChanged).toHaveLength(0);
    });

    it('handles digests with no codeframes', () => {
      const oldDigest = {
        case: 'test-1',
        status: 'fail' as const,
        duration: 1000,
        location: 'test.ts:1',
        summary: {
          totalEvents: 1,
          includedEvents: 1,
          redactedFields: 0,
          budgetUsed: 100,
          budgetLimit: 1000,
        },
        events: [{ ts: 1000, lvl: 'error', case: 'test-1', evt: 'fail' }],
      };

      const newDigest = {
        ...oldDigest,
        duration: 1200,
      };

      const diff = engine.compareDigests(oldDigest, newDigest);

      expect(diff.changedCodeframes).toBeDefined();
      expect(diff.changedCodeframes!.added).toHaveLength(0);
      expect(diff.changedCodeframes!.removed).toHaveLength(0);
    });
  });
});

describe('Repro Bundle', () => {
  let tmpDir: string;
  let reportsDir: string;
  let summaryFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repro-test-'));
    reportsDir = path.join(tmpDir, 'reports');
    summaryFile = path.join(reportsDir, 'summary.jsonl');
    fs.mkdirSync(reportsDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  describe('bundle contents validation', () => {
    it('includes seed and environment information', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests/fixtures/repro-bundle');
      const artifactPath = path.join(reportsDir, 'test-case-1.jsonl');
      fs.copyFileSync(
        path.join(fixturesDir, 'test-case-1.jsonl'),
        artifactPath
      );

      const summaryEntry = {
        status: 'fail',
        duration: 1500,
        location: 'test.spec.ts:10',
        artifactURI: 'reports/test-case-1.jsonl',
        testName: 'test case 1',
        error: 'Expected 2 to be 3',
      };
      fs.writeFileSync(summaryFile, JSON.stringify(summaryEntry));

      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      try {
        await bundleRepro();

        const bundlePath = path.join(reportsDir, 'bundles/test-case-1.repro.json');
        expect(fs.existsSync(bundlePath)).toBe(true);

        const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

        expect(bundle.environment).toBeDefined();
        expect(bundle.environment.seed).toBeDefined();
        expect(bundle.environment.seed).toBe('test-seed-123');
        expect(bundle.environment.nodeVersion).toBeDefined();
        expect(bundle.environment.platform).toBeDefined();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('includes minimal logs (not full logs)', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests/fixtures/repro-bundle');
      const artifactPath = path.join(reportsDir, 'test-case-1.jsonl');
      fs.copyFileSync(
        path.join(fixturesDir, 'test-case-1.jsonl'),
        artifactPath
      );

      const summaryEntry = {
        status: 'fail',
        duration: 1500,
        location: 'test.spec.ts:10',
        artifactURI: 'reports/test-case-1.jsonl',
        testName: 'test case 1',
        error: 'Expected 2 to be 3',
      };
      fs.writeFileSync(summaryFile, JSON.stringify(summaryEntry));

      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      try {
        await bundleRepro();

        const bundlePath = path.join(reportsDir, 'bundles/test-case-1.repro.json');
        const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

        expect(bundle.failure.errorEvents).toBeDefined();
        expect(bundle.failure.errorEvents.length).toBeGreaterThan(0);
        expect(bundle.failure.errorEvents.length).toBeLessThanOrEqual(5);
        
        expect(bundle.failure.contextEvents).toBeDefined();
        const totalLogLines = fs.readFileSync(artifactPath, 'utf-8').split('\n').filter(Boolean).length;
        expect(bundle.failure.contextEvents.length).toBeLessThanOrEqual(totalLogLines);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('includes valid reproduction commands', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests/fixtures/repro-bundle');
      const artifactPath = path.join(reportsDir, 'test-case-1.jsonl');
      fs.copyFileSync(
        path.join(fixturesDir, 'test-case-1.jsonl'),
        artifactPath
      );

      const summaryEntry = {
        status: 'fail',
        duration: 1500,
        location: 'test.spec.ts:10',
        artifactURI: 'reports/test-case-1.jsonl',
        testName: 'test case 1',
        error: 'Expected 2 to be 3',
      };
      fs.writeFileSync(summaryFile, JSON.stringify(summaryEntry));

      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      try {
        await bundleRepro();

        const bundlePath = path.join(reportsDir, 'bundles/test-case-1.repro.json');
        const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

        expect(bundle.reproduction).toBeDefined();
        expect(bundle.reproduction.vitestCommand).toBeDefined();
        expect(bundle.reproduction.vitestCommand).toContain('vitest run');
        expect(bundle.reproduction.vitestCommand).toContain('test.spec.ts');
        expect(bundle.reproduction.vitestCommand).toContain('test case 1');
        
        expect(bundle.reproduction.logCommand).toBeDefined();
        expect(bundle.reproduction.logCommand).toContain('npm run logq');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('includes complete metadata', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests/fixtures/repro-bundle');
      const artifactPath = path.join(reportsDir, 'test-case-1.jsonl');
      fs.copyFileSync(
        path.join(fixturesDir, 'test-case-1.jsonl'),
        artifactPath
      );

      const summaryEntry = {
        status: 'fail',
        duration: 1500,
        location: 'test.spec.ts:10',
        artifactURI: 'reports/test-case-1.jsonl',
        testName: 'test case 1',
        error: 'Expected 2 to be 3',
        timestamp: '2024-10-12T10:00:00.000Z',
      };
      fs.writeFileSync(summaryFile, JSON.stringify(summaryEntry));

      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      try {
        await bundleRepro();

        const bundlePath = path.join(reportsDir, 'bundles/test-case-1.repro.json');
        const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

        expect(bundle.metadata).toBeDefined();
        expect(bundle.metadata.bundleVersion).toBe('1.0.0');
        expect(bundle.metadata.generated).toBeDefined();
        expect(bundle.metadata.testName).toBe('test case 1');
        expect(bundle.metadata.testFile).toBe('test.spec.ts');
        expect(bundle.metadata.status).toBe('fail');
        expect(bundle.metadata.duration).toBe(1500);
        expect(bundle.metadata.timestamp).toBe('2024-10-12T10:00:00.000Z');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('creates both JSON and markdown outputs', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests/fixtures/repro-bundle');
      const artifactPath = path.join(reportsDir, 'test-case-1.jsonl');
      fs.copyFileSync(
        path.join(fixturesDir, 'test-case-1.jsonl'),
        artifactPath
      );

      const summaryEntry = {
        status: 'fail',
        duration: 1500,
        location: 'test.spec.ts:10',
        artifactURI: 'reports/test-case-1.jsonl',
        testName: 'test case 1',
        error: 'Expected 2 to be 3',
      };
      fs.writeFileSync(summaryFile, JSON.stringify(summaryEntry));

      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      try {
        await bundleRepro();

        const jsonPath = path.join(reportsDir, 'bundles/test-case-1.repro.json');
        const mdPath = path.join(reportsDir, 'bundles/test-case-1.repro.md');

        expect(fs.existsSync(jsonPath)).toBe(true);
        expect(fs.existsSync(mdPath)).toBe(true);

        const mdContent = fs.readFileSync(mdPath, 'utf-8');
        expect(mdContent).toContain('# Reproduction Bundle:');
        expect(mdContent).toContain('## Environment');
        expect(mdContent).toContain('## Failure Summary');
        expect(mdContent).toContain('## Reproduction Commands');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Go test fixture support', () => {
    it('handles Go test case bundles', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests/fixtures/repro-bundle');
      const artifactPath = path.join(reportsDir, 'go-test-case.jsonl');
      fs.copyFileSync(
        path.join(fixturesDir, 'go-test-case.jsonl'),
        artifactPath
      );

      const summaryEntry = {
        status: 'fail',
        duration: 90,
        location: 'github.com/example/calc/TestDivide',
        artifactURI: 'reports/go-test-case.jsonl',
        testName: 'TestDivide',
        error: 'division by zero',
      };
      fs.writeFileSync(summaryFile, JSON.stringify(summaryEntry));

      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      try {
        await bundleRepro();

        const bundlePath = path.join(reportsDir, 'bundles/go-test-case.repro.json');
        expect(fs.existsSync(bundlePath)).toBe(true);

        const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

        expect(bundle.metadata.testName).toBe('TestDivide');
        expect(bundle.environment.seed).toBe('go-seed-456');
        expect(bundle.failure.errorEvents).toBeDefined();
        expect(bundle.failure.errorEvents.some((e: any) => e.evt === 'test.fail')).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('extracts Go test phase information', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests/fixtures/repro-bundle');
      const artifactPath = path.join(reportsDir, 'go-test-case.jsonl');
      fs.copyFileSync(
        path.join(fixturesDir, 'go-test-case.jsonl'),
        artifactPath
      );

      const summaryEntry = {
        status: 'fail',
        duration: 90,
        location: 'github.com/example/calc/TestDivide',
        artifactURI: 'reports/go-test-case.jsonl',
        testName: 'TestDivide',
        error: 'division by zero',
      };
      fs.writeFileSync(summaryFile, JSON.stringify(summaryEntry));

      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      try {
        await bundleRepro();

        const bundlePath = path.join(reportsDir, 'bundles/go-test-case.repro.json');
        const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

        const failEvent = bundle.failure.errorEvents.find((e: any) => e.evt === 'test.fail');
        expect(failEvent).toBeDefined();
        expect(failEvent.phase).toBe('complete');
        expect(failEvent.payload.package).toBe('github.com/example/calc');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('edge cases', () => {
    it('handles missing artifact file gracefully', async () => {
      const summaryEntry = {
        status: 'fail',
        duration: 1500,
        location: 'test.spec.ts:10',
        artifactURI: 'reports/missing.jsonl',
        testName: 'test case 1',
        error: 'Error',
      };
      fs.writeFileSync(summaryFile, JSON.stringify(summaryEntry));

      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      try {
        await bundleRepro();

        const bundlePath = path.join(reportsDir, 'bundles/missing.repro.json');
        expect(fs.existsSync(bundlePath)).toBe(true);

        const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));
        expect(bundle.failure.errorEvents).toHaveLength(0);
        expect(bundle.failure.contextEvents).toHaveLength(0);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('handles case with no seed in events', async () => {
      const artifactPath = path.join(reportsDir, 'no-seed.jsonl');
      fs.writeFileSync(artifactPath, JSON.stringify({
        ts: 1000,
        lvl: 'error',
        case: 'no-seed',
        evt: 'test.error',
      }));

      const summaryEntry = {
        status: 'fail',
        duration: 1000,
        location: 'test.spec.ts:10',
        artifactURI: 'reports/no-seed.jsonl',
        testName: 'no seed test',
        error: 'Error',
      };
      fs.writeFileSync(summaryFile, JSON.stringify(summaryEntry));

      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      try {
        await bundleRepro();

        const bundlePath = path.join(reportsDir, 'bundles/no-seed.repro.json');
        const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

        expect(bundle.environment).toBeDefined();
        expect(bundle.environment.nodeVersion).toBeDefined();
        expect(bundle.environment.platform).toBeDefined();
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
