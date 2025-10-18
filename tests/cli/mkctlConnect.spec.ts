import { describe, it, expect } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';
import { parseURL, validateConnectOptions, URLParseError } from '../../src/cli/connect.js';

describe('connect module - parseURL', () => {
  describe('TCP URLs', () => {
    it('parses valid TCP URL with localhost', () => {
      const result = parseURL('tcp://localhost:30010');
      expect(result).toEqual({
        protocol: 'tcp',
        host: 'localhost',
        port: 30010,
      });
    });

    it('parses valid TCP URL with IPv4 address', () => {
      const result = parseURL('tcp://192.168.1.100:30018');
      expect(result).toEqual({
        protocol: 'tcp',
        host: '192.168.1.100',
        port: 30018,
      });
    });

    it('parses valid TCP URL with hostname', () => {
      const result = parseURL('tcp://example.com:8080');
      expect(result).toEqual({
        protocol: 'tcp',
        host: 'example.com',
        port: 8080,
      });
    });

    it('rejects TCP URL without port', () => {
      expect(() => parseURL('tcp://localhost')).toThrow(URLParseError);
      expect(() => parseURL('tcp://localhost')).toThrow('Invalid URL format');
    });

    it('rejects TCP URL with invalid port (zero)', () => {
      expect(() => parseURL('tcp://localhost:0')).toThrow(URLParseError);
      expect(() => parseURL('tcp://localhost:0')).toThrow('Port must be between 1 and 65535');
    });

    it('rejects TCP URL with invalid port (too high)', () => {
      expect(() => parseURL('tcp://localhost:99999')).toThrow(URLParseError);
      expect(() => parseURL('tcp://localhost:99999')).toThrow('Port must be between 1 and 65535');
    });

    it('rejects TCP URL with path', () => {
      expect(() => parseURL('tcp://localhost:30010/path')).toThrow(URLParseError);
      expect(() => parseURL('tcp://localhost:30010/path')).toThrow('Invalid URL format');
    });
  });

  describe('WebSocket URLs', () => {
    it('parses valid WS URL with localhost', () => {
      const result = parseURL('ws://localhost:30015');
      expect(result).toEqual({
        protocol: 'ws',
        host: 'localhost',
        port: 30015,
      });
    });

    it('parses valid WS URL with path', () => {
      const result = parseURL('ws://localhost:30015/pipe');
      expect(result).toEqual({
        protocol: 'ws',
        host: 'localhost',
        port: 30015,
        path: '/pipe',
      });
    });

    it('parses valid WS URL with IPv4 address', () => {
      const result = parseURL('ws://10.0.0.50:8080/ws');
      expect(result).toEqual({
        protocol: 'ws',
        host: '10.0.0.50',
        port: 8080,
        path: '/ws',
      });
    });

    it('rejects WS URL without port', () => {
      expect(() => parseURL('ws://localhost')).toThrow(URLParseError);
      expect(() => parseURL('ws://localhost')).toThrow('Invalid URL format');
    });

    it('rejects WS URL with invalid port', () => {
      expect(() => parseURL('ws://localhost:70000')).toThrow(URLParseError);
      expect(() => parseURL('ws://localhost:70000')).toThrow('Port must be between 1 and 65535');
    });
  });

  describe('Invalid protocols', () => {
    it('rejects HTTP URLs with helpful message', () => {
      expect(() => parseURL('http://localhost:8080')).toThrow(URLParseError);
      expect(() => parseURL('http://localhost:8080')).toThrow(
        'HTTP/HTTPS not supported. Use ws:// for WebSocket or tcp:// for TCP',
      );
    });

    it('rejects HTTPS URLs with helpful message', () => {
      expect(() => parseURL('https://example.com:443')).toThrow(URLParseError);
      expect(() => parseURL('https://example.com:443')).toThrow('HTTP/HTTPS not supported');
    });

    it('rejects unknown protocols', () => {
      expect(() => parseURL('ftp://localhost:21')).toThrow(URLParseError);
      expect(() => parseURL('ftp://localhost:21')).toThrow('Unsupported protocol: ftp');
    });

    it('rejects URLs without protocol', () => {
      expect(() => parseURL('localhost:30010')).toThrow(URLParseError);
      expect(() => parseURL('localhost:30010')).toThrow('Invalid URL format');
    });
  });

  describe('Invalid hostnames', () => {
    it('rejects empty hostname', () => {
      expect(() => parseURL('tcp://:30010')).toThrow(URLParseError);
      expect(() => parseURL('tcp://:30010')).toThrow('Invalid URL format');
    });

    it('rejects invalid IPv4 address (octet > 255)', () => {
      expect(() => parseURL('tcp://192.168.256.1:30010')).toThrow(URLParseError);
      expect(() => parseURL('tcp://192.168.256.1:30010')).toThrow('Invalid hostname');
    });

    it('rejects hostname starting with hyphen', () => {
      expect(() => parseURL('tcp://-invalid.com:8080')).toThrow(URLParseError);
      expect(() => parseURL('tcp://-invalid.com:8080')).toThrow('Invalid hostname');
    });
  });

  describe('Edge cases', () => {
    it('rejects null URL', () => {
      expect(() => parseURL(null as any)).toThrow(URLParseError);
      expect(() => parseURL(null as any)).toThrow('URL must be a non-empty string');
    });

    it('rejects undefined URL', () => {
      expect(() => parseURL(undefined as any)).toThrow(URLParseError);
      expect(() => parseURL(undefined as any)).toThrow('URL must be a non-empty string');
    });

    it('rejects empty string', () => {
      expect(() => parseURL('')).toThrow(URLParseError);
      expect(() => parseURL('')).toThrow('URL must be a non-empty string');
    });
  });
});

describe('connect module - validateConnectOptions', () => {
  it('validates valid TCP options', () => {
    expect(() => validateConnectOptions({ url: 'tcp://localhost:30010' })).not.toThrow();
  });

  it('validates valid WS options', () => {
    expect(() => validateConnectOptions({ url: 'ws://localhost:30015/pipe' })).not.toThrow();
  });

  it('rejects missing URL', () => {
    expect(() => validateConnectOptions({ url: '' })).toThrow(URLParseError);
    expect(() => validateConnectOptions({ url: '' })).toThrow('--url is required');
  });

  it('rejects invalid URL format', () => {
    expect(() => validateConnectOptions({ url: 'invalid' })).toThrow(URLParseError);
  });
});

describe('mkctl connect CLI', () => {
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
    expect(outcome.stderr).toContain('Port must be between');
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
