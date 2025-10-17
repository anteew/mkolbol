#!/usr/bin/env -S node --enable-source-maps
/*
 Local CI runner: mirrors our GH Actions steps on this machine for fast iteration.

 Usage:
   npm run ci:local            # native run in a tmp workspace (in /dev/shm if available)
   CI_FAST=1 npm run ci:local  # alias for using RAM (/dev/shm) when possible

 Steps:
   1) Create temp workspace (prefer /dev/shm)
   2) Copy working tree (excluding node_modules/, dist/, reports/)
   3) npm ci && npm run build
   4) Threads tests: npm run test:ci
   5) Forks/process tests: MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
   6) Acceptance smoke (FilesystemSink) with ephemeral port
   7) Copy reports/ back to repo under reports/local-ci/<stamp>/
*/

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, cpSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { createServer } from 'node:net';

const repoRoot = resolve(process.cwd());
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

function log(step: string) {
  console.log(`\n=== ${step} ===`);
}

function sh(cmd: string, args: string[] = [], opts: any = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    p.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const address = s.address();
      if (typeof address === 'object' && address && 'port' in address) {
        const port = (address as any).port as number;
        s.close(() => resolve(port));
      } else {
        s.close(() => reject(new Error('Failed to acquire free port')));
      }
    });
    s.on('error', reject);
  });
}

function chooseWorkspaceBase(): string {
  // Prefer RAM-backed /dev/shm when present
  const shm = '/dev/shm';
  const fast = process.env.CI_FAST === '1' || process.env.CI_LOCAL_FAST === '1';
  if (fast && existsSync(shm)) return shm;
  return tmpdir();
}

function copyTree(srcRoot: string, dstRoot: string) {
  const excludes = new Set(['node_modules', 'dist', 'reports', '.git']);
  function walk(src: string, dst: string) {
    mkdirSync(dst, { recursive: true });
    for (const name of readdirSync(src)) {
      if (excludes.has(name)) continue;
      const s = join(src, name);
      const d = join(dst, name);
      const st = statSync(s);
      if (st.isDirectory()) {
        walk(s, d);
      } else if (st.isFile()) {
        mkdirSync(dirname(d), { recursive: true });
        cpSync(s, d);
      }
    }
  }
  walk(srcRoot, dstRoot);
}

async function main() {
  const base = chooseWorkspaceBase();
  const workDir = join(base, `mkolbol-ci-${stamp}`);
  log(`Create workspace at ${workDir}`);
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  log('Copy working tree (excluding node_modules/dist/reports/.git)');
  copyTree(repoRoot, workDir);

  const envBase = { ...process.env, MK_LOCAL_NODE: '1', CI: 'true' };

  log('npm ci');
  await sh('npm', ['ci'], { cwd: workDir, env: envBase });

  log('npm run build');
  await sh('npm', ['run', 'build'], { cwd: workDir, env: envBase });

  log('Threads lane (test:ci)');
  await sh('npm', ['run', 'test:ci'], { cwd: workDir, env: envBase });

  log('Forks/process lane (test:pty)');
  await sh('bash', ['-lc', 'MK_PROCESS_EXPERIMENTAL=1 npm run test:pty'], { cwd: workDir, env: envBase });

  // Acceptance smoke with ephemeral port: copy config and rewrite port
  const cfgSrc = join(workDir, 'examples', 'configs', 'http-logs-local-file.yml');
  const cfgDst = join(workDir, 'examples', 'configs', `http-logs-local-file.local.${stamp}.yml`);
  const port = await getFreePort();
  let cfg = readFileSync(cfgSrc, 'utf8');
  cfg = cfg.replace(/listen\(3000/g, `listen(${port}`)
                 .replace(/localhost:3000/g, `localhost:${port}`);
  writeFileSync(cfgDst, cfg);

  log(`Acceptance smoke (FilesystemSink) on port ${port}`);
  await sh('node', ['dist/scripts/mkctl.js', 'run', '--file', cfgDst, '--duration', '5'], {
    cwd: workDir,
    env: envBase,
  }).catch((err) => {
    console.warn('Acceptance smoke returned non-zero (continuing):', String(err.message || err));
  });

  // Copy reports back
  const reportsSrc = join(workDir, 'reports');
  const reportsDst = join(repoRoot, 'reports', 'local-ci', stamp);
  log(`Copy reports back to ${reportsDst}`);
  if (existsSync(reportsSrc)) {
    copyTree(reportsSrc, reportsDst);
  }

  console.log('\n✅ Local CI run complete. Artifacts under', reportsDst);
}

main().catch((err) => {
  console.error('\n❌ Local CI failed:', err);
  process.exit(1);
});
