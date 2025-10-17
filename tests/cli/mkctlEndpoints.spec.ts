import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { resolve, join } from 'path';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, unlinkSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('mkctl endpoints', () => {
  const mkctlPath = resolve(__dirname, '../../scripts/mkctl.ts');
let workspaceDir: string;

  beforeEach(() => {
    workspaceDir = mkdtempSync(join(tmpdir(), 'mkctl-endpoints-'));
    cleanupSnapshots();
  });

  afterEach(() => {
    cleanupSnapshots();
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  function cleanupSnapshots() {
    const routerPath = join(workspaceDir, 'reports', 'router-endpoints.json');
    const hostessPath = join(workspaceDir, 'reports', 'endpoints.json');
    if (existsSync(routerPath)) unlinkSync(routerPath);
    if (existsSync(hostessPath)) unlinkSync(hostessPath);
  }

  function spawnMkctl(args: string[], timeout = 5000): { proc: ChildProcess; result: Promise<{ stdout: string; stderr: string; code: number | null }> } {
    const proc = spawn('tsx', [mkctlPath, ...args], {
      cwd: workspaceDir,
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const result = new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve, reject) => {
      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
      }, timeout);

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, code });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    return { proc, result };
  }

  it('reports when no snapshot is available', async () => {
    const { result } = spawnMkctl(['endpoints']);
    const outcome = await result;

    expect(outcome.code).toBe(EXIT_CODES.SUCCESS);
    expect(outcome.stdout).toContain('No endpoints registered');
  });

  it('lists router snapshot after mkctl run', async () => {
    const configPath = join(workspaceDir, 'router-demo.yml');
    writeFileSync(configPath, `nodes:
  - id: timer1
    module: TimerSource
    params:
      periodMs: 100
  - id: sink1
    module: ConsoleSink
    params:
      prefix: "[router]"
connections:
  - from: timer1.output
    to: sink1.input
`);

    const run = spawnMkctl(['run', '--file', configPath, '--duration', '1'], 12000);
    const runOutcome = await run.result;
    expect(runOutcome.code).toBe(EXIT_CODES.SUCCESS);
    const snapshotPath = join(workspaceDir, 'reports', 'router-endpoints.json');
    expect(existsSync(snapshotPath)).toBe(true);

    const endpoints = spawnMkctl(['endpoints']);
    const endpointsOutcome = await endpoints.result;
    expect(endpointsOutcome.code).toBe(EXIT_CODES.SUCCESS);
    expect(endpointsOutcome.stdout).toContain('RoutingServer snapshot');
    expect(endpointsOutcome.stdout).toContain('node:timer1');
    expect(endpointsOutcome.stdout).toContain('node:sink1');
  });

  it('filters endpoints by type', async () => {
    const snapshotPath = join(workspaceDir, 'reports', 'router-endpoints.json');
    mkdirSync(join(workspaceDir, 'reports'), { recursive: true });
    writeFileSync(snapshotPath, JSON.stringify([
      { id: 'ep1', type: 'inproc', coordinates: 'node:ep1', metadata: {}, announcedAt: Date.now(), updatedAt: Date.now() },
      { id: 'ep2', type: 'worker', coordinates: 'node:ep2', metadata: {}, announcedAt: Date.now(), updatedAt: Date.now() },
      { id: 'ep3', type: 'inproc', coordinates: 'node:ep3', metadata: {}, announcedAt: Date.now(), updatedAt: Date.now() }
    ]));

    const result = spawnMkctl(['endpoints', '--filter', 'type=inproc']);
    const outcome = await result.result;

    expect(outcome.code).toBe(EXIT_CODES.SUCCESS);
    expect(outcome.stdout).toContain('node:ep1');
    expect(outcome.stdout).toContain('node:ep3');
    expect(outcome.stdout).not.toContain('node:ep2');
  });

  it('supports watch mode with SIGTERM', async () => {
    const snapshotPath = join(workspaceDir, 'reports', 'router-endpoints.json');
    mkdirSync(join(workspaceDir, 'reports'), { recursive: true });
    writeFileSync(snapshotPath, JSON.stringify([
      { id: 'ep1', type: 'inproc', coordinates: 'node:ep1', metadata: {}, announcedAt: Date.now(), updatedAt: Date.now() }
    ]));

    const { proc, result } = spawnMkctl(['endpoints', '--watch', '--interval', '1'], 5000);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    proc.kill('SIGTERM');

    const outcome = await result;
    expect(outcome.stdout).toContain('Watching endpoints');
    expect(outcome.stdout).toContain('Watch stopped');
  });

  it('filters no results message', async () => {
    const snapshotPath = join(workspaceDir, 'reports', 'router-endpoints.json');
    mkdirSync(join(workspaceDir, 'reports'), { recursive: true });
    writeFileSync(snapshotPath, JSON.stringify([
      { id: 'ep1', type: 'inproc', coordinates: 'node:ep1', metadata: {}, announcedAt: Date.now(), updatedAt: Date.now() }
    ]));

    const result = spawnMkctl(['endpoints', '--filter', 'type=worker']);
    const outcome = await result.result;

    expect(outcome.code).toBe(EXIT_CODES.SUCCESS);
    expect(outcome.stdout).toContain('No endpoints match the filters');
  });

  it('outputs JSON format when --json flag is used', async () => {
    const snapshotPath = join(workspaceDir, 'reports', 'router-endpoints.json');
    mkdirSync(join(workspaceDir, 'reports'), { recursive: true });
    const testData = [
      { id: 'ep1', type: 'inproc', coordinates: 'node:ep1', metadata: { module: 'TestMod' }, announcedAt: 1000, updatedAt: 2000 }
    ];
    writeFileSync(snapshotPath, JSON.stringify(testData));

    const result = spawnMkctl(['endpoints', '--json']);
    const outcome = await result.result;

    expect(outcome.code).toBe(EXIT_CODES.SUCCESS);
    const parsed = JSON.parse(outcome.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe('ep1');
  });

  it('filters by metadata fields', async () => {
    const snapshotPath = join(workspaceDir, 'reports', 'router-endpoints.json');
    mkdirSync(join(workspaceDir, 'reports'), { recursive: true });
    writeFileSync(snapshotPath, JSON.stringify([
      { id: 'ep1', type: 'inproc', coordinates: 'node:ep1', metadata: { module: 'Timer' }, announcedAt: Date.now(), updatedAt: Date.now() },
      { id: 'ep2', type: 'inproc', coordinates: 'node:ep2', metadata: { module: 'Console' }, announcedAt: Date.now(), updatedAt: Date.now() }
    ]));

    const result = spawnMkctl(['endpoints', '--filter', 'metadata.module=Timer']);
    const outcome = await result.result;

    expect(outcome.code).toBe(EXIT_CODES.SUCCESS);
    expect(outcome.stdout).toContain('node:ep1');
    expect(outcome.stdout).not.toContain('node:ep2');
  });

  it('shows liveness status in watch mode', async () => {
    const snapshotPath = join(workspaceDir, 'reports', 'router-endpoints.json');
    mkdirSync(join(workspaceDir, 'reports'), { recursive: true });
    
    const now = Date.now();
    writeFileSync(snapshotPath, JSON.stringify([
      { id: 'ep1', type: 'inproc', coordinates: 'node:ep1', metadata: {}, announcedAt: now, updatedAt: now, ttlMs: 30000 },
      { id: 'ep2', type: 'inproc', coordinates: 'node:ep2', metadata: {}, announcedAt: now - 25000, updatedAt: now - 25000, ttlMs: 30000 },
      { id: 'ep3', type: 'inproc', coordinates: 'node:ep3', metadata: {}, announcedAt: now - 35000, updatedAt: now - 35000, ttlMs: 30000 }
    ]));

    const { proc, result } = spawnMkctl(['endpoints', '--watch', '--interval', '1'], 3000);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    proc.kill('SIGTERM');

    const outcome = await result;
    expect(outcome.stdout).toContain('Status:');
    expect(outcome.stdout).toContain('TTL:');
    expect(outcome.stdout).toMatch(/✓.*healthy|⚠.*stale|✗.*expired/);
  });

  it('includes status field in JSON output', async () => {
    const snapshotPath = join(workspaceDir, 'reports', 'router-endpoints.json');
    mkdirSync(join(workspaceDir, 'reports'), { recursive: true });
    
    const now = Date.now();
    const testData = [
      { id: 'ep1', type: 'inproc', coordinates: 'node:ep1', metadata: {}, announcedAt: now, updatedAt: now, ttlMs: 30000 },
      { id: 'ep2', type: 'inproc', coordinates: 'node:ep2', metadata: {}, announcedAt: now - 25000, updatedAt: now - 25000, ttlMs: 30000 }
    ];
    writeFileSync(snapshotPath, JSON.stringify(testData));

    const result = spawnMkctl(['endpoints', '--json']);
    const outcome = await result.result;

    expect(outcome.code).toBe(EXIT_CODES.SUCCESS);
    const parsed = JSON.parse(outcome.stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toHaveProperty('status');
    expect(parsed[0]).toHaveProperty('ttlRemaining');
    expect(['healthy', 'stale', 'expired']).toContain(parsed[0].status);
  });

  it('supports --runtime-dir flag', async () => {
    const customDir = join(workspaceDir, 'custom');
    const snapshotPath = join(customDir, 'reports', 'router-endpoints.json');
    mkdirSync(join(customDir, 'reports'), { recursive: true });
    
    writeFileSync(snapshotPath, JSON.stringify([
      { id: 'ep1', type: 'inproc', coordinates: 'node:ep1', metadata: {}, announcedAt: Date.now(), updatedAt: Date.now() }
    ]));

    const result = spawnMkctl(['endpoints', '--runtime-dir', customDir]);
    const outcome = await result.result;

    expect(outcome.code).toBe(EXIT_CODES.SUCCESS);
    expect(outcome.stdout).toContain('node:ep1');
  });
});

const EXIT_CODES = {
  SUCCESS: 0,
};
