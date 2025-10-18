Agent Hub — Start Here

Purpose

- This is the high‑signal entry point for AI agents and humans.
- Use it to quickly locate the most relevant specs, sprint files, and workflows.

Quick Links

- Sprint specs: `ampcode.json`, `devex.json`
- Template + schemas: `agent_template/agent_template.json`, `agent_template/schema/*.json`
- Rehydrate checklists: `VEGA/rehydrate-checklist-*.md`
- PR summary bot: `scripts/post-validator-summary.ts`
- PR reader tool: `scripts/agent-tools/pr-comment-extract.ts`
  - OS‑Cloud philosophy: `docs/rfcs/stream-kernel/13-os-cloud.md`
  - Threads vs forks & CWD: `docs/devex/threads-vs-forks-and-cwd.md`
  - Hydrate file locally from PR: `npm run agents:hydrate -- --pr <NUM>`

Local Bootstrap

- `npm ci && npm run build`
- Validate: `npm run validate:template && npm run validate:sprint`
- Briefing size check: auto‑runs on pre‑commit; manual: `node dist/scripts/check-briefing-size.js`

Fail‑Fast Hooks (pre‑commit)

- ESLint fix dry‑run on staged files (blocks on fixable/errors). Override once: `SKIP_ESLINT_DRYRUN=1`.
- Briefing token budget check (warn/fail). Override once: `SKIP_BRIEFING_CHECK=1`.
- Prettier auto‑format staged files.

PR Utilities

- Post summary (CI): non‑gating validators append a summary comment to PRs.
- Read summary locally: `npm run agents:pr:read -- --pr <NUM> [--trim] [--out summary.md]`.
- Hydrate rehydration doc from PR: `npm run agents:hydrate -- --pr <NUM>` (writes `VEGA/rehydrate-from-pr-<NUM>.md`).

Conventions

- Keep `instructions.briefing` concise; token budgets enforced.
- Only modify files listed under `tasks[*].allowedFiles` in a sprint.
- Node 24.x; tests must pass locally before pushing.
