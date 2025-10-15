# VEGA Notes (Index)

This directory is VEGA’s working context for mkolbol — a stream‑based microkernel for AI agent systems. Use these files to rehydrate after context compaction and keep the project coherent.

Start here

- WHO_AM_I.md — role, taste, and core choices for mkolbol
- my-state-of-mind-today.txt — current focus and constraints
- diary-\*.txt — short, dated entries with examples and the “why”
- self-instructions.md — ritual steps to get back in flow
- whats-next-after-context-compaction.txt — quick primer to continue
- ampcode.md — current sprint tasks (for VEGA and subagents)

Dev pointers

- RFC entry: docs/rfcs/stream-kernel/00-index.md
- Status vs Plan: docs/rfcs/stream-kernel/status.md
- Laminar Integration: docs/testing/laminar-integration.md
- Build: pnpm i && pnpm run build
- Test: pnpm test
- Demos: pnpm run dev | dev:split | dev:merge | dev:pty-wrapper | dev:multi-modal

Perf notes

- Perf is light right now; favor correctness, small APIs, and runnable demos. P1 adds lightweight counters and golden transcript tests.

Hand-off

- Keep it small, clear, and measurable. If timeboxed, update whats-next-after-context-compaction.txt with 3 bullets.

Linux hydration quickstart

- Node: 20+ (20.x or 24.x). Recommend nvm or NodeSource packages.
- Build tools (if node-pty rebuild is needed): `sudo apt-get install -y build-essential python3 make g++`
- Repo: `pnpm i && pnpm run build && pnpm test`
- Demos: `pnpm run dev`, `pnpm run dev:pty-wrapper`, `pnpm run dev:multi-modal`
- Product spec: docs/product/pty-metasurface.md
