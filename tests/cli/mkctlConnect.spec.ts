import { describe, it, expect } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';

describe('mkctl connect', () => {
  const mkctlPath = resolve(__dirname, '../../scripts/mkctl.ts');

  function spawnMkctl(
    args: string[],
    timeout = 5000,
  ): {
    proc: ChildProcess;
    result: Promise<{ stdout: string; stderr: string; code: number | null }>;
  } {
    const proc = spawn('tsx', [mkctlPath, ...args], {
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    const result = new Promise<{ stdout: string; stderr: string; code: number | null }>(
      (resolve, reject) => {
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
      },
    );

    return { proc, result };
  }

  it('shows error when --url is not provided', async () => {
    const { result } = spawnMkctl(['connect']);
    const outcome = await result;

    expect(outcome.code).toBe(EXIT_CODES.USAGE);
    expect(outcome.stderr).toContain('--url');
  });

  it('shows error for invalid URL format', async () => {
    const { result } = spawnMkctl(['connect', '--url', 'invalid-url']);
    const outcome = await result;

    expect(outcome.code).toBe(EXIT_CODES.USAGE);
    expect(outcome.stderr).toContain('Invalid URL format');
  });

  it('shows error for invalid TCP URL without port', async () => {
    const { result } = spawnMkctl(['connect', '--url', 'tcp://localhost']);
    const outcome = await result;

    expect(outcome.code).toBe(EXIT_CODES.USAGE);
    expect(outcome.stderr).toContain('Invalid URL format');
  });

  it('shows error for invalid WebSocket URL without port', async () => {
    const { result } = spawnMkctl(['connect', '--url', 'ws://localhost']);
    const outcome = await result;

    expect(outcome.code).toBe(EXIT_CODES.USAGE);
    expect(outcome.stderr).toContain('Invalid URL format');
  });

  it('accepts valid TCP URL format', async () => {
    const { result } = spawnMkctl(['connect', '--url', 'tcp://localhost:9999'], 2000);
    const outcome = await result;

    // Connection will fail since no server is running, but URL parsing should succeed
    expect(outcome.stderr).toContain('Connecting to tcp://localhost:9999');
  });

  it('accepts valid WebSocket URL format', async () => {
    const { result } = spawnMkctl(['connect', '--url', 'ws://localhost:9999/path'], 2000);
    const outcome = await result;

    // Connection will fail since no server is running, but URL parsing should succeed
    expect(outcome.stderr).toContain('Connecting to ws://localhost:9999/path');
  });

  it('accepts WebSocket URL without path', async () => {
    const { result } = spawnMkctl(['connect', '--url', 'ws://localhost:9999'], 2000);
    const outcome = await result;

    // Connection will fail since no server is running, but URL parsing should succeed
    expect(outcome.stderr).toContain('Connecting to ws://localhost:9999');
  });

  it('rejects invalid port numbers', async () => {
    const { result } = spawnMkctl(['connect', '--url', 'tcp://localhost:99999']);
    const outcome = await result;

    expect(outcome.code).toBe(EXIT_CODES.USAGE);
    expect(outcome.stderr).toContain('Invalid port');
  });

  it('accepts --json flag', async () => {
    const { result } = spawnMkctl(['connect', '--url', 'tcp://localhost:9999', '--json'], 2000);
    const outcome = await result;

    // URL should be parsed successfully even though connection will fail
    expect(outcome.stderr).toContain('Connecting to tcp://localhost:9999');
  });
});

const EXIT_CODES = {
  SUCCESS: 0,
  USAGE: 64,
  RUNTIME: 70,
};
