import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DigestGenerator, DigestConfig, DigestEvent } from '../../src/digest/generator';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('DigestGenerator', () => {
  let tmpDir: string;
  let artifactPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'digest-test-'));
    artifactPath = path.join(tmpDir, 'test.jsonl');
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  const createSyntheticLogs = (events: DigestEvent[]): void => {
    const lines = events.map(e => JSON.stringify(e)).join('\n');
    fs.writeFileSync(artifactPath, lines);
  };

  describe('basic digest generation', () => {
    it('generates digest from synthetic logs with failures', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '2', payload: { msg: 'failed' } },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
        'Test failed'
      );

      expect(digest).not.toBeNull();
      expect(digest!.case).toBe('test-1');
      expect(digest!.status).toBe('fail');
      expect(digest!.duration).toBe(3000);
      expect(digest!.location).toBe('test.spec.ts:10');
      expect(digest!.error).toBe('Test failed');
    });

    it('returns null for passing tests', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'pass',
        1000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest).toBeNull();
    });

    it('returns null when disabled', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '1' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = { enabled: false };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest).toBeNull();
    });
  });

  describe('digest content verification', () => {
    it('includes correct summary statistics', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '2' },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.summary.totalEvents).toBe(3);
      expect(digest!.summary.includedEvents).toBeGreaterThan(0);
      expect(digest!.summary.budgetUsed).toBeGreaterThan(0);
      expect(digest!.summary.budgetLimit).toBe(10 * 1024);
    });

    it('writes valid JSON file', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '1' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        artifactPath
      );

      await generator.writeDigest(digest!, tmpDir);

      const jsonPath = path.join(tmpDir, 'test-1.digest.json');
      expect(fs.existsSync(jsonPath)).toBe(true);

      const content = fs.readFileSync(jsonPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.case).toBe('test-1');
      expect(parsed.status).toBe('fail');
    });

    it('writes valid markdown file', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '1' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        artifactPath,
        'Error message'
      );

      await generator.writeDigest(digest!, tmpDir);

      const mdPath = path.join(tmpDir, 'test-1.digest.md');
      expect(fs.existsSync(mdPath)).toBe(true);

      const content = fs.readFileSync(mdPath, 'utf-8');
      expect(content).toContain('# Digest: test-1');
      expect(content).toContain('**Status**: fail');
      expect(content).toContain('**Duration**: 1000ms');
      expect(content).toContain('**Location**: test.spec.ts:10');
      expect(content).toContain('**Error**: Error message');
      expect(content).toContain('## Summary');
    });
  });

  describe('rule configurations', () => {
    it('includes events matching error level', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '2' },
        { ts: 3000, lvl: 'warn', case: 'test-1', evt: 'test.warn', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }],
      };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.events).toHaveLength(1);
      expect(digest!.events[0].lvl).toBe('error');
    });

    it('includes events matching specific event name', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 2000, lvl: 'info', case: 'test-1', evt: 'assert.fail', id: '2' },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [{ match: { evt: 'assert.fail' }, actions: [{ type: 'include' }] }],
      };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.events).toHaveLength(1);
      expect(digest!.events[0].evt).toBe('assert.fail');
    });

    it('applies slice action with window', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.a', id: '1' },
        { ts: 2000, lvl: 'info', case: 'test-1', evt: 'test.b', id: '2' },
        { ts: 3000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '3' },
        { ts: 4000, lvl: 'info', case: 'test-1', evt: 'test.d', id: '4' },
        { ts: 5000, lvl: 'info', case: 'test-1', evt: 'test.e', id: '5' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [{ match: { evt: 'test.error' }, actions: [{ type: 'slice', window: 1 }] }],
      };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        5000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.events).toHaveLength(3);
      expect(digest!.events.map(e => e.evt)).toEqual(['test.b', 'test.error', 'test.d']);
    });

    it('applies redact action to fields', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '1', payload: { secret: 'password123' } },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          { 
            match: { lvl: 'error' }, 
            actions: [
              { type: 'include' },
              { type: 'redact', field: 'payload' }
            ] 
          }
        ],
      };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.events).toHaveLength(1);
      expect(digest!.events[0].payload).toBe('[REDACTED]');
    });

    it('respects priority order', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '1', payload: { data: 'secret' } },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          { match: { lvl: 'error' }, actions: [{ type: 'include' }], priority: 5 },
          { match: { lvl: 'error' }, actions: [{ type: 'redact', field: 'payload' }], priority: 10 },
        ],
      };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.events[0].payload).toBe('[REDACTED]');
    });

    it('supports wildcard patterns in event matching', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 2000, lvl: 'info', case: 'test-1', evt: 'test.step.1', id: '2' },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.step.2', id: '3' },
        { ts: 4000, lvl: 'info', case: 'test-1', evt: 'other.event', id: '4' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [{ match: { evt: 'test.step.*' }, actions: [{ type: 'include' }] }],
      };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        4000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.events).toHaveLength(2);
      expect(digest!.events.every(e => e.evt.startsWith('test.step'))).toBe(true);
    });

    it('supports multiple match criteria', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'error', case: 'test-1', evt: 'test.start', phase: 'setup', id: '1' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'test.error', phase: 'run', id: '2' },
        { ts: 3000, lvl: 'warn', case: 'test-1', evt: 'test.warn', phase: 'run', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [{ match: { lvl: 'error', phase: 'run' }, actions: [{ type: 'include' }] }],
      };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.events).toHaveLength(1);
      expect(digest!.events[0].evt).toBe('test.error');
    });
  });

  describe('budget enforcement', () => {
    it('enforces byte budget', async () => {
      const events: DigestEvent[] = Array.from({ length: 100 }, (_, i) => ({
        ts: 1000 + i,
        lvl: 'error',
        case: 'test-1',
        evt: `test.error.${i}`,
        id: `${i}`,
        payload: { data: 'x'.repeat(100) },
      }));
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        budget: { kb: 1, lines: 1000 },
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }],
      };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        10000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.summary.budgetUsed).toBeLessThanOrEqual(digest!.summary.budgetLimit);
      expect(digest!.events.length).toBeLessThan(events.length);
    });

    it('enforces line budget', async () => {
      const events: DigestEvent[] = Array.from({ length: 50 }, (_, i) => ({
        ts: 1000 + i,
        lvl: 'error',
        case: 'test-1',
        evt: `test.error.${i}`,
        id: `${i}`,
      }));
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        budget: { kb: 100, lines: 10 },
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }],
      };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        5000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.events.length).toBeLessThanOrEqual(10);
    });

    it('keeps all events when within budget', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '1' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '2' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        budget: { kb: 100, lines: 100 },
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }],
      };
      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        2000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.events).toHaveLength(2);
      expect(digest!.summary.budgetUsed).toBeLessThanOrEqual(digest!.summary.budgetLimit);
    });
  });

  describe('suspect scoring', () => {
    it('identifies error-level events as suspects', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '2' },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.suspects).toBeDefined();
      expect(digest!.suspects!.length).toBeGreaterThan(0);
      expect(digest!.suspects![0].lvl).toBe('error');
      expect(digest!.suspects![0].score).toBeGreaterThan(0);
      expect(digest!.suspects![0].reasons).toContain('error level');
    });

    it('scores failure events', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'assert.fail', id: '1' },
        { ts: 2000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '2' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        2000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.suspects!.length).toBeGreaterThan(0);
      expect(digest!.suspects![0].evt).toBe('assert.fail');
      expect(digest!.suspects![0].reasons).toContain('failure event');
    });

    it('scores correlated events', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1', corr: 'corr-123' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '2', corr: 'corr-123' },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.other', id: '3', corr: 'corr-456' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath
      );

      const correlatedSuspect = digest!.suspects!.find(s => s.evt === 'test.start');
      expect(correlatedSuspect).toBeDefined();
      expect(correlatedSuspect!.reasons).toContain('correlated with failure');
    });

    it('scores events close to failure time', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 5000, lvl: 'info', case: 'test-1', evt: 'test.near', id: '2' },
        { ts: 5500, lvl: 'error', case: 'test-1', evt: 'test.error', id: '3' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        5500,
        'test.spec.ts:10',
        artifactPath
      );

      const nearSuspect = digest!.suspects!.find(s => s.evt === 'test.near');
      expect(nearSuspect).toBeDefined();
      expect(nearSuspect!.reasons).toContain('close proximity to failure');
    });

    it('limits suspects to top 5', async () => {
      const events: DigestEvent[] = Array.from({ length: 20 }, (_, i) => ({
        ts: 1000 + i * 100,
        lvl: 'error',
        case: 'test-1',
        evt: `test.error.${i}`,
        id: `${i}`,
      }));
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        10000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.suspects!.length).toBeLessThanOrEqual(5);
    });

    it('returns empty suspects for no failure events', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 2000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '2' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        2000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.suspects).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles empty log file', async () => {
      fs.writeFileSync(artifactPath, '');

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.summary.totalEvents).toBe(0);
      expect(digest!.events).toEqual([]);
    });

    it('handles missing log file', async () => {
      const missingPath = path.join(tmpDir, 'missing.jsonl');

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        missingPath
      );

      expect(digest!.summary.totalEvents).toBe(0);
      expect(digest!.events).toEqual([]);
    });

    it('skips malformed JSON lines', async () => {
      fs.writeFileSync(artifactPath, [
        JSON.stringify({ ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' }),
        'invalid json',
        JSON.stringify({ ts: 2000, lvl: 'error', case: 'test-1', evt: 'test.error', id: '2' }),
      ].join('\n'));

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        2000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.summary.totalEvents).toBe(2);
    });

    it('handles events without optional fields', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'error', case: 'test-1', evt: 'test.error' },
      ];
      createSyntheticLogs(events);

      const generator = new DigestGenerator();
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest!.events).toHaveLength(1);
      expect(digest!.events[0]).toMatchObject({ ts: 1000, lvl: 'error', evt: 'test.error' });
    });
  });
});
