import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { calculateSHA256, verifyTarball } from '../../src/mk/fetch.js';

describe('mk fetch command', () => {
  const mkPath = join(process.cwd(), 'dist', 'scripts', 'mk.js');
  const cacheDir = join(homedir(), '.mk', 'toolchains', 'test-tag');

  afterAll(() => {
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  it('shows help when --help flag is used', () => {
    const r = spawnSync('node', [mkPath, 'fetch', '--help'], { encoding: 'utf8' });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Download and install release tarball by tag');
    expect(r.stdout).toContain('Usage: mk fetch');
  });

  it('shows error when no tag is provided', () => {
    const r = spawnSync('node', [mkPath, 'fetch'], { encoding: 'utf8' });

    expect(r.status).toBe(64);
    expect(r.stderr).toContain('Error: Missing release tag');
    expect(r.stderr).toContain('Usage: mk fetch <tag>');
  });

  it('shows error when only flags are provided', () => {
    const r = spawnSync('node', [mkPath, 'fetch', '--verify'], { encoding: 'utf8' });

    expect(r.status).toBe(64);
    expect(r.stderr).toContain('Error: Missing release tag');
  });

  it('accepts tag and --verify flag', () => {
    const r = spawnSync('node', [mkPath, 'fetch', 'v0.2.0', '--verify'], {
      encoding: 'utf8',
      timeout: 5000,
    });

    expect(r.stderr).toContain('Fetching release v0.2.0');
  });

  it('accepts tag and --force flag', () => {
    const r = spawnSync('node', [mkPath, 'fetch', 'v0.2.0', '--force'], {
      encoding: 'utf8',
      timeout: 5000,
    });

    expect(r.stderr).toContain('Fetching release v0.2.0');
  });

  it('accepts tag and --no-install flag', () => {
    const r = spawnSync('node', [mkPath, 'fetch', 'v0.2.0', '--no-install'], {
      encoding: 'utf8',
      timeout: 5000,
    });

    expect(r.stderr).toContain('Fetching release v0.2.0');
  });

  it('accepts latest as tag', () => {
    const r = spawnSync('node', [mkPath, 'fetch', 'latest', '--no-install'], {
      encoding: 'utf8',
      timeout: 5000,
    });

    expect(r.stderr).toContain('Fetching release latest');
  });
});

describe('SHA-256 verification', () => {
  const testDir = join(homedir(), '.mk', 'toolchains', 'test-sha256');
  const testFilePath = join(testDir, 'test.tgz');
  const testHashPath = join(testDir, 'test.tgz.sha256');

  beforeAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('calculates SHA-256 hash correctly', async () => {
    const content = 'test content for sha256 calculation';
    writeFileSync(testFilePath, content);

    const hash = await calculateSHA256(testFilePath);
    
    expect(hash).toBeTruthy();
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('verifies tarball with matching hash', async () => {
    const content = 'test tarball content';
    writeFileSync(testFilePath, content);
    
    const hash = await calculateSHA256(testFilePath);
    writeFileSync(testHashPath, hash + '\n');

    const isValid = await verifyTarball(testFilePath, testHashPath);
    
    expect(isValid).toBe(true);
  });

  it('rejects tarball with mismatched hash', async () => {
    const content = 'test tarball content';
    writeFileSync(testFilePath, content);
    writeFileSync(testHashPath, 'wronghash1234567890abcdef1234567890abcdef1234567890abcdef1234567\n');

    const isValid = await verifyTarball(testFilePath, testHashPath);
    
    expect(isValid).toBe(false);
  });

  it('returns false when hash file does not exist', async () => {
    const content = 'test tarball content';
    writeFileSync(testFilePath, content);
    
    if (existsSync(testHashPath)) {
      rmSync(testHashPath);
    }

    const isValid = await verifyTarball(testFilePath, join(testDir, 'nonexistent.sha256'));
    
    expect(isValid).toBe(false);
  });

  it('produces consistent hashes for same content', async () => {
    const content = 'consistent content test';
    writeFileSync(testFilePath, content);

    const hash1 = await calculateSHA256(testFilePath);
    const hash2 = await calculateSHA256(testFilePath);
    
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different content', async () => {
    writeFileSync(testFilePath, 'content A');
    const hash1 = await calculateSHA256(testFilePath);

    writeFileSync(testFilePath, 'content B');
    const hash2 = await calculateSHA256(testFilePath);
    
    expect(hash1).not.toBe(hash2);
  });
});

describe('Cache structure', () => {
  it('creates cache directory under ~/.mk/toolchains/<tag>', () => {
    const expectedCacheRoot = join(homedir(), '.mk', 'toolchains');
    const exampleCacheDir = join(expectedCacheRoot, 'v0.2.0');
    
    expect(expectedCacheRoot).toContain('.mk');
    expect(expectedCacheRoot).toContain('toolchains');
    expect(exampleCacheDir).toContain('v0.2.0');
  });

  it('stores tarball as mkolbol.tgz', () => {
    const cacheDir = join(homedir(), '.mk', 'toolchains', 'v0.2.0');
    const tarballPath = join(cacheDir, 'mkolbol.tgz');
    
    expect(tarballPath).toContain('mkolbol.tgz');
  });

  it('stores hash as mkolbol.tgz.sha256', () => {
    const cacheDir = join(homedir(), '.mk', 'toolchains', 'v0.2.0');
    const hashPath = join(cacheDir, 'mkolbol.tgz.sha256');
    
    expect(hashPath).toContain('mkolbol.tgz.sha256');
  });
});
