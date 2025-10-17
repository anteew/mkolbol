import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DigestGenerator, DigestConfig, DigestEvent } from '../../src/digest/generator';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('DigestGenerator - Rule Packs and Redaction', () => {
  let tmpDir: string;
  let artifactPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'digest-rulepacks-test-'));
    artifactPath = path.join(tmpDir, 'test.jsonl');
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  const createSyntheticLogs = (events: DigestEvent[]): void => {
    const lines = events.map((e) => JSON.stringify(e)).join('\n');
    fs.writeFileSync(artifactPath, lines);
  };

  describe('Rule Pack Extension - node-defaults', () => {
    it('captures error events', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'custom.error',
          id: '2',
          payload: { msg: 'Error occurred' },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { lvl: 'error' },
            actions: [{ type: 'include' }],
            priority: 10,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.length).toBeGreaterThan(0);
      expect(digest!.events.some((e) => e.lvl === 'error')).toBe(true);
    });

    it('captures assertion failures', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 1500,
          lvl: 'info',
          case: 'test-1',
          evt: 'log.info',
          id: '1.5',
          payload: { msg: 'Before assertion' },
        },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'assert.fail',
          id: '2',
          payload: { expected: 5, actual: 3 },
        },
        {
          ts: 2500,
          lvl: 'info',
          case: 'test-1',
          evt: 'log.info',
          id: '2.5',
          payload: { msg: 'After assertion' },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { evt: 'assert.fail' },
            actions: [{ type: 'include' }, { type: 'slice', window: 1 }],
            priority: 9,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.some((e) => e.evt === 'assert.fail')).toBe(true);
    });

    it('captures console output', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'console.error',
          id: '2',
          payload: { msg: 'Error message' },
        },
        {
          ts: 2500,
          lvl: 'warn',
          case: 'test-1',
          evt: 'console.warn',
          id: '2.5',
          payload: { msg: 'Warning message' },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { evt: ['console.error', 'console.warn'] },
            actions: [{ type: 'include' }],
            priority: 7,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.some((e) => e.evt === 'console.error')).toBe(true);
      expect(digest!.events.some((e) => e.evt === 'console.warn')).toBe(true);
    });

    it('captures test errors', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'test.error',
          id: '2',
          payload: { error: 'Test failed' },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { evt: 'test.error' },
            actions: [{ type: 'include' }, { type: 'slice', window: 5 }],
            priority: 8,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.some((e) => e.evt === 'test.error')).toBe(true);
    });
  });

  describe('Rule Pack Extension - go-defaults', () => {
    it('captures test failures and panics', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'TestExample', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'TestExample',
          evt: 'test.fail',
          id: '2',
          payload: { error: 'Expected 5, got 3' },
        },
        { ts: 3000, lvl: 'info', case: 'TestExample', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { evt: ['test.fail', 'test.panic'] },
            actions: [{ type: 'include' }, { type: 'slice', window: 10 }],
            priority: 9,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'TestExample',
        'fail',
        3000,
        'calc_test.go:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.some((e) => e.evt === 'test.fail')).toBe(true);
    });

    it('captures race conditions', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'TestConcurrent', evt: 'test.start', id: '1' },
        { ts: 1500, lvl: 'info', case: 'TestConcurrent', evt: 'log.info', id: '1.5' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'TestConcurrent',
          evt: 'race.detected',
          id: '2',
          payload: { goroutine: 42 },
        },
        { ts: 2500, lvl: 'info', case: 'TestConcurrent', evt: 'log.info', id: '2.5' },
        { ts: 3000, lvl: 'info', case: 'TestConcurrent', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { evt: 'race.detected' },
            actions: [{ type: 'include' }, { type: 'slice', window: 1 }],
            priority: 8,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'TestConcurrent',
        'fail',
        3000,
        'concurrent_test.go:20',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.some((e) => e.evt === 'race.detected')).toBe(true);
    });

    it('captures test timeouts', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'TestLongRunning', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'TestLongRunning',
          evt: 'test.timeout',
          id: '2',
          payload: { duration: 60000 },
        },
        { ts: 3000, lvl: 'info', case: 'TestLongRunning', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { evt: 'test.timeout' },
            actions: [{ type: 'include' }, { type: 'slice', window: 15 }],
            priority: 7,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'TestLongRunning',
        'fail',
        3000,
        'timeout_test.go:15',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.some((e) => e.evt === 'test.timeout')).toBe(true);
    });
  });

  describe('Rule Merging and Priority', () => {
    it('merges multiple rules from different sources', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'custom.error', id: '2' },
        { ts: 3000, lvl: 'error', case: 'test-1', evt: 'assert.fail', id: '3' },
        { ts: 4000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '4' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { lvl: 'error' },
            actions: [{ type: 'include' }],
            priority: 10,
          },
          {
            match: { evt: 'assert.fail' },
            actions: [{ type: 'include' }, { type: 'slice', window: 5 }],
            priority: 9,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        4000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.length).toBeGreaterThan(0);
      expect(digest!.events.some((e) => e.lvl === 'error')).toBe(true);
    });

    it('applies higher priority rules first', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'critical.error', id: '2' },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { evt: 'critical.error' },
            actions: [{ type: 'include' }],
            priority: 15,
          },
          {
            match: { lvl: 'error' },
            actions: [{ type: 'include' }],
            priority: 10,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.some((e) => e.evt === 'critical.error')).toBe(true);
    });

    it('overrides pack rules with local high-priority rules', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'custom.event', id: '2' },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { lvl: 'error' },
            actions: [{ type: 'include' }],
            priority: 5,
          },
          {
            match: { evt: 'custom.event' },
            actions: [{ type: 'include' }],
            priority: 12,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.some((e) => e.evt === 'custom.event')).toBe(true);
    });
  });

  describe('Redaction - Node.js Test Events', () => {
    it('redacts JWT tokens in Node.js test events', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'auth.fail',
          id: '2',
          payload: {
            token:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
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
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events.find((e) => e.evt === 'auth.fail')?.payload as any;
      expect(payload.token).toBe('[REDACTED:jwt]');
    });

    it('redacts AWS credentials in test events', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'aws.config',
          id: '2',
          payload: {
            accessKey: 'AKIAIOSFODNN7EXAMPLE',
            secretKey: 'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
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
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events.find((e) => e.evt === 'aws.config')?.payload as any;
      expect(payload.accessKey).toBe('[REDACTED:aws-key]');
      expect(payload.secretKey).toContain('[REDACTED:aws-secret]');
    });

    it('redacts API keys in test events', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'api.init',
          id: '2',
          payload: {
            config: 'api_key: zz_test_abcdef123456789012345678',
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
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
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events.find((e) => e.evt === 'api.init')?.payload as any;
      expect(payload.config).toContain('[REDACTED:api-key]');
    });

    it('redacts URL credentials in test events', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'db.connect',
          id: '2',
          payload: {
            url: 'postgres://admin:supersecret@db.example.com:5432/mydb',
            mongoUrl: 'mongodb://user:password123@mongo.host.com:27017/testdb',
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
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
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events.find((e) => e.evt === 'db.connect')?.payload as any;
      expect(payload.url).toContain('[REDACTED:url-creds]');
      expect(payload.url).toContain('db.example.com');
      expect(payload.mongoUrl).toContain('[REDACTED:url-creds]');
      expect(payload.mongoUrl).toContain('mongo.host.com');
    });

    it('redacts private keys in test events', async () => {
      const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF0W/F5ADZiGD5WqNGGIqgYnRD
-----END RSA PRIVATE KEY-----`;

      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'crypto.load',
          id: '2',
          payload: {
            privateKey,
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
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
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events.find((e) => e.evt === 'crypto.load')?.payload as any;
      expect(payload.privateKey).toBe('[REDACTED:private-key]');
    });
  });

  describe('Redaction - Go Test Events', () => {
    it('redacts secrets in Go test output', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'TestAuth', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'TestAuth',
          evt: 'test.fail',
          id: '2',
          payload: {
            output:
              'Token mismatch: got eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          },
        },
        { ts: 3000, lvl: 'info', case: 'TestAuth', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [{ match: { evt: 'test.fail' }, actions: [{ type: 'include' }] }],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'TestAuth',
        'fail',
        3000,
        'auth_test.go:25',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events.find((e) => e.evt === 'test.fail')?.payload as any;
      expect(payload.output).toContain('[REDACTED:jwt]');
      expect(payload.output).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('redacts AWS credentials in Go test logs', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'TestS3Upload', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'TestS3Upload',
          evt: 'test.fail',
          id: '2',
          payload: {
            error: 'Failed to connect with key AKIAIOSFODNN7EXAMPLE',
          },
        },
        { ts: 3000, lvl: 'info', case: 'TestS3Upload', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [{ match: { evt: 'test.fail' }, actions: [{ type: 'include' }] }],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'TestS3Upload',
        'fail',
        3000,
        's3_test.go:45',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events.find((e) => e.evt === 'test.fail')?.payload as any;
      expect(payload.error).toContain('[REDACTED:aws-key]');
    });

    it('redacts database URLs in Go test failures', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'TestDatabaseConnection', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'TestDatabaseConnection',
          evt: 'test.panic',
          id: '2',
          payload: {
            panic: 'cannot connect to postgres://dbuser:dbpass@localhost:5432/testdb',
          },
        },
        { ts: 3000, lvl: 'info', case: 'TestDatabaseConnection', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [{ match: { evt: 'test.panic' }, actions: [{ type: 'include' }] }],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'TestDatabaseConnection',
        'fail',
        3000,
        'db_test.go:15',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events.find((e) => e.evt === 'test.panic')?.payload as any;
      expect(payload.panic).toContain('[REDACTED:url-creds]');
      expect(payload.panic).toContain('localhost:5432');
    });
  });

  describe('Opt-out Mechanisms', () => {
    it('respects global optOut flag', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'auth.fail',
          id: '2',
          payload: {
            token:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        redaction: {
          optOut: true,
        },
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBe(0);
      const payload = digest!.events.find((e) => e.evt === 'auth.fail')?.payload as any;
      expect(payload.token).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('respects secrets=false flag', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'aws.config',
          id: '2',
          payload: {
            accessKey: 'AKIAIOSFODNN7EXAMPLE',
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        redaction: {
          secrets: false,
        },
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBe(0);
      const payload = digest!.events.find((e) => e.evt === 'aws.config')?.payload as any;
      expect(payload.accessKey).toBe('AKIAIOSFODNN7EXAMPLE');
    });

    it('respects enabled=false flag', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'db.connect',
          id: '2',
          payload: {
            url: 'postgres://admin:supersecret@db.example.com:5432/mydb',
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        redaction: {
          enabled: false,
        },
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBe(0);
      const payload = digest!.events.find((e) => e.evt === 'db.connect')?.payload as any;
      expect(payload.url).toBe('postgres://admin:supersecret@db.example.com:5432/mydb');
    });
  });

  describe('All Secret Patterns', () => {
    it('detects and redacts all secret types in one event', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'security.audit',
          id: '2',
          payload: {
            jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
            awsKey: 'AKIAIOSFODNN7EXAMPLE',
            awsSecret: 'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            apiKey: 'api_key: zz_live_abcdefghijklmnopqrstuvwxyz',
            dbUrl: 'mysql://root:password123@localhost:3306/production',
            privateKey:
              '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn\n-----END RSA PRIVATE KEY-----',
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
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
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBe(6);
      const payload = digest!.events.find((e) => e.evt === 'security.audit')?.payload as any;
      expect(payload.jwt).toBe('[REDACTED:jwt]');
      expect(payload.awsKey).toBe('[REDACTED:aws-key]');
      expect(payload.awsSecret).toContain('[REDACTED:aws-secret]');
      expect(payload.apiKey).toContain('[REDACTED:api-key]');
      expect(payload.dbUrl).toContain('[REDACTED:url-creds]');
      expect(payload.privateKey).toBe('[REDACTED:private-key]');
    });

    it('redacts multiple occurrences of the same secret type', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'multi.tokens',
          id: '2',
          payload: {
            tokens: [
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
              'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ0ZXN0In0.abcdefghijklmnopqrstuvwxyz1234567890',
              'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MTYyMzkwMjJ9.signature_here_with_base64',
            ],
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
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
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBe(3);
      const payload = digest!.events.find((e) => e.evt === 'multi.tokens')?.payload as any;
      expect(payload.tokens[0]).toBe('[REDACTED:jwt]');
      expect(payload.tokens[1]).toBe('[REDACTED:jwt]');
      expect(payload.tokens[2]).toBe('[REDACTED:jwt]');
    });

    it('handles nested secrets in complex objects', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        {
          ts: 2000,
          lvl: 'error',
          case: 'test-1',
          evt: 'config.load',
          id: '2',
          payload: {
            services: {
              database: {
                primary: {
                  url: 'postgres://admin:secret123@db1.example.com/prod',
                },
                replica: {
                  url: 'postgres://readonly:pass456@db2.example.com/prod',
                },
              },
              auth: {
                providers: [
                  {
                    name: 'jwt',
                    token:
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
                  },
                  {
                    name: 'aws',
                    key: 'AKIAIOSFODNN7EXAMPLE',
                  },
                ],
              },
            },
          },
        },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
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
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBe(4);
      const payload = digest!.events.find((e) => e.evt === 'config.load')?.payload as any;
      expect(payload.services.database.primary.url).toContain('[REDACTED:url-creds]');
      expect(payload.services.database.replica.url).toContain('[REDACTED:url-creds]');
      expect(payload.services.auth.providers[0].token).toBe('[REDACTED:jwt]');
      expect(payload.services.auth.providers[1].key).toBe('[REDACTED:aws-key]');
    });
  });

  describe('Combining Multiple Packs', () => {
    it('combines rules from node-defaults and custom rules', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'test-1', evt: 'test.start', id: '1' },
        { ts: 1500, lvl: 'error', case: 'test-1', evt: 'assert.fail', id: '1.5' },
        { ts: 2000, lvl: 'error', case: 'test-1', evt: 'custom.event', id: '2' },
        { ts: 3000, lvl: 'info', case: 'test-1', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { lvl: 'error' },
            actions: [{ type: 'include' }],
            priority: 10,
          },
          {
            match: { evt: 'assert.fail' },
            actions: [{ type: 'include' }, { type: 'slice', window: 10 }],
            priority: 9,
          },
          {
            match: { evt: 'custom.event' },
            actions: [{ type: 'include' }],
            priority: 11,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        3000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.some((e) => e.evt === 'assert.fail')).toBe(true);
      expect(digest!.events.some((e) => e.evt === 'custom.event')).toBe(true);
    });

    it('combines rules from go-defaults and custom rules', async () => {
      const events: DigestEvent[] = [
        { ts: 1000, lvl: 'info', case: 'TestExample', evt: 'test.start', id: '1' },
        { ts: 1500, lvl: 'error', case: 'TestExample', evt: 'test.fail', id: '1.5' },
        { ts: 2000, lvl: 'error', case: 'TestExample', evt: 'race.detected', id: '2' },
        { ts: 2500, lvl: 'warn', case: 'TestExample', evt: 'perf.warning', id: '2.5' },
        { ts: 3000, lvl: 'info', case: 'TestExample', evt: 'test.end', id: '3' },
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        rules: [
          {
            match: { evt: ['test.fail', 'test.panic'] },
            actions: [{ type: 'include' }, { type: 'slice', window: 10 }],
            priority: 9,
          },
          {
            match: { evt: 'race.detected' },
            actions: [{ type: 'include' }, { type: 'slice', window: 20 }],
            priority: 8,
          },
          {
            match: { evt: 'perf.warning' },
            actions: [{ type: 'include' }],
            priority: 6,
          },
        ],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'TestExample',
        'fail',
        3000,
        'example_test.go:30',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.some((e) => e.evt === 'test.fail')).toBe(true);
      expect(digest!.events.some((e) => e.evt === 'race.detected')).toBe(true);
      expect(digest!.events.some((e) => e.evt === 'perf.warning')).toBe(true);
    });
  });

  describe('Budget Enforcement with Redaction', () => {
    it('enforces budget after redaction', async () => {
      const events: DigestEvent[] = Array.from({ length: 300 }, (_, i) => ({
        ts: 1000 + i * 10,
        lvl: i % 10 === 0 ? 'error' : 'info',
        case: 'test-1',
        evt: i % 10 === 0 ? 'error.event' : 'log.event',
        id: `${i}`,
        payload: {
          token:
            i % 10 === 0
              ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
              : undefined,
          data: `Event ${i}`,
        },
      }));
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        budget: {
          lines: 50,
        },
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }],
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        4000,
        'test.spec.ts:10',
        artifactPath,
      );

      expect(digest).not.toBeNull();
      expect(digest!.events.length).toBeLessThanOrEqual(50);
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      expect(digest!.summary.includedEvents).toBeLessThanOrEqual(50);
    });
  });
});
