# Local CI Runner (Fast Feedback)

## Why
- Catch CI failures locally on a fast box before pushing.
- Optional RAM-backed workspace for speed (tmpfs via /dev/shm).

Commands
- Native: `npm run ci:local`
- RAM-backed: `npm run ci:local:fast` (uses /dev/shm when present)

What it runs
1) `npm ci`
2) `npm run build`
3) Threads tests: `npm run test:ci`
4) Process/forks tests: `MK_PROCESS_EXPERIMENTAL=1 npm run test:pty`
5) Acceptance smoke: `mkctl run examples/configs/http-logs-local-file.yml` on an ephemeral port

Artifacts
- Copied back to `reports/local-ci/<ISO-stamp>/`

Determinism
- Node 24, `CI=true`, `MK_LOCAL_NODE=1`, `npm ci` from lockfile

Pre-commit hook (optional)
- Install: `npm run hooks:install`
- Runs on commit: `prettier -c` and `eslint .` (warnings allowed)
- Tip: use pre-push for heavier checks if desired (see `scripts/git-hooks/pre-push.sample`).

Docker stub
- `docker/Dockerfile.ci` documents the target runner image.
- A future `npm run ci:local:docker` will bind-mount the repo and run the same steps inside the container.
