import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

// Scaffold for canonical error microcopy tests.
// Skipped until `scripts/mk.ts` is implemented.

const fixtures = JSON.parse(readFileSync(join(process.cwd(), 'tests', 'fixtures', 'mkdx', 'error-cases.json'), 'utf8'));

describe.skip('mk CLI error microcopy (snapshot scaffold)', () => {
  for (const c of fixtures.cases) {
    it(`prints canonical error: ${c.name}`, () => {
      const mkPath = process.env.MK_BIN || join(process.cwd(), 'dist', 'scripts', 'mk.js');
      const r = spawnSync('node', [mkPath, ...c.args], { encoding: 'utf8' });
      expect(r.status).not.toBe(0);
      expect(r.stdout + r.stderr).toContain(c.human.split(' ')[1]); // contains error code token
    });
  }
});

