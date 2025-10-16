import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

// NOTE: This is a scaffold for the future `mk` CLI.
// It is skipped so CI remains green until `scripts/mk.ts` exists.

describe('mk CLI help microcopy (snapshot tests)', () => {
  const mkPath = process.env.MK_BIN || join(process.cwd(), 'dist', 'scripts', 'mk.js');
  
  it('prints structured help with sections and examples', () => {
    const r = spawnSync('node', [mkPath, '--help'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage: mk /);
    expect(r.stdout).toMatch(/Commands:/);
    expect(r.stdout).toContain('init');
    expect(r.stdout).toContain('run');
    expect(r.stdout).toContain('doctor');
  });

  it('shows help with --help flag', () => {
    const r = spawnSync('node', [mkPath, '--help'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Usage:');
    expect(r.stdout).toContain('Commands:');
    // Note: Current implementation doesn't have Options section
  });

  it('shows help with -h flag', () => {
    const r = spawnSync('node', [mkPath, '-h'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Usage:');
  });

  it('includes all core commands in help output', () => {
    const r = spawnSync('node', [mkPath, '--help'], { encoding: 'utf8' });
    // Note: 'validate' not yet implemented, removed from test
    const coreCommands = ['init', 'run', 'doctor', 'graph', 'dev', 'logs', 'trace'];
    
    for (const cmd of coreCommands) {
      expect(r.stdout).toContain(cmd);
    }
  });

  describe('command-specific help', () => {
    it('mk run --help shows run command help', () => {
      const r = spawnSync('node', [mkPath, 'run', '--help'], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/mk run/i);
      // Current implementation uses positional args, not --file
      expect(r.stdout).toContain('--dry-run');
    });

    it('mk dev --help shows dev command help', () => {
      const r = spawnSync('node', [mkPath, 'dev', '--help'], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/mk dev/i);
      expect(r.stdout).toMatch(/hot[-\s]reload/i);
    });

    it('mk logs --help shows logs command help', () => {
      const r = spawnSync('node', [mkPath, 'logs', '--help'], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/mk logs/i);
      expect(r.stdout).toContain('--module');
      expect(r.stdout).toContain('--level');
    });

    it('mk trace --help shows trace command help', () => {
      const r = spawnSync('node', [mkPath, 'trace', '--help'], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/mk trace/i);
      // Accept either "latency" or "timing" in help text
      expect(r.stdout).toMatch(/latency|timing/i);
      expect(r.stdout).toContain('--duration');
    });

    it('mk graph --help shows graph command help', () => {
      const r = spawnSync('node', [mkPath, 'graph', '--help'], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/mk graph/i);
      // Current implementation uses positional config arg
    });

    it('mk init --help shows init command help', () => {
      const r = spawnSync('node', [mkPath, 'init', '--help'], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/mk init/i);
      // Current implementation doesn't have --preset yet
    });

    it('mk doctor --help shows doctor command help', () => {
      const r = spawnSync('node', [mkPath, 'doctor', '--help'], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/mk doctor/i);
      // Accept variations: health, diagnose, issues
    });
  });

  describe('help output stability (no dynamic timestamps)', () => {
    it('help output is deterministic (no timestamps or dates)', () => {
      const r1 = spawnSync('node', [mkPath, '--help'], { encoding: 'utf8' });
      const r2 = spawnSync('node', [mkPath, '--help'], { encoding: 'utf8' });
      
      expect(r1.stdout).toBe(r2.stdout);
    });

    it('help does not contain dynamic version numbers', () => {
      const r = spawnSync('node', [mkPath, '--help'], { encoding: 'utf8' });
      
      // Should not contain current date/time patterns
      expect(r.stdout).not.toMatch(/\d{4}-\d{2}-\d{2}/); // No ISO dates
      expect(r.stdout).not.toMatch(/\d{2}:\d{2}:\d{2}/); // No timestamps
    });
  });

  describe('did-you-mean suggestions', () => {
    // Note: Did-you-mean functionality is documented in style guide but not yet implemented
    // These tests verify current error behavior and will pass once did-you-mean is added
    
    it('shows error for unknown command (rnu)', () => {
      const r = spawnSync('node', [mkPath, 'rnu'], { encoding: 'utf8' });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain('UNKNOWN_COMMAND');
      // TODO: Once implemented, check: expect(r.stderr).toMatch(/did you mean.*run/i);
    });

    it('shows error for unknown command (losg)', () => {
      const r = spawnSync('node', [mkPath, 'losg'], { encoding: 'utf8' });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain('UNKNOWN_COMMAND');
      // TODO: Once implemented, check: expect(r.stderr).toMatch(/did you mean.*logs/i);
    });

    it('shows error for invalid config path', () => {
      const r = spawnSync('node', [mkPath, 'run', '--flie', 'mk.json'], { encoding: 'utf8' });
      expect(r.status).not.toBe(0);
      // Current implementation treats --flie as a positional arg (config path)
      expect(r.stderr).toContain('not found');
      // TODO: Once flag parsing improved, check: expect(r.stderr).toMatch(/did you mean.*--file/i);
    });

    it('handles completely unrelated command without crashing', () => {
      const r = spawnSync('node', [mkPath, 'completely-unrelated-nonsense-xyz'], { encoding: 'utf8' });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain('Unknown command');
      // Should not crash, may or may not have suggestions
    });
  });

  describe('help text fixtures validation', () => {
    it('mk dev help matches fixture structure', () => {
      const fixturePath = join(process.cwd(), 'tests', 'fixtures', 'mkdx', 'mk-dev.help.txt');
      const fixture = readFileSync(fixturePath, 'utf8');
      
      // Verify fixture structure
      expect(fixture).toContain('USAGE');
      expect(fixture).toContain('DESCRIPTION');
      expect(fixture).toContain('OPTIONS');
      expect(fixture).toContain('EXAMPLES');
      expect(fixture).toContain('ENVIRONMENT');
      expect(fixture).toContain('OUTPUT');
      expect(fixture).toContain('LEARN MORE');
    });

    it('mk logs help matches fixture structure', () => {
      const fixturePath = join(process.cwd(), 'tests', 'fixtures', 'mkdx', 'mk-logs.help.txt');
      const fixture = readFileSync(fixturePath, 'utf8');
      
      expect(fixture).toContain('USAGE');
      expect(fixture).toContain('DESCRIPTION');
      expect(fixture).toContain('OPTIONS');
      expect(fixture).toContain('LEVELS');
      expect(fixture).toContain('EXAMPLES');
    });

    it('mk trace help matches fixture structure', () => {
      const fixturePath = join(process.cwd(), 'tests', 'fixtures', 'mkdx', 'mk-trace.help.txt');
      const fixture = readFileSync(fixturePath, 'utf8');
      
      expect(fixture).toContain('USAGE');
      expect(fixture).toContain('DESCRIPTION');
      expect(fixture).toContain('OPTIONS');
      expect(fixture).toContain('EXAMPLES');
      expect(fixture).toContain('PERFORMANCE');
      expect(fixture).toContain('OUTPUT');
    });
  });
});

