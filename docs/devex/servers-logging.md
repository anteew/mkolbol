# Logging Server (v1)

Purpose: accept JSONL log events and append to a file with size-based rotation.

Capabilities
- accepts: `log/event`
- features: `jsonl`, `rotate`

Event format (JSONL)
```json
{ "ts": "2025-10-18T20:00:00Z", "level": "info", "message": "started", "fields": {"pid": 12345} }
```

Options
- `file`: output path
- `level`: minimum severity (`trace|debug|info|warn|error`)
- `rotateBytes`: rotate when size exceeds this many bytes

Demo
```bash
node dist/examples/servers/logging-server-demo.js
```

