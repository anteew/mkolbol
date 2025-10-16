import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync, spawn, ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('mk logs command', () => {
  const mkPath = join(process.cwd(), 'dist', 'scripts', 'mk.js');
  const testDir = join(tmpdir(), 'mk-logs-test');
  const reportsDir = join(testDir, 'reports', 'test-suite');
  const testLogPath = join(reportsDir, 'test.case.jsonl');

  beforeAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(reportsDir, { recursive: true });

    const logEntries = [
      {
        ts: Date.now() - 5000,
        lvl: 'error',
        case: 'test.case',
        evt: 'debug.kernel.pipe.error',
        payload: { pipeId: 'pipe-1', error: 'connection failed' },
      },
      {
        ts: Date.now() - 4000,
        lvl: 'warn',
        case: 'test.case',
        evt: 'debug.router.sweep.stale',
        payload: { serverId: 'server-1', ttl: 5000 },
      },
      {
        ts: Date.now() - 3000,
        lvl: 'info',
        case: 'test.case',
        evt: 'debug.kernel.pipe.connect',
        payload: { fromId: 'node-1', toId: 'node-2' },
      },
      {
        ts: Date.now() - 2000,
        lvl: 'debug',
        case: 'test.case',
        evt: 'debug.executor.start',
        payload: { nodeCount: 3 },
      },
      {
        ts: Date.now() - 1000,
        lvl: 'info',
        case: 'test.case',
        evt: 'debug.filesystem-sink.write',
        payload: { path: '/tmp/output.txt', bytes: 1024 },
      },
    ];

    const logContent = logEntries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    writeFileSync(testLogPath, logContent);
  });

  afterAll(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  it('shows help when --help flag is used', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--help'], { encoding: 'utf8' });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Tail module logs with filtering');
    expect(r.stdout).toContain('Usage: mk logs');
  });

  it('tails logs in human-readable format by default', () => {
    const r = spawnSync('node', [mkPath, 'logs'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('kernel');
    expect(r.stdout).toContain('router');
    expect(r.stdout).toContain('executor');
    expect(r.stdout).toContain('filesystem-sink');
  });

  it('filters logs by module name', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--module', 'kernel'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('kernel');
    expect(r.stdout).not.toContain('router');
    expect(r.stdout).not.toContain('executor');
  });

  it('filters logs by level (error)', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--level', 'error'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('ERROR');
    expect(r.stdout).not.toContain('WARN');
    expect(r.stdout).not.toContain('INFO');
    expect(r.stdout).not.toContain('DEBUG');
  });

  it('filters logs by level (warn) includes error and warn', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--level', 'warn'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('ERROR');
    expect(r.stdout).toContain('WARN');
    expect(r.stdout).not.toContain('INFO');
    expect(r.stdout).not.toContain('DEBUG');
  });

  it('filters logs by level (info) includes error, warn, and info', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--level', 'info'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('ERROR');
    expect(r.stdout).toContain('WARN');
    expect(r.stdout).toContain('INFO');
    expect(r.stdout).not.toContain('DEBUG');
  });

  it('outputs logs in JSON format with --json flag', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--json'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);

    const lines = r.stdout.trim().split('\n');
    expect(lines.length).toBeGreaterThan(0);

    const firstLog = JSON.parse(lines[0]);
    expect(firstLog).toHaveProperty('timestamp');
    expect(firstLog).toHaveProperty('level');
    expect(firstLog).toHaveProperty('module');
    expect(firstLog).toHaveProperty('event');
  });

  it('combines multiple filters (module and level)', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--module', 'kernel', '--level', 'error'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('kernel');
    expect(r.stdout).toContain('ERROR');
    expect(r.stdout).not.toContain('router');
    expect(r.stdout).not.toContain('INFO');
  });

  it('limits output lines with --lines flag', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--lines', '2'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    const lines = r.stdout.trim().split('\n').filter(l => l.length > 0);
    expect(lines.length).toBeLessThanOrEqual(2);
  });

  it('shows error for invalid level', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--level', 'invalid'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(64);
    expect(r.stderr).toContain('Invalid level');
  });

  it('shows error for invalid --lines value', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--lines', 'abc'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(64);
    expect(r.stderr).toContain('Invalid --lines value');
  });

  it('accepts -f as short form of --follow', () => {
    const proc = spawn('node', [mkPath, 'logs', '-f'], {
      cwd: testDir,
      stdio: 'pipe',
    });

    let stderr = '';
    proc.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    setTimeout(() => {
      proc.kill('SIGTERM');
    }, 500);

    return new Promise<void>((resolve) => {
      proc.on('exit', () => {
        expect(stderr).toContain('Following logs from');
        resolve();
      });
    });
  });

  it('shows human-readable timestamps in output', () => {
    const r = spawnSync('node', [mkPath, 'logs'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
  });

  it('includes payload in human-readable output', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--module', 'kernel', '--level', 'error'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('pipeId');
    expect(r.stdout).toContain('pipe-1');
    expect(r.stdout).toContain('connection failed');
  });

  it('handles empty reports directory gracefully', () => {
    const emptyDir = join(tmpdir(), 'mk-logs-empty');
    if (existsSync(emptyDir)) {
      rmSync(emptyDir, { recursive: true, force: true });
    }
    mkdirSync(emptyDir, { recursive: true });

    const r = spawnSync('node', [mkPath, 'logs'], {
      encoding: 'utf8',
      cwd: emptyDir,
    });

    expect(r.status).toBe(0);
    expect(r.stderr).toContain('Debug logging is not enabled');

    rmSync(emptyDir, { recursive: true, force: true });
  });

  it('displays module names padded in human format', () => {
    const r = spawnSync('node', [mkPath, 'logs'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\[kernel\s+\]/);
    expect(r.stdout).toMatch(/\[router\s+\]/);
  });

  it('shows event names after module', () => {
    const r = spawnSync('node', [mkPath, 'logs', '--module', 'kernel'], {
      encoding: 'utf8',
      cwd: testDir,
    });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('pipe.error');
    expect(r.stdout).toContain('pipe.connect');
  });
});
