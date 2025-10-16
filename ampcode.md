```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "E3-A",  "parallel": false, "tasks": ["T6001", "T6002"] },
    { "id": "E3-B",  "parallel": true,  "depends_on": ["E3-A"], "tasks": ["T6003", "T6004"] }
  ],
  "tasks": [
    {
      "id": "T6001",
      "agent": "susan",
      "title": "Router P2 polish: mkctl endpoints --json + metadata filters",
      "allowedFiles": ["scripts/mkctl.ts", "src/router/RoutingServer.ts", "tests/cli/mkctlEndpoints.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T6001_mkctl-endpoints-json.patch"]
    },
    {
      "id": "T6002",
      "agent": "susan",
      "title": "FilesystemSink P2: format option (raw|jsonl) + timestamp",
      "allowedFiles": ["src/modules/filesystem-sink.ts", "tests/renderers/filesystemSink.spec.ts", "docs/devex/quickstart.md"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T6002_filesink-format-jsonl.patch"]
    },
    {
      "id": "T6003",
      "agent": "susan",
      "title": "ExternalProcess P2: health check (HTTP or command) during startup",
      "allowedFiles": ["src/wrappers/ExternalServerWrapper.ts", "tests/integration/externalFromConfig.spec.ts", "docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T6003_external-healthcheck.patch"]
    },
    {
      "id": "T6004",
      "agent": "susan",
      "title": "mkctl run: map health failure to non-zero exit + docs",
      "allowedFiles": ["scripts/mkctl.ts", "tests/cli/mkctlRun.spec.ts", "docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T6004_mkctl-health-exit.patch"]
    }
  ]
}
```

# Ampcode — Core Sprint (Router polish, FileSink JSONL, ExternalProcess health)

Goal
- Add mkctl endpoints --json and metadata filtering; add FileSink JSONL support; introduce ExternalProcess health checks and propagate failures via mkctl exit codes.

Constraints
- `MK_LOCAL_NODE=1` (no network adapters). Kernel unchanged. CI lanes remain strict.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
```
