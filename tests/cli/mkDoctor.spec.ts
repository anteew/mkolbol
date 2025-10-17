import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

describe('mk doctor command', () => {
  const mkPath = join(process.cwd(), 'dist', 'scripts', 'mk.js');

  beforeAll(() => {
    // Ensure dist is built
    if (!require('fs').existsSync(mkPath)) {
      throw new Error('mk.js not found. Run npm run build first.');
    }
  });

  it('runs all checks by default', () => {
    const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

    expect([0, 1]).toContain(r.status);
    expect(r.stdout).toContain('mk doctor');
    expect(r.stdout).toContain('Environment Diagnostics');
    expect(r.stdout).toContain('Summary:');
  });

  it('shows Node.js version check', () => {
    const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

    expect(r.stdout).toContain('Node.js version');
  });

  it('shows package manager check', () => {
    const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

    expect(r.stdout).toContain('Package manager');
  });

  it('shows build status check', () => {
    const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

    expect(r.stdout).toContain('Build status');
  });

  it('shows dependencies check', () => {
    const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

    expect(r.stdout).toContain('Dependencies');
  });

  it('shows toolchain checks when available', () => {
    const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

    expect(r.stdout).toMatch(/mk in PATH|Toolchain PATH/i);
  });

  it('displays check status indicators', () => {
    const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

    const hasPassIndicator = r.stdout.includes('✓');
    const hasWarnIndicator = r.stdout.includes('⚠');
    const hasFailIndicator = r.stdout.includes('✗');

    expect(hasPassIndicator || hasWarnIndicator || hasFailIndicator).toBe(true);
  });

  it('shows remediation for failed checks', () => {
    const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

    if (r.stdout.includes('(failed)') || r.stdout.includes('(warning)')) {
      expect(r.stdout).toContain('→');
    }
  });

  it('displays summary with pass/warn/fail counts', () => {
    const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

    expect(r.stdout).toMatch(/\d+ passed/);
    expect(r.stdout).toMatch(/\d+ warnings/);
    expect(r.stdout).toMatch(/\d+ failed/);
  });

  it('exits with error code if checks fail', () => {
    const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

    if (r.stdout.includes('(failed)')) {
      expect(r.status).toBe(1);
    } else {
      expect(r.status).toBe(0);
    }
  });

  it('supports --verbose flag', () => {
    const r = spawnSync('node', [mkPath, 'doctor', '--verbose'], { encoding: 'utf8' });

    expect([0, 1]).toContain(r.status);
    expect(r.stdout).toContain('Environment Diagnostics');
  });

  it('shows help with --help flag', () => {
    const r = spawnSync('node', [mkPath, 'doctor', '--help'], { encoding: 'utf8' });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Diagnose system');
    expect(r.stdout).toContain('Usage: mk doctor');
  });

  describe('shim installation checks', () => {
    it('includes shim integrity check in output', () => {
      const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

      expect(r.stdout).toMatch(/Shim integrity|mk in PATH/i);
    });

    it('includes binary accessibility check', () => {
      const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

      expect(r.stdout).toMatch(/Binary accessibility|mk in PATH/i);
    });

    it('includes version consistency check', () => {
      const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

      expect(r.stdout).toMatch(/Version consistency|mk version/i);
    });
  });

  describe('check result formatting', () => {
    it('uses consistent status format', () => {
      const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

      const lines = r.stdout.split('\n');
      const checkLines = lines.filter((l) => /^[✓⚠✗]\s+\w/.test(l) && l.includes(':'));

      expect(checkLines.length).toBeGreaterThan(0);
      checkLines.forEach((line) => {
        expect(line).toMatch(/^[✓⚠✗]\s+[\w\s.]+:/);
      });
    });

    it('shows remediation with arrow indicator', () => {
      const r = spawnSync('node', [mkPath, 'doctor'], { encoding: 'utf8' });

      if (r.stdout.includes('(warning)') || r.stdout.includes('(failed)')) {
        const remediationLines = r.stdout.split('\n').filter((l) => l.includes('→'));
        expect(remediationLines.length).toBeGreaterThan(0);
      }
    });
  });

  describe('--section flag', () => {
    it('supports --section toolchain', () => {
      const r = spawnSync('node', [mkPath, 'doctor', '--section', 'toolchain'], {
        encoding: 'utf8',
      });

      expect([0, 1]).toContain(r.status);
      expect(r.stdout).toMatch(/Toolchain PATH/i);
      expect(r.stdout).toMatch(/Shim integrity/i);
      expect(r.stdout).toMatch(/version consistency/i);
      expect(r.stdout).toMatch(/Binary accessibility/i);
    });

    it('supports --section environment', () => {
      const r = spawnSync('node', [mkPath, 'doctor', '--section', 'environment'], {
        encoding: 'utf8',
      });

      expect([0, 1]).toContain(r.status);
      expect(r.stdout).toContain('Node.js version');
      expect(r.stdout).toContain('Package manager');
      expect(r.stdout).not.toMatch(/Toolchain PATH/i);
      expect(r.stdout).not.toMatch(/Shim integrity/i);
    });

    it('supports --section all', () => {
      const r = spawnSync('node', [mkPath, 'doctor', '--section', 'all'], { encoding: 'utf8' });

      expect([0, 1]).toContain(r.status);
      expect(r.stdout).toContain('Node.js version');
      expect(r.stdout).toMatch(/Toolchain PATH/i);
    });

    it('rejects invalid section values', () => {
      const r = spawnSync('node', [mkPath, 'doctor', '--section', 'invalid'], { encoding: 'utf8' });

      expect(r.status).toBe(64);
      expect(r.stderr).toContain('Invalid --section value');
    });
  });

  describe('--json flag', () => {
    it('outputs JSON format with summary and checks', () => {
      const r = spawnSync('node', [mkPath, 'doctor', '--json'], { encoding: 'utf8' });

      expect([0, 1]).toContain(r.status);
      expect(() => JSON.parse(r.stdout)).not.toThrow();

      const result = JSON.parse(r.stdout);
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('checks');
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('passed');
      expect(result.summary).toHaveProperty('warnings');
      expect(result.summary).toHaveProperty('failed');
      expect(Array.isArray(result.checks)).toBe(true);
    });

    it('works with --section toolchain and --json together', () => {
      const r = spawnSync('node', [mkPath, 'doctor', '--section', 'toolchain', '--json'], {
        encoding: 'utf8',
      });

      expect([0, 1]).toContain(r.status);
      const result = JSON.parse(r.stdout);
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.checks.some((c: any) => c.name.match(/Toolchain PATH/i))).toBe(true);
    });

    it('includes check details in JSON output', () => {
      const r = spawnSync('node', [mkPath, 'doctor', '--json'], { encoding: 'utf8' });

      const result = JSON.parse(r.stdout);
      result.checks.forEach((check: any) => {
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('message');
        expect(['pass', 'warn', 'fail']).toContain(check.status);
      });
    });
  });
});
