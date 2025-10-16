```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "A", "parallel": false, "tasks": ["T9501", "T9502"] },
    { "id": "B", "parallel": true, "depends_on": ["A"], "tasks": ["T9503", "T9504", "T9505"] }
  ],
  "tasks": [
    { "id": "T9501", "agent": "susan", "title": "mkctl: SIGINT/Ctrl+C handling", "deliverables": ["patches/DIFF_T9501_mkctl-sigint.patch"] },
    { "id": "T9502", "agent": "susan", "title": "mkctl: exit codes mapping", "deliverables": ["patches/DIFF_T9502_mkctl-exit-codes.patch"] },
    { "id": "T9503", "agent": "susan", "title": "mkctl: friendly error messages", "deliverables": ["patches/DIFF_T9503_mkctl-errors.patch"] },
    { "id": "T9504", "agent": "susan", "title": "ANSI Parser P3 polish: docs/examples/perf", "deliverables": ["patches/DIFF_T9504_parser-p3-polish.patch"] },
    { "id": "T9505", "agent": "susan", "title": "Cleanup: remove stray backups", "deliverables": ["patches/DIFF_T9505_cleanup-backups.patch"] }
  ]
}
```

# Sprint — SB-MK-DEVEX-P5 (Susan)

Theme
- mkctl ergonomics (signals, exit codes, messages) + ANSI Parser P3 docs/examples/perf polish.

Guardrails
- Kernel inert (pipes + registry only). Small, test-first diffs. CI must stay green in threads and process lanes.

Tasks & DoD
- T9501: Trap SIGINT; call Executor.down(); exit promptly. Test sends SIGINT to a running `mkctl run` and asserts clean stop and expected code.
- T9502: Map exit codes for missing file, invalid YAML/JSON, runtime error. Tests assert codes and messages.
- T9503: Improve CLI messages with concise hints. Tests assert substrings; README troubleshooting updated.
- T9504: Add doc notes and runnable examples for truecolor/256, resize, DEC modes; keep perf guard stable.
- T9505: Delete `src/transforms/AnsiParser.ts.backup` (and similar). Ensure build/tests pass.

Runbook
- `npm ci && npm run build && npm run test:ci`
- `MK_PROCESS_EXPERIMENTAL=1 npm run test:pty`
- Quick check: `node dist/scripts/mkctl.js run --file examples/configs/external-stdio.yaml --duration 1`
