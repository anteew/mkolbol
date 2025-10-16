import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// NOTE: This is a scaffold for the future `mk` CLI.
// It is skipped so CI remains green until `scripts/mk.ts` exists.

describe.skip('mk CLI help microcopy (snapshot scaffold)', () => {
  it('prints structured help with sections and examples', () => {
    const mkPath = process.env.MK_BIN || join(process.cwd(), 'dist', 'scripts', 'mk.js');
    const r = spawnSync('node', [mkPath, '--help'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Usage: mk /);
    expect(r.stdout).toMatch(/Commands:/);
    expect(r.stdout).toMatch(/Options:/);
  });
});

