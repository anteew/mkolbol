import { describe, it, expect } from 'vitest';
import {
  generateFingerprint,
  extractFailureInfo,
  FailureInfo,
  HistoryEntry,
} from '../../src/digest/fingerprint';

describe('Failure Fingerprinting and Trends', () => {
  describe('fingerprint generation', () => {
    it('generates consistent fingerprint for same failures', () => {
      const failure: FailureInfo = {
        testName: 'auth › login fails with invalid password',
        errorType: 'AssertionError',
        stackLocation: 'test/auth.spec.ts:42',
      };

      const fp1 = generateFingerprint(failure);
      const fp2 = generateFingerprint(failure);

      expect(fp1).toBe(fp2);
      expect(fp1).toHaveLength(16);
    });

    it('generates different fingerprints for different test names', () => {
      const failure1: FailureInfo = {
        testName: 'test A',
        errorType: 'Error',
        stackLocation: 'test.spec.ts:1',
      };

      const failure2: FailureInfo = {
        testName: 'test B',
        errorType: 'Error',
        stackLocation: 'test.spec.ts:1',
      };

      expect(generateFingerprint(failure1)).not.toBe(generateFingerprint(failure2));
    });

    it('generates different fingerprints for different error types', () => {
      const failure1: FailureInfo = {
        testName: 'test',
        errorType: 'TypeError',
        stackLocation: 'test.spec.ts:1',
      };

      const failure2: FailureInfo = {
        testName: 'test',
        errorType: 'RangeError',
        stackLocation: 'test.spec.ts:1',
      };

      expect(generateFingerprint(failure1)).not.toBe(generateFingerprint(failure2));
    });

    it('generates different fingerprints for different stack locations', () => {
      const failure1: FailureInfo = {
        testName: 'test',
        errorType: 'Error',
        stackLocation: 'test.spec.ts:10',
      };

      const failure2: FailureInfo = {
        testName: 'test',
        errorType: 'Error',
        stackLocation: 'test.spec.ts:20',
      };

      expect(generateFingerprint(failure1)).not.toBe(generateFingerprint(failure2));
    });

    it('generates fingerprint from test name only when no error details', () => {
      const failure: FailureInfo = {
        testName: 'simple test',
      };

      const fp = generateFingerprint(failure);
      expect(fp).toHaveLength(16);
      expect(fp).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  describe('failure info extraction', () => {
    it('extracts error type from error message', () => {
      const info = extractFailureInfo(
        'test case',
        'TypeError: Cannot read property',
        undefined
      );

      expect(info.testName).toBe('test case');
      expect(info.errorType).toBe('TypeError');
      expect(info.errorMessage).toBe('TypeError: Cannot read property');
    });

    it('extracts stack location from payload', () => {
      const payload = {
        stack: `Error: test failed
    at test.spec.ts:42:10
    at runTest (framework.ts:100:5)`,
      };

      const info = extractFailureInfo('test case', 'Error: test failed', payload);

      expect(info.stackLocation).toBe('test.spec.ts:42');
    });

    it('extracts error name from payload', () => {
      const payload = {
        name: 'AssertionError',
        stack: 'AssertionError\n    at test.spec.ts:10:5',
      };

      const info = extractFailureInfo('test', 'assertion failed', payload);

      expect(info.errorType).toBe('AssertionError');
    });

    it('handles payload with parenthesis-style stack format', () => {
      const payload = {
        stack: `Error: failed
    at Context.test (test.spec.ts:30:15)
    at run (mocha.js:200:10)`,
      };

      const info = extractFailureInfo('test', 'Error: failed', payload);

      expect(info.stackLocation).toBe('test.spec.ts:30');
    });

    it('handles missing error details gracefully', () => {
      const info = extractFailureInfo('test name', undefined, undefined);

      expect(info.testName).toBe('test name');
      expect(info.errorMessage).toBeUndefined();
      expect(info.errorType).toBeUndefined();
      expect(info.stackLocation).toBeUndefined();
    });
  });

  describe('history ledger creation', () => {
    it('creates valid history entry from test result', () => {
      const entry: HistoryEntry = {
        timestamp: new Date('2024-10-12T10:00:00Z').toISOString(),
        fingerprint: 'abc123def456',
        testName: 'login test',
        status: 'fail',
        duration: 1250,
        location: 'auth.spec.ts:42',
        runMetadata: {
          runId: 'run-001',
          seed: 'seed-123',
        },
      };

      expect(entry.timestamp).toBe('2024-10-12T10:00:00.000Z');
      expect(entry.fingerprint).toBe('abc123def456');
      expect(entry.status).toBe('fail');
      expect(entry.duration).toBe(1250);
    });

    it('appends entries to history', () => {
      const history: HistoryEntry[] = [];

      const failure: FailureInfo = {
        testName: 'flaky test',
        errorType: 'TimeoutError',
        stackLocation: 'test.spec.ts:100',
      };

      const fingerprint = generateFingerprint(failure);

      for (let i = 0; i < 5; i++) {
        history.push({
          timestamp: new Date(Date.UTC(2024, 9, 12, 10, i, 0)).toISOString(),
          fingerprint,
          testName: failure.testName,
          status: i % 2 === 0 ? 'fail' : 'pass',
          duration: 1000 + i * 100,
          location: 'test.spec.ts:100',
          runMetadata: { runId: `run-${i}` },
        });
      }

      expect(history).toHaveLength(5);
      expect(history.every(e => e.fingerprint === fingerprint)).toBe(true);
      expect(history.filter(e => e.status === 'fail')).toHaveLength(3);
      expect(history.filter(e => e.status === 'pass')).toHaveLength(2);
    });
  });

  describe('trend analysis with synthetic multi-run history', () => {
    it('calculates failure rate from history', () => {
      const failure: FailureInfo = {
        testName: 'database connection test',
        errorType: 'ConnectionError',
        stackLocation: 'db.spec.ts:25',
      };

      const fingerprint = generateFingerprint(failure);
      const history: HistoryEntry[] = [];

      for (let i = 0; i < 10; i++) {
        history.push({
          timestamp: new Date(Date.UTC(2024, 9, 12, 10, i, 0)).toISOString(),
          fingerprint,
          testName: failure.testName,
          status: i < 7 ? 'fail' : 'pass',
          duration: 2000,
          location: 'db.spec.ts:25',
        });
      }

      const failureCount = history.filter(e => e.status === 'fail').length;
      const failureRate = failureCount / history.length;

      expect(failureRate).toBe(0.7);
      expect(failureCount).toBe(7);
    });

    it('identifies first and last seen timestamps', () => {
      const fingerprint = generateFingerprint({
        testName: 'test',
        errorType: 'Error',
      });

      const history: HistoryEntry[] = [
        {
          timestamp: '2024-10-01T10:00:00.000Z',
          fingerprint,
          testName: 'test',
          status: 'fail',
          duration: 100,
          location: 'test.spec.ts:1',
        },
        {
          timestamp: '2024-10-05T10:00:00.000Z',
          fingerprint,
          testName: 'test',
          status: 'fail',
          duration: 100,
          location: 'test.spec.ts:1',
        },
        {
          timestamp: '2024-10-10T10:00:00.000Z',
          fingerprint,
          testName: 'test',
          status: 'fail',
          duration: 100,
          location: 'test.spec.ts:1',
        },
      ];

      const firstSeen = new Date(history[0].timestamp);
      const lastSeen = new Date(history[history.length - 1].timestamp);

      expect(firstSeen.toISOString()).toBe('2024-10-01T10:00:00.000Z');
      expect(lastSeen.toISOString()).toBe('2024-10-10T10:00:00.000Z');
    });

    it('tracks trend over time windows', () => {
      const fingerprint = generateFingerprint({
        testName: 'api test',
        errorType: 'NetworkError',
      });

      const history: HistoryEntry[] = [];
      const baseDate = new Date('2024-10-01T00:00:00.000Z');

      for (let day = 0; day < 14; day++) {
        for (let run = 0; run < 3; run++) {
          const timestamp = new Date(baseDate);
          timestamp.setDate(baseDate.getDate() + day);
          timestamp.setHours(run * 8);

          history.push({
            timestamp: timestamp.toISOString(),
            fingerprint,
            testName: 'api test',
            status: day < 7 ? 'fail' : (run === 0 ? 'fail' : 'pass'),
            duration: 500,
            location: 'api.spec.ts:50',
          });
        }
      }

      const week1 = history.slice(0, 21);
      const week2 = history.slice(21);

      const week1FailRate = week1.filter(e => e.status === 'fail').length / week1.length;
      const week2FailRate = week2.filter(e => e.status === 'fail').length / week2.length;

      expect(week1FailRate).toBeGreaterThan(week2FailRate);
      expect(week1FailRate).toBeCloseTo(1.0, 1);
      expect(week2FailRate).toBeCloseTo(0.33, 1);
    });
  });

  describe('top offender ranking', () => {
    it('ranks failures by frequency', () => {
      const failures = [
        { testName: 'test A', errorType: 'Error', stackLocation: 'a.spec.ts:1' },
        { testName: 'test B', errorType: 'Error', stackLocation: 'b.spec.ts:1' },
        { testName: 'test C', errorType: 'Error', stackLocation: 'c.spec.ts:1' },
      ];

      const history: HistoryEntry[] = [];

      for (let i = 0; i < 10; i++) {
        const failureIndex = i < 6 ? 0 : i < 9 ? 1 : 2;
        const failure = failures[failureIndex];
        history.push({
          timestamp: new Date(Date.UTC(2024, 9, 12, 10, i, 0)).toISOString(),
          fingerprint: generateFingerprint(failure),
          testName: failure.testName,
          status: 'fail',
          duration: 100,
          location: failure.stackLocation,
        });
      }

      const fingerprintCounts = new Map<string, number>();
      history.forEach(entry => {
        fingerprintCounts.set(
          entry.fingerprint,
          (fingerprintCounts.get(entry.fingerprint) || 0) + 1
        );
      });

      const ranked = Array.from(fingerprintCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([fp, count]) => ({ fingerprint: fp, count }));

      expect(ranked[0].count).toBe(6);
      expect(ranked[1].count).toBe(3);
      expect(ranked[2].count).toBe(1);
    });

    it('ranks by failure rate when frequency is similar', () => {
      const fingerprints = ['fp1', 'fp2', 'fp3'];
      const history: HistoryEntry[] = [];

      fingerprints.forEach((fp, idx) => {
        const totalRuns = 10;
        const failures = idx === 0 ? 9 : idx === 1 ? 7 : 5;

        for (let i = 0; i < totalRuns; i++) {
          history.push({
            timestamp: new Date(Date.UTC(2024, 9, 12, idx, i, 0)).toISOString(),
            fingerprint: fp,
            testName: `test-${fp}`,
            status: i < failures ? 'fail' : 'pass',
            duration: 100,
            location: 'test.spec.ts:1',
          });
        }
      });

      const stats = new Map<string, { total: number; failures: number }>();
      history.forEach(entry => {
        const current = stats.get(entry.fingerprint) || { total: 0, failures: 0 };
        current.total++;
        if (entry.status === 'fail') current.failures++;
        stats.set(entry.fingerprint, current);
      });

      const ranked = Array.from(stats.entries())
        .map(([fp, s]) => ({ fingerprint: fp, rate: s.failures / s.total }))
        .sort((a, b) => b.rate - a.rate);

      expect(ranked[0].fingerprint).toBe('fp1');
      expect(ranked[0].rate).toBe(0.9);
      expect(ranked[1].fingerprint).toBe('fp2');
      expect(ranked[1].rate).toBe(0.7);
      expect(ranked[2].fingerprint).toBe('fp3');
      expect(ranked[2].rate).toBe(0.5);
    });

    it('combines frequency and rate for top offender score', () => {
      interface OffenderStats {
        fingerprint: string;
        testName: string;
        failures: number;
        total: number;
        rate: number;
        score: number;
      }

      const testData = [
        { name: 'high freq high rate', failures: 10, passes: 0 },
        { name: 'low freq high rate', failures: 2, passes: 0 },
        { name: 'high freq low rate', failures: 5, passes: 10 },
      ];

      const offenders: OffenderStats[] = testData.map(t => {
        const total = t.failures + t.passes;
        const rate = t.failures / total;
        const score = t.failures * rate;

        return {
          fingerprint: generateFingerprint({ testName: t.name }),
          testName: t.name,
          failures: t.failures,
          total,
          rate,
          score,
        };
      });

      offenders.sort((a, b) => b.score - a.score);

      expect(offenders[0].testName).toBe('high freq high rate');
      expect(offenders[0].score).toBe(10);
      expect(offenders[1].testName).toBe('low freq high rate');
      expect(offenders[1].score).toBe(2);
    });
  });

  describe('time range filtering', () => {
    it('filters history by date range', () => {
      const fingerprint = generateFingerprint({ testName: 'test' });
      const allHistory: HistoryEntry[] = [];

      for (let day = 0; day < 30; day++) {
        allHistory.push({
          timestamp: new Date(Date.UTC(2024, 9, day + 1, 10, 0, 0)).toISOString(),
          fingerprint,
          testName: 'test',
          status: 'fail',
          duration: 100,
          location: 'test.spec.ts:1',
        });
      }

      const startDate = new Date('2024-10-10T00:00:00.000Z');
      const endDate = new Date('2024-10-20T23:59:59.999Z');

      const filtered = allHistory.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startDate && entryDate <= endDate;
      });

      expect(filtered.length).toBe(11);
      expect(new Date(filtered[0].timestamp).getUTCDate()).toBe(10);
      expect(new Date(filtered[filtered.length - 1].timestamp).getUTCDate()).toBe(20);
    });

    it('filters last N runs', () => {
      const history: HistoryEntry[] = [];

      for (let i = 0; i < 100; i++) {
        history.push({
          timestamp: new Date(Date.UTC(2024, 9, 12, 10, i, 0)).toISOString(),
          fingerprint: 'fp',
          testName: 'test',
          status: 'fail',
          duration: 100,
          location: 'test.spec.ts:1',
          runMetadata: { runId: `run-${i}` },
        });
      }

      const lastN = 10;
      const recent = history.slice(-lastN);

      expect(recent.length).toBe(10);
      expect(recent[0].runMetadata?.runId).toBe('run-90');
      expect(recent[recent.length - 1].runMetadata?.runId).toBe('run-99');
    });

    it('filters by rolling time window', () => {
      const fingerprint = generateFingerprint({ testName: 'test' });
      const now = new Date('2024-10-12T15:00:00.000Z');
      const history: HistoryEntry[] = [];

      for (let hours = 48; hours >= 0; hours--) {
        const timestamp = new Date(now);
        timestamp.setHours(now.getHours() - hours);

        history.push({
          timestamp: timestamp.toISOString(),
          fingerprint,
          testName: 'test',
          status: hours % 3 === 0 ? 'fail' : 'pass',
          duration: 100,
          location: 'test.spec.ts:1',
        });
      }

      const windowHours = 24;
      const cutoff = new Date(now);
      cutoff.setHours(cutoff.getHours() - windowHours);

      const inWindow = history.filter(e => new Date(e.timestamp) >= cutoff);

      expect(inWindow.length).toBeLessThan(history.length);
      expect(inWindow.length).toBe(25);
    });
  });

  describe('Node.js test data integration', () => {
    it('generates fingerprints for Node.js test failures', () => {
      const nodeFailures = [
        {
          testName: 'API › GET /users › returns user list',
          error: 'AssertionError: expected 200 to equal 404',
          stack: `AssertionError: expected 200 to equal 404
    at Context.<anonymous> (test/api.spec.ts:45:30)
    at processImmediate (node:internal/timers:478:21)`,
        },
        {
          testName: 'Database › connection › establishes connection',
          error: 'Error: Connection timeout',
          stack: `Error: Connection timeout
    at Timeout._onTimeout (test/db.spec.ts:20:15)
    at listOnTimeout (node:internal/timers:569:17)`,
        },
      ];

      const fingerprints = nodeFailures.map(f => {
        const info = extractFailureInfo(f.testName, f.error, { stack: f.stack });
        return generateFingerprint(info);
      });

      expect(fingerprints[0]).toHaveLength(16);
      expect(fingerprints[1]).toHaveLength(16);
      expect(fingerprints[0]).not.toBe(fingerprints[1]);
    });

    it('creates history from Node.js test runs', () => {
      const testRuns = [
        { name: 'async test', status: 'pass' as const, time: 150 },
        { name: 'async test', status: 'fail' as const, time: 200 },
        { name: 'async test', status: 'fail' as const, time: 180 },
      ];

      const history: HistoryEntry[] = testRuns.map((run, idx) => ({
        timestamp: new Date(Date.UTC(2024, 9, 12, 10, idx, 0)).toISOString(),
        fingerprint: generateFingerprint({ testName: run.name }),
        testName: run.name,
        status: run.status,
        duration: run.time,
        location: 'async.spec.ts:10',
      }));

      expect(history).toHaveLength(3);
      expect(history.filter(e => e.status === 'fail')).toHaveLength(2);
      const failRate = history.filter(e => e.status === 'fail').length / history.length;
      expect(failRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('Go test data integration', () => {
    it('generates fingerprints for Go test failures', () => {
      const goFailures = [
        {
          testName: 'TestDivide',
          package: 'github.com/example/calc',
          error: 'calc_test.go:31: Error: division by zero',
        },
        {
          testName: 'TestValidation',
          package: 'github.com/example/utils',
          error: 'utils_test.go:15: validation failed',
        },
      ];

      const fingerprints = goFailures.map(f => {
        const info: FailureInfo = {
          testName: f.testName,
          errorMessage: f.error,
          stackLocation: f.error.match(/([^:]+\.go:\d+)/)?.[1],
        };
        return generateFingerprint(info);
      });

      expect(fingerprints[0]).toHaveLength(16);
      expect(fingerprints[1]).toHaveLength(16);
      expect(fingerprints[0]).not.toBe(fingerprints[1]);
    });

    it('creates history from Go test runs', () => {
      const goTestOutput = [
        {
          testName: 'TestAdd',
          package: 'github.com/example/calc',
          action: 'pass' as const,
          elapsed: 0.09,
        },
        {
          testName: 'TestDivide',
          package: 'github.com/example/calc',
          action: 'fail' as const,
          elapsed: 0.09,
        },
      ];

      const history: HistoryEntry[] = goTestOutput.map((test, idx) => ({
        timestamp: new Date(Date.UTC(2024, 9, 12, 10, 0, idx)).toISOString(),
        fingerprint: generateFingerprint({ testName: test.testName }),
        testName: test.testName,
        status: test.action === 'pass' ? 'pass' : 'fail',
        duration: test.elapsed * 1000,
        location: `${test.package}/${test.testName}`,
      }));

      expect(history).toHaveLength(2);
      expect(history[0].status).toBe('pass');
      expect(history[1].status).toBe('fail');
    });

    it('handles Go panic failures', () => {
      const panicFailure = {
        testName: 'TestPanic',
        error: `panic: runtime error: invalid memory address
calc_test.go:50 +0x123
testing.tRunner(0xc000010e00, 0x10f1a0)
testing.go:1259 +0x102`,
      };

      const info = extractFailureInfo(
        panicFailure.testName,
        panicFailure.error,
        { stack: panicFailure.error }
      );

      const fingerprint = generateFingerprint(info);

      expect(fingerprint).toHaveLength(16);
      expect(info.testName).toBe('TestPanic');
    });
  });

  describe('regression detection', () => {
    it('detects new regression from passing to failing', () => {
      const fingerprint = generateFingerprint({
        testName: 'regression test',
        errorType: 'Error',
      });

      const history: HistoryEntry[] = [];

      for (let i = 0; i < 10; i++) {
        history.push({
          timestamp: new Date(Date.UTC(2024, 9, 12, 10, i, 0)).toISOString(),
          fingerprint,
          testName: 'regression test',
          status: i < 8 ? 'pass' : 'fail',
          duration: 100,
          location: 'test.spec.ts:1',
        });
      }

      let isRegression = false;
      for (let i = 1; i < history.length; i++) {
        if (history[i - 1].status === 'pass' && history[i].status === 'fail') {
          isRegression = true;
          break;
        }
      }

      expect(isRegression).toBe(true);
    });

    it('identifies flaky tests with intermittent failures', () => {
      const fingerprint = generateFingerprint({ testName: 'flaky' });
      const history: HistoryEntry[] = [];

      const pattern = ['pass', 'fail', 'pass', 'pass', 'fail', 'pass', 'fail', 'pass'];
      pattern.forEach((status, i) => {
        history.push({
          timestamp: new Date(Date.UTC(2024, 9, 12, 10, i, 0)).toISOString(),
          fingerprint,
          testName: 'flaky',
          status: status as 'pass' | 'fail',
          duration: 100,
          location: 'test.spec.ts:1',
        });
      });

      let transitionCount = 0;
      for (let i = 1; i < history.length; i++) {
        if (history[i].status !== history[i - 1].status) {
          transitionCount++;
        }
      }

      const transitionRate = transitionCount / (history.length - 1);
      const isFlaky = transitionCount >= 3 || transitionRate > 0.4;
      expect(isFlaky).toBe(true);
      expect(transitionCount).toBeGreaterThanOrEqual(5);
    });

    it('tracks recovery from failures', () => {
      const fingerprint = generateFingerprint({ testName: 'recovery test' });
      const history: HistoryEntry[] = [];

      const statuses: Array<'fail' | 'pass'> = [
        'fail', 'fail', 'fail', 'fail', 'fail',
        'pass', 'pass', 'pass', 'pass', 'pass',
      ];

      statuses.forEach((status, i) => {
        history.push({
          timestamp: new Date(Date.UTC(2024, 9, 12, 10, i, 0)).toISOString(),
          fingerprint,
          testName: 'recovery test',
          status,
          duration: 100,
          location: 'test.spec.ts:1',
        });
      });

      const recentWindow = 5;
      const recent = history.slice(-recentWindow);
      const recentFailures = recent.filter(e => e.status === 'fail').length;

      const hasRecovered = recentFailures === 0;
      expect(hasRecovered).toBe(true);
    });
  });

  describe('comprehensive trend analysis', () => {
    it('analyzes complex multi-test multi-run scenario', () => {
      interface TrendData {
        fingerprint: string;
        testName: string;
        firstSeen: string;
        lastSeen: string;
        totalRuns: number;
        failures: number;
        failureRate: number;
        avgDuration: number;
      }

      const tests = [
        { name: 'critical path test', baseFailRate: 0.1, baseDuration: 500 },
        { name: 'flaky network test', baseFailRate: 0.4, baseDuration: 2000 },
        { name: 'stable unit test', baseFailRate: 0.01, baseDuration: 50 },
      ];

      const allHistory: HistoryEntry[] = [];

      tests.forEach(test => {
        const fingerprint = generateFingerprint({
          testName: test.name,
          errorType: 'Error',
        });

        for (let run = 0; run < 50; run++) {
          const shouldFail = Math.random() < test.baseFailRate;
          allHistory.push({
            timestamp: new Date(Date.UTC(2024, 9, 12, 10, run, 0)).toISOString(),
            fingerprint,
            testName: test.name,
            status: shouldFail ? 'fail' : 'pass',
            duration: test.baseDuration + (Math.random() - 0.5) * 100,
            location: 'test.spec.ts:1',
            runMetadata: { runId: `run-${run}` },
          });
        }
      });

      const trendsByFingerprint = new Map<string, TrendData>();

      allHistory.forEach(entry => {
        const existing = trendsByFingerprint.get(entry.fingerprint);
        if (!existing) {
          trendsByFingerprint.set(entry.fingerprint, {
            fingerprint: entry.fingerprint,
            testName: entry.testName,
            firstSeen: entry.timestamp,
            lastSeen: entry.timestamp,
            totalRuns: 1,
            failures: entry.status === 'fail' ? 1 : 0,
            failureRate: 0,
            avgDuration: entry.duration,
          });
        } else {
          existing.lastSeen = entry.timestamp;
          existing.totalRuns++;
          if (entry.status === 'fail') existing.failures++;
          existing.avgDuration = 
            (existing.avgDuration * (existing.totalRuns - 1) + entry.duration) /
            existing.totalRuns;
        }
      });

      trendsByFingerprint.forEach(trend => {
        trend.failureRate = trend.failures / trend.totalRuns;
      });

      const trends = Array.from(trendsByFingerprint.values());
      expect(trends).toHaveLength(3);

      const topOffenders = trends
        .sort((a, b) => b.failureRate - a.failureRate)
        .slice(0, 2);

      expect(topOffenders[0].testName).toBe('flaky network test');
      expect(topOffenders[0].failureRate).toBeGreaterThan(0.2);
    });
  });
});
