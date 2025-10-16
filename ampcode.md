```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "E2-A",  "parallel": false, "tasks": ["T5001", "T5005"] },
    { "id": "FS2-B", "parallel": true,  "depends_on": ["E2-A"], "tasks": ["T5002", "T5003", "T5004", "T5006"] }
  ],
  "tasks": [
    {
      "id": "T5001",
      "agent": "susan",
      "title": "mkctl ergonomics: SIGINT teardown, exit codes, clearer errors",
      "allowedFiles": ["scripts/mkctl.ts", "src/config/loader.ts", "tests/cli/mkctlRun.spec.ts", "docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T5001_mkctl-ergonomics.patch"]
    },
    {
      "id": "T5005",
      "agent": "susan",
      "title": "mkctl run: optional mid-run router snapshots (flagged)",
      "allowedFiles": ["scripts/mkctl.ts", "tests/cli/mkctlEndpoints.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T5005_mkctl-router-snapshots.patch"]
    },
    {
      "id": "T5002",
      "agent": "susan",
      "title": "FilesystemSink: implement fsync=\"always\" + tests",
      "allowedFiles": ["src/modules/filesystem-sink.ts", "tests/renderers/filesystemSink.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T5002_filesink-fsync-always.patch"]
    },
    {
      "id": "T5003",
      "agent": "susan",
      "title": "ExternalProcess: edge-path tests (capture limit, backoff cap, signals)",
      "allowedFiles": ["tests/integration/externalFromConfig.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T5003_external-edge-tests.patch"]
    },
    {
      "id": "T5004",
      "agent": "susan",
      "title": "ConsoleSink: human-readable Buffer output + docs",
      "allowedFiles": ["src/modules/consoleSink.ts", "docs/devex/mkctl-cookbook.md", "tests/integration/multiModalOutput.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T5004_console-sink.patch"]
    },
    {
      "id": "T5006",
      "agent": "susan",
      "title": "Cleanup: remove stray backups (AnsiParser.ts.backup, .current) if present",
      "allowedFiles": ["src/transforms/AnsiParser.ts.backup", "src/transforms/AnsiParser.ts.current"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T5006_cleanup-backups.patch"]
    }
  ]
}
```

# Ampcode — Core Sprint (mkctl ergonomics, FileSink fsync, ExternalProcess tests, ConsoleSink)

Goal
- Improve mkctl operability (signals, exit codes, mid-run snapshots), finalize FilesystemSink fsync semantics, add ExternalProcess edge tests, and make ConsoleSink output friendly for logs.

Constraints
- `MK_LOCAL_NODE=1` (no network adapters). Kernel unchanged. CI lanes remain strict.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
```
