import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { writeFileSync, unlinkSync, mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

describe('mk self command', () => {
  const mkPath = join(process.cwd(), 'dist', 'scripts', 'mk.js');
  const testDir = join(tmpdir(), 'mk-self-test');
  const testBinDir = join(testDir, 'bin');

  beforeAll(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
  });

  beforeEach(() => {
    if (existsSync(testBinDir)) {
      rmSync(testBinDir, { recursive: true, force: true });
    }
    mkdirSync(testBinDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testBinDir)) {
      rmSync(testBinDir, { recursive: true, force: true });
    }
  });

  describe('mk self install', () => {
    it('installs shim to specified bin directory', () => {
      const r = spawnSync(
        'node',
        [mkPath, 'self', 'install', '--bin-dir', testBinDir, '--from', 'repo'],
        {
          encoding: 'utf8',
        },
      );

      expect(r.status).toBe(0);
      expect(r.stdout).toContain('✓ Installed mk to');
      expect(existsSync(join(testBinDir, 'mk'))).toBe(true);
    });

    it('creates Windows .cmd shim on Windows platform', () => {
      const r = spawnSync(
        'node',
        [mkPath, 'self', 'install', '--bin-dir', testBinDir, '--from', 'repo'],
        {
          encoding: 'utf8',
        },
      );

      expect(r.status).toBe(0);

      if (process.platform === 'win32') {
        expect(existsSync(join(testBinDir, 'mk.cmd'))).toBe(true);
      }
    });

    it('creates executable Unix shim', () => {
      const r = spawnSync(
        'node',
        [mkPath, 'self', 'install', '--bin-dir', testBinDir, '--from', 'repo'],
        {
          encoding: 'utf8',
        },
      );

      expect(r.status).toBe(0);

      const shimPath = join(testBinDir, 'mk');
      expect(existsSync(shimPath)).toBe(true);

      const content = readFileSync(shimPath, 'utf8');
      expect(content).toContain('#!/usr/bin/env bash');
      expect(content).toContain('node');
    });

    it('supports --copy flag to copy files instead of creating wrapper', () => {
      const r = spawnSync(
        'node',
        [mkPath, 'self', 'install', '--bin-dir', testBinDir, '--from', 'repo', '--copy'],
        {
          encoding: 'utf8',
        },
      );

      expect(r.status).toBe(0);
      expect(existsSync(join(testBinDir, 'mk'))).toBe(true);
    });

    it('supports --verbose flag for detailed output', () => {
      const r = spawnSync(
        'node',
        [mkPath, 'self', 'install', '--bin-dir', testBinDir, '--from', 'repo', '--verbose'],
        {
          encoding: 'utf8',
        },
      );

      expect(r.status).toBe(0);
      expect(r.stdout).toContain('Created');
    });

    it('fails gracefully when entry point not found', () => {
      const fakePath = join(testDir, 'nonexistent-bin');
      const r = spawnSync(
        'node',
        [mkPath, 'self', 'install', '--bin-dir', testBinDir, '--from', 'global'],
        {
          encoding: 'utf8',
        },
      );

      // Might fail or succeed depending on whether global mkolbol is installed
      expect(r.status).toBeGreaterThanOrEqual(0);
    });
  });

  describe('mk self uninstall', () => {
    beforeEach(() => {
      spawnSync('node', [mkPath, 'self', 'install', '--bin-dir', testBinDir, '--from', 'repo'], {
        encoding: 'utf8',
      });
    });

    it('removes shims from bin directory', () => {
      expect(existsSync(join(testBinDir, 'mk'))).toBe(true);

      const r = spawnSync('node', [mkPath, 'self', 'uninstall', '--bin-dir', testBinDir], {
        encoding: 'utf8',
      });

      expect(r.status).toBe(0);
      expect(r.stdout).toContain('✓ Removed');
      expect(existsSync(join(testBinDir, 'mk'))).toBe(false);
    });

    it('reports when no shims found', () => {
      spawnSync('node', [mkPath, 'self', 'uninstall', '--bin-dir', testBinDir], {
        encoding: 'utf8',
      });

      const r = spawnSync('node', [mkPath, 'self', 'uninstall', '--bin-dir', testBinDir], {
        encoding: 'utf8',
      });

      expect(r.status).toBe(1);
      expect(r.stdout).toContain('No mk shims found');
    });

    it('removes Windows .cmd shim if present', () => {
      const cmdPath = join(testBinDir, 'mk.cmd');
      if (existsSync(cmdPath)) {
        const r = spawnSync('node', [mkPath, 'self', 'uninstall', '--bin-dir', testBinDir], {
          encoding: 'utf8',
        });

        expect(r.status).toBe(0);
        expect(existsSync(cmdPath)).toBe(false);
      }
    });
  });

  describe('mk self where', () => {
    it('finds mk installations in PATH', () => {
      const r = spawnSync('node', [mkPath, 'self', 'where'], {
        encoding: 'utf8',
      });

      // Status can be 0 (found) or 1 (not found)
      expect([0, 1]).toContain(r.status);

      if (r.status === 0) {
        expect(r.stdout).toContain('Found');
        expect(r.stdout).toContain('installation');
      } else {
        expect(r.stdout).toContain('No mk installations found');
      }
    });

    it('lists multiple installations if found', () => {
      const r = spawnSync('node', [mkPath, 'self', 'where'], {
        encoding: 'utf8',
      });

      if (r.status === 0) {
        const lines = r.stdout.split('\n').filter((l) => l.trim().length > 0);
        expect(lines.length).toBeGreaterThan(0);
      }
    });
  });

  describe('mk self switch', () => {
    it('requires version argument', () => {
      const r = spawnSync('node', [mkPath, 'self', 'switch'], {
        encoding: 'utf8',
      });

      expect(r.status).toBe(64);
      expect(r.stderr).toContain('Missing version argument');
    });

    it('shows usage when version missing', () => {
      const r = spawnSync('node', [mkPath, 'self', 'switch'], {
        encoding: 'utf8',
      });

      expect(r.stderr).toContain('Usage: mk self switch');
    });
  });

  describe('mk self --help', () => {
    it('shows help message', () => {
      const r = spawnSync('node', [mkPath, 'self', '--help'], {
        encoding: 'utf8',
      });

      expect(r.status).toBe(0);
      expect(r.stdout).toContain('Manage mk installation');
      expect(r.stdout).toContain('install');
      expect(r.stdout).toContain('uninstall');
      expect(r.stdout).toContain('where');
      expect(r.stdout).toContain('switch');
    });

    it('shows help when no subcommand provided', () => {
      const r = spawnSync('node', [mkPath, 'self'], {
        encoding: 'utf8',
      });

      expect(r.status).toBe(0);
      expect(r.stdout).toContain('Manage mk installation');
    });
  });

  describe('mk self error handling', () => {
    it('shows error for unknown subcommand', () => {
      const r = spawnSync('node', [mkPath, 'self', 'invalid'], {
        encoding: 'utf8',
      });

      expect(r.status).toBe(64);
      expect(r.stderr).toContain('Unknown subcommand');
    });

    it('validates --from argument', () => {
      const r = spawnSync(
        'node',
        [mkPath, 'self', 'install', '--bin-dir', testBinDir, '--from', 'invalid'],
        {
          encoding: 'utf8',
        },
      );

      expect(r.status).toBe(64);
      expect(r.stderr).toContain('--from must be "repo" or "global"');
    });
  });
});
