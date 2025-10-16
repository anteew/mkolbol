Local Node v1.0 — Scope, Gate, and Acceptance

Scope
- Single host; inproc/worker/process modes only. No cross‑host networking.
- Control plane: Hostess + Router (in‑proc), TTL/heartbeat, capability queries.
- Data plane: PipeAdapters for inproc/worker/process only.
- CLI: mkctl run, endpoints, endpoints --watch, validate/doctor; JSON snapshots in reports/.
- Modules (minimum)
  - ExternalProcess wrapper (restart/backoff/log capture/env/cwd; exit‑code mapping)
  - FilesystemSink (append/truncate; fsync policy)
  - ANSI Parser + XtermTTYRenderer
  - Optional DB gateway stub (sql/query ↔ rowset) for wiring demos

Gate
- Runtime env: `MK_LOCAL_NODE=1`
  - Loader/CLI reject network adapters/transports.
  - Router runs in‑proc only; mkctl warns on network requests.
- CI: threads + process lanes required; no network tests while gate is set.

Acceptance
- Demo: External HTTP process → FilesystemSink (logs) and optional DB gateway; XtermTTYRenderer active.
- mkctl endpoints --watch shows live Router adds/withdraws; TTL expiry works.
- Process blue/green cutover under load: no data loss; perf guard stable.
- ExternalProcess restart/backoff works; logs captured to file; errors surfaced clearly.
- Artifacts exist: reports/router-endpoints.json; Laminar summaries/trends.

Commands
```bash
export MK_LOCAL_NODE=1
npm ci && npm run build
npm run test:ci
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local.yml --duration 5
node dist/scripts/mkctl.js endpoints --watch
```
