# Laminar Integration (Deep Dogfooding)

This repo integrates Laminar in two ways:

- Reporter (tests): vitest uses Laminar’s JSONL reporter to write artifacts under `reports/`.
- CLI + MCP (tools): Laminar is available via npm scripts and can run an MCP server for AI agents.

## Test Reporter

- Threads lane: `npm run test:ci` (uses Laminar reporter)
- Forks lane: `MK_PROCESS_EXPERIMENTAL=1 npm run test:pty` (also uses Laminar reporter)
- Artifacts: `reports/summary.jsonl`, per‑case JSONL files, and `reports/index.json`

## CLI

- Help: `npm run lam -- --help`
- Common:
  - `npm run lam -- logq` — query logs
  - `npm run lam -- repro --bundle` — repro bundle
  - `npm run lam -- diff <digest1> <digest2>` — compare digests

## MCP Server

- Start: `npm run lam:mcp`
- Claude Desktop snippet (example):
  ```json
  {
    "mcpServers": {
      "laminar": {
        "command": "npx",
        "args": ["@agent_vega/laminar", "mcp-server"],
        "env": {}
      }
    }
  }
  ```

## CI Artifacts (dogfooding)

- Our CI runs both threads and forks lanes, then captures Laminar summaries and trends into `reports/` and uploads them as build artifacts.
- Locally you can generate the same with one command:
  - Threads lane + summary/trends: `npm run test:ci:lam`
  - Forks lane + summary/trends: `npm run test:pty:lam`

Artifacts you’ll see:
- `reports/summary.jsonl` — per-run ledger
- `reports/index.json` — index manifest (deterministic mtime ≥ summary)
- `reports/LAMINAR_SUMMARY.txt` — human-readable summary
- `reports/LAMINAR_TRENDS.txt` — top recurring signals

## Notes
- The repo also ships a minimal `lam` stub bin for packaging; use `npm run lam` for the full Laminar CLI.
- See `docs/rfcs/stream-kernel/status.md` for implementation status.
