# Threads vs Forks, and CWD (process.chdir)

Key points

- Node worker threads share one OS process. process.chdir() is forbidden in workers because CWD is process‑global.
- Child processes (forks/spawned) are separate OS processes with their own CWD.

What to use when

- Use threads for: compute transforms, I/O adapters that don’t need process‑wide changes, fast parallelism.
- Use forks (or external servers) for: code that needs a specific working directory, global env mutations, native add‑ons with global state, or strong isolation.

Patterns

- Prefer absolute paths: resolve(baseDir, ...), avoid chdir.
- If you must use chdir:
  - Spawn: spawn('node', ['server.js'], { cwd: targetDir })
  - Or run tests/specs in Vitest forks: --pool=forks --poolOptions.forks.singleFork=true

CI note (in this repo)

- tests/digest/diff.spec.ts uses chdir; CI runs it in the forks pool and excludes it from the threads pool.
