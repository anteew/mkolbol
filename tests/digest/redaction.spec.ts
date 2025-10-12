import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DigestGenerator, DigestConfig, DigestEvent } from '../../src/digest/generator';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('DigestGenerator - Secret Redaction', () => {
  let tmpDir: string;
  let artifactPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'digest-redaction-test-'));
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

  describe('JWT token redaction', () => {
    it('redacts JWT tokens in payload', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'auth.fail',
          payload: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
          }
        }
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

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      expect(digest!.events[0].payload).toEqual({ token: '[REDACTED:jwt]' });
    });

    it('redacts JWT tokens in string fields', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'auth.fail',
          payload: {
            message: 'Failed with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
          }
        }
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

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events[0].payload as any;
      expect(payload.message).toContain('[REDACTED:jwt]');
      expect(payload.message).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });

  describe('AWS credentials redaction', () => {
    it('redacts AWS access keys', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'aws.fail',
          payload: {
            key: 'AKIAIOSFODNN7EXAMPLE'
          }
        }
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

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      expect(digest!.events[0].payload).toEqual({ key: '[REDACTED:aws-key]' });
    });

    it('redacts AWS secret keys', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'aws.fail',
          payload: {
            config: 'aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
          }
        }
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

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events[0].payload as any;
      expect(payload.config).toContain('[REDACTED:aws-secret]');
    });
  });

  describe('API key redaction', () => {
    it('redacts API keys', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'api.fail',
          payload: {
            key: 'api_key: zz_live_1234567890abcdefghijklmnop'
          }
        }
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

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events[0].payload as any;
      expect(payload.key).toContain('[REDACTED:api-key]');
    });
  });

  describe('URL credentials redaction', () => {
    it('redacts credentials from URLs', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'db.fail',
          payload: {
            url: 'postgres://user:password123@db.example.com:5432/mydb'
          }
        }
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

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events[0].payload as any;
      expect(payload.url).toContain('[REDACTED:url-creds]');
      expect(payload.url).toContain('db.example.com');
      expect(payload.url).not.toContain('password123');
    });
  });

  describe('Private key redaction', () => {
    it('redacts RSA private keys', async () => {
      const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF0W/F5ADZiGD5WqNGGIqgYnRD
-----END RSA PRIVATE KEY-----`;
      
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'crypto.fail',
          payload: {
            key: privateKey
          }
        }
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

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      expect(digest!.events[0].payload).toEqual({ key: '[REDACTED:private-key]' });
    });
  });

  describe('Configuration options', () => {
    it('respects optOut flag', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'auth.fail',
          payload: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
          }
        }
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        redaction: {
          optOut: true
        },
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }]
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBe(0);
      const payload = digest!.events[0].payload as any;
      expect(payload.token).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('respects secrets=false flag', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'auth.fail',
          payload: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
          }
        }
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        redaction: {
          secrets: false
        },
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }]
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBe(0);
      const payload = digest!.events[0].payload as any;
      expect(payload.token).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('respects enabled=false flag', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'auth.fail',
          payload: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
          }
        }
      ];
      createSyntheticLogs(events);

      const config: DigestConfig = {
        enabled: true,
        redaction: {
          enabled: false
        },
        rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }]
      };

      const generator = new DigestGenerator(config);
      const digest = await generator.generateDigest(
        'test-1',
        'fail',
        1000,
        'test.spec.ts:10',
        artifactPath
      );

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBe(0);
      const payload = digest!.events[0].payload as any;
      expect(payload.token).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });

  describe('nested object redaction', () => {
    it('redacts secrets in nested objects', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'config.fail',
          payload: {
            database: {
              connection: {
                url: 'postgres://admin:secret123@db.host.com/prod'
              }
            },
            auth: {
              jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
            }
          }
        }
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

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events[0].payload as any;
      expect(payload.database.connection.url).toContain('[REDACTED:url-creds]');
      expect(payload.database.connection.url).not.toContain('secret123');
      expect(payload.auth.jwt).toBe('[REDACTED:jwt]');
    });

    it('redacts secrets in arrays', async () => {
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'multi.fail',
          payload: {
            tokens: [
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIn0.anothertoken'
            ]
          }
        }
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

      expect(digest).not.toBeNull();
      expect(digest!.summary.redactedFields).toBeGreaterThan(0);
      const payload = digest!.events[0].payload as any;
      expect(payload.tokens[0]).toBe('[REDACTED:jwt]');
      expect(payload.tokens[1]).toBe('[REDACTED:jwt]');
    });
  });
});
