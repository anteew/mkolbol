import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DigestGenerator, DigestConfig, DigestEvent } from '../../src/digest/generator';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('DigestGenerator - Redaction Edge Cases', () => {
  let tmpDir: string;
  let artifactPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'digest-redaction-edge-test-'));
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

  describe('deeply nested structures', () => {
    it('redacts secrets 5 levels deep', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'deep.fail',
          payload: {
            level1: {
              level2: {
                level3: {
                  level4: {
                    level5: {
                      secret: jwtToken,
                      apiKey: 'zz_live_abcdef1234567890'
                    }
                  }
                }
              }
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
      expect(payload.level1.level2.level3.level4.level5.secret).toBe('[REDACTED:jwt]');
      expect(payload.level1.level2.level3.level4.level5.apiKey).toBe('[REDACTED:api-key]');
    });

    it('redacts secrets in mixed nested structures (objects in arrays in objects)', async () => {
      const jwtToken1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc';
      const jwtToken2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.xyz';
      const awsKey = 'AKIAIOSFODNN7EXAMPLE';
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'mixed.fail',
          payload: {
            services: [
              {
                name: 'auth-service',
                config: {
                  tokens: [jwtToken1, jwtToken2],
                  credentials: {
                    apiKey: 'zz_live_1234567890abcdefgh'
                  }
                }
              },
              {
                name: 'db-service',
                config: {
                  connections: [
                    {
                      url: 'postgres://user:pass@host/db',
                      backup: {
                        credentials: awsKey
                      }
                    }
                  ]
                }
              }
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
      expect(payload.services[0].config.tokens[0]).toBe('[REDACTED:jwt]');
      expect(payload.services[0].config.tokens[1]).toBe('[REDACTED:jwt]');
      expect(payload.services[0].config.credentials.apiKey).toBe('[REDACTED:api-key]');
      expect(payload.services[1].config.connections[0].url).toBe('postgres://[REDACTED:url-creds]@host/db');
      expect(payload.services[1].config.connections[0].backup.credentials).toBe('[REDACTED:aws-key]');
    });
  });

  describe('long strings', () => {
    it('redacts secrets in long strings (~1KB)', async () => {
      const longPrefix = 'x'.repeat(500);
      const longSuffix = 'y'.repeat(500);
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'long.fail',
          payload: {
            log: `${longPrefix} token=${jwtToken} ${longSuffix}`,
            config: `${longPrefix} zz_live_1234567890abcdef ${longSuffix}`
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
      expect(payload.log).toContain('[REDACTED:jwt]');
      expect(payload.log).toContain(longPrefix);
      expect(payload.log).toContain(longSuffix);
      expect(payload.log).not.toContain(jwtToken);
      expect(payload.config).toContain('[REDACTED:api-key]');
      expect(payload.config).toContain(longPrefix);
      expect(payload.config).toContain(longSuffix);
    });
  });

  describe('unicode', () => {
    it('redacts secrets with unicode characters', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'unicode.fail',
          payload: {
            message: `用户认证失败 token=${jwtToken} 🔐`,
            error: 'Erreur d\'authentification: zz_live_1234567890abcdef',
            config: 'データベース接続: postgres://user:パスワード@db.example.com/db'
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
      expect(payload.message).toContain('用户认证失败');
      expect(payload.message).toContain('🔐');
      expect(payload.message).not.toContain(jwtToken);
      expect(payload.error).toContain('[REDACTED:api-key]');
      expect(payload.error).toContain('Erreur');
      expect(payload.config).toContain('[REDACTED:url-creds]');
      expect(payload.config).toContain('データベース接続');
    });
  });

  describe('null/undefined/empty', () => {
    it('handles null values without error', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc';
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'null.fail',
          payload: {
            value: null,
            nested: {
              key: null,
              token: jwtToken
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
      const payload = digest!.events[0].payload as any;
      expect(payload.value).toBeNull();
      expect(payload.nested.key).toBeNull();
      expect(payload.nested.token).toBe('[REDACTED:jwt]');
    });

    it('handles undefined values without error', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc';
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'undef.fail',
          payload: {
            value: undefined,
            nested: {
              key: undefined,
              token: jwtToken
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
      const payload = digest!.events[0].payload as any;
      expect(payload.nested.token).toBe('[REDACTED:jwt]');
    });

    it('handles empty strings', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc';
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'empty.fail',
          payload: {
            empty: '',
            nested: {
              value: '',
              token: jwtToken
            },
            array: ['', jwtToken, '']
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
      const payload = digest!.events[0].payload as any;
      expect(payload.empty).toBe('');
      expect(payload.nested.value).toBe('');
      expect(payload.nested.token).toBe('[REDACTED:jwt]');
      expect(payload.array[0]).toBe('');
      expect(payload.array[1]).toBe('[REDACTED:jwt]');
      expect(payload.array[2]).toBe('');
    });

    it('handles empty arrays and objects', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc';
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'empty-struct.fail',
          payload: {
            emptyArray: [],
            emptyObject: {},
            nested: {
              emptyArray: [],
              token: jwtToken
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
      const payload = digest!.events[0].payload as any;
      expect(payload.emptyArray).toEqual([]);
      expect(payload.emptyObject).toEqual({});
      expect(payload.nested.emptyArray).toEqual([]);
      expect(payload.nested.token).toBe('[REDACTED:jwt]');
    });
  });

  describe('arrays of objects with secrets', () => {
    it('redacts secrets in arrays of objects', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc';
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'array-obj.fail',
          payload: {
            users: [
              { name: 'user1', token: jwtToken },
              { name: 'user2', apiKey: 'zz_live_xyz1234567890abcd' },
              { name: 'user3', password: 'plain-text-pass' }
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
      const payload = digest!.events[0].payload as any;
      expect(payload.users[0].token).toBe('[REDACTED:jwt]');
      expect(payload.users[1].apiKey).toBe('[REDACTED:api-key]');
      expect(payload.users[0].name).toBe('user1');
      expect(payload.users[1].name).toBe('user2');
    });

    it('redacts multiple secret types in single array', async () => {
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc';
      const awsKey = 'AKIAIOSFODNN7EXAMPLE';
      const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJ...\n-----END RSA PRIVATE KEY-----';
      const events: DigestEvent[] = [
        {
          ts: 1000,
          lvl: 'error',
          case: 'test-1',
          evt: 'multi-secret.fail',
          payload: {
            secrets: [
              jwtToken,
              awsKey,
              'zz_test_1234567890abcdef',
              'postgres://admin:secret@host/db',
              privateKey
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
      expect(payload.secrets[0]).toBe('[REDACTED:jwt]');
      expect(payload.secrets[1]).toBe('[REDACTED:aws-key]');
      expect(payload.secrets[2]).toBe('[REDACTED:api-key]');
      expect(payload.secrets[3]).toBe('postgres://[REDACTED:url-creds]@host/db');
      expect(payload.secrets[4]).toBe('[REDACTED:private-key]');
    });
  });
});
