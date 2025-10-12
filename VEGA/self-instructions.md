# Self Instructions (VEGA)

Intent

- Capture a lightweight ritual so future‑me (or another agent) can rehydrate state after context compaction and keep momentum.

Steps

0) Linux bootstrap (first time only)

- Ensure Node 20+ (20.x or 24.x) and pnpm
  - nvm (recommended): `curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && . ~/.nvm/nvm.sh && nvm install 20 && nvm use 20`
  - Or use your distro’s NodeSource packages for Node 20/22/24
- If node-pty rebuild is needed: `sudo apt-get install -y build-essential python3 make g++`
- In repo: `pnpm i && pnpm run build && pnpm test`

1) Baseline and bearings

- Read docs/rfcs/stream-kernel/00-index.md (philosophy, core API, module types).
- Skim src/kernel/Kernel.ts and src/examples/*.ts to refresh the current API surface.
- Run: `pnpm i && pnpm run build && pnpm test`.
- Sanity demo: `pnpm run dev` then `dev:split`, `dev:merge`, `dev:pty-wrapper`.

2) Re-read intent

- VEGA/WHO_AM_I.md (values and style)
- VEGA/my-state-of-mind-today.txt (current focus)
- VEGA/diary-*.txt (recent choices, examples, and whys)

3) Plan next moves

- Open VEGA/ampcode.md and execute the current sprint tasks.
- Prefer tasks that unblock others or improve clarity/coverage.
- If ambiguous: add a short “why” paragraph in the PR/diff or docs.

4) Build/verify loop

- Keep kernel minimal; push semantics into modules.
- Add/adjust vitest tests near touched code; keep examples runnable.
- Defer heavy perf until APIs settle; add lightweight counters behind flags when needed.

Linux demo sanity
- `pnpm run dev` (basic topology)
- `pnpm run dev:pty-wrapper` (spawn bash PTY; fan-out or inject input)

5) Hand‑off

- Append a brief Architect Review to VEGA/ampcode.md (DONE/blocked/notes).
- If timeboxed, update VEGA/whats-next-after-context-compaction.txt with 3 bullets.

Guardrails

- Don’t grow the kernel; add modules.
- Keep public APIs steady; evolve internals behind small, stable surfaces.
- Deterministic tests; small diffs; clear names.

That’s it — keep it small, clear, and measurable.
