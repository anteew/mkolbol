```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "E1-A", "parallel": false, "tasks": ["T4001", "T4002"] },
    { "id": "FS1-B", "parallel": true,  "depends_on": ["E1-A"], "tasks": ["T4101", "T4102", "T4103"] }
  ],
  "tasks": [
    {
      "id": "T4001",
      "agent": "susan",
      "title": "ExternalProcess Hardening P1: restart/backoff/log capture",
      "allowedFiles": ["src/wrappers/ExternalServerWrapper.ts", "tests/integration/externalFromConfig.spec.ts", "docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T4001_restart-backoff.patch"]
    },
    {
      "id": "T4002",
      "agent": "susan",
      "title": "ExternalProcess Hardening P1: env/cwd + exit-code mapping",
      "allowedFiles": ["src/wrappers/ExternalServerWrapper.ts", "tests/integration/externalFromConfig.spec.ts", "docs/devex/mkctl-cookbook.md"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T4002_logs-env-exitcodes.patch"]
    },
    {
      "id": "T4101",
      "agent": "susan",
      "title": "FilesystemSink P1: module + append/truncate",
      "allowedFiles": ["src/modules/filesystem-sink.ts", "tests/renderers/filesystemSink.spec.ts", "examples/configs/http-logs-local.yml"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T4101_filesystem-sink-core.patch"]
    },
    {
      "id": "T4102",
      "agent": "susan",
      "title": "FilesystemSink P1: fsync policy + backpressure/errors",
      "allowedFiles": ["src/modules/filesystem-sink.ts", "tests/renderers/filesystemSink.spec.ts"],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T4102_filesystem-sink-fsync.patch"]
    },
    {
      "id": "T4103",
      "agent": "susan",
      "title": "Docs + cookbook: logging to files (Local Node v1.0)",
      "allowedFiles": ["docs/devex/mkctl-cookbook.md", "docs/devex/quickstart.md", "docs/rfcs/stream-kernel/05-router.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T4103_filesystem-sink-docs.patch"]
    }
  ]
}
```

# Ampcode — Core: ExternalProcess Hardening P1 + FilesystemSink P1 (Local Node v1.0)

Goal
- Harden ExternalProcess for production (restart/backoff/logs/env/exit codes) and add a simple FilesystemSink so we can dogfood an HTTP→log demo locally.

Constraints
- MK_LOCAL_NODE=1 (no network adapters). Kernel unchanged.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
```
