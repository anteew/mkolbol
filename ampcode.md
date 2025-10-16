```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "E3-A",  "parallel": false, "tasks": ["T6001", "T6002"] },
    { "id": "E3-B",  "parallel": true,  "depends_on": ["E3-A"], "tasks": ["T6003", "T6004"] },
    { "id": "E4-A",  "parallel": true,  "tasks": ["T7001","T7002","T7003","T7004","T7005","T7006"] },
    { "id": "E4-B",  "parallel": true,  "tasks": ["T7011","T7012","T7013","T7014","T7015","T7016"] },
    { "id": "E4-C",  "parallel": true,  "depends_on": ["E4-A"], "tasks": ["T7021","T7022","T7023","T7024","T7025","T7026"] },
    { "id": "E5-A",  "parallel": true,  "tasks": ["T8001","T8002","T8003"] },
    { "id": "E5-B",  "parallel": false, "depends_on": ["E5-A"], "tasks": ["T8004","T8005"] }
  ],
  "tasks": [
    {"id": "T6001", "agent": "susan", "title": "Router P2 polish: mkctl endpoints --json + metadata filters", "allowedFiles": ["scripts/mkctl.ts", "src/router/RoutingServer.ts", "tests/cli/mkctlEndpoints.spec.ts"], "verify": ["npm run build", "npm run test:ci"], "deliverables": ["patches/DIFF_T6001_mkctl-endpoints-json.patch"]},
    {"id": "T6002", "agent": "susan", "title": "FilesystemSink P2: format option (raw|jsonl) + timestamp", "allowedFiles": ["src/modules/filesystem-sink.ts", "tests/renderers/filesystemSink.spec.ts", "docs/devex/quickstart.md"], "verify": ["npm run build", "npm run test:ci"], "deliverables": ["patches/DIFF_T6002_filesink-format-jsonl.patch"]},
    {"id": "T6003", "agent": "susan", "title": "ExternalProcess P2: health check (HTTP or command) during startup", "allowedFiles": ["src/wrappers/ExternalServerWrapper.ts", "tests/integration/externalFromConfig.spec.ts", "docs/devex/mkctl-cookbook.md"], "verify": ["npm run build", "npm run test:ci"], "deliverables": ["patches/DIFF_T6003_external-healthcheck.patch"]},
    {"id": "T6004", "agent": "susan", "title": "mkctl run: map health failure to non-zero exit + docs", "allowedFiles": ["scripts/mkctl.ts", "tests/cli/mkctlRun.spec.ts", "docs/devex/mkctl-cookbook.md"], "verify": ["npm run build", "npm run test:ci"], "deliverables": ["patches/DIFF_T6004_mkctl-health-exit.patch"]},
    {"id":"T7001","agent":"susan","title":"Router P2: endpoints --json + metadata filters","allowedFiles":["scripts/mkctl.ts","tests/cli/mkctlEndpoints.spec.ts","docs/devex/mkctl-cookbook.md"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7001_endpoints-json.patch"]},
    {"id":"T7002","agent":"susan","title":"Router P2: TTL sweeper metrics + debug emits","allowedFiles":["src/router/RoutingServer.ts","tests/router/*.spec.ts","docs/devex/mkctl-cookbook.md"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7002_router-metrics.patch"]},
    {"id":"T7003","agent":"susan","title":"mkctl run: --dry-run (validate only) + schema errors","allowedFiles":["scripts/mkctl.ts","src/config/loader.ts","tests/cli/mkctlRun.spec.ts"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7003_mkctl-dry-run.patch"]},
    {"id":"T7004","agent":"susan","title":"FilesystemSink P2: format option (raw|jsonl) with timestamp","allowedFiles":["src/modules/filesystem-sink.ts","tests/renderers/filesystemSink.spec.ts","docs/devex/quickstart.md"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7004_filesink-jsonl.patch"]},
    {"id":"T7005","agent":"susan","title":"ConsoleSink: jsonl mode (optional) + tests","allowedFiles":["src/modules/consoleSink.ts","tests/integration/multiModalOutput.spec.ts"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7005_console-jsonl.patch"]},
    {"id":"T7006","agent":"susan","title":"Transform: PipeMeter (bytes,msg/sec) + tests","allowedFiles":["src/transforms/pipeMeter.ts","tests/transforms/pipeMeter.spec.ts","docs/devex/mkctl-cookbook.md"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7006_pipe-meter.patch"]},
    {"id":"T7011","agent":"susan","title":"ExternalProcess P2: startup health check (HTTP or command)","allowedFiles":["src/wrappers/ExternalServerWrapper.ts","tests/integration/externalFromConfig.spec.ts","docs/devex/mkctl-cookbook.md"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7011_external-health.patch"]},
    {"id":"T7012","agent":"susan","title":"mkctl: map health failure to non-zero exit + message","allowedFiles":["scripts/mkctl.ts","tests/cli/mkctlRun.spec.ts","docs/devex/mkctl-cookbook.md"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7012_mkctl-health-exit.patch"]},
    {"id":"T7013","agent":"susan","title":"Executor: blue/green cutover under load (no loss)","allowedFiles":["src/executor/Executor.ts","tests/integration/executorCutover.spec.ts"],"verify":["npm run build","npm run test:ci","MK_PROCESS_EXPERIMENTAL=1 npm run test:pty"],"deliverables":["patches/DIFF_T7013_executor-cutover.patch"]},
    {"id":"T7014","agent":"susan","title":"RateLimiter transform (tokens/sec) + tests","allowedFiles":["src/transforms/rateLimiter.ts","tests/transforms/rateLimiter.spec.ts"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7014_rate-limiter.patch"]},
    {"id":"T7015","agent":"susan","title":"Tee transform (duplicate stream to N outputs)","allowedFiles":["src/transforms/tee.ts","tests/transforms/tee.spec.ts"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7015_tee-transform.patch"]},
    {"id":"T7016","agent":"susan","title":"ANSI Parser P4: OSC robustness + perf guards","allowedFiles":["src/transforms/AnsiParser.ts","tests/transforms/ansiParser.performance.spec.ts"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7016_ansi-p4.patch"]},
    {"id":"T7021","agent":"susan","title":"Examples: http-logs-local-file + PipeMeter + JSONL","allowedFiles":["examples/configs/http-logs-local-file.yml","docs/devex/quickstart.md","tests/devex/acceptance/local-node-v1.md"],"verify":["npm run build"],"deliverables":["patches/DIFF_T7021_examples-jsonl-meter.patch"]},
    {"id":"T7022","agent":"susan","title":"Acceptance tests: stress & property-based for FileSink","allowedFiles":["tests/renderers/filesystemSink.spec.ts","tests/devex/acceptance/local-node-v1.md"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7022_filesink-stress.patch"]},
    {"id":"T7023","agent":"susan","title":"CI: add acceptance smoke job (best-effort)","allowedFiles":[".github/workflows/tests.yml"],"verify":["npm run build"],"deliverables":["patches/DIFF_T7023_ci-acceptance-smoke.patch"]},
    {"id":"T7024","agent":"susan","title":"Docs: mkctl cookbook additions (dry-run, health, jsonl)","allowedFiles":["docs/devex/mkctl-cookbook.md","docs/devex/quickstart.md"],"verify":["npm run build"],"deliverables":["patches/DIFF_T7024_cookbook.jsonl-health.patch"]},
    {"id":"T7025","agent":"susan","title":"ModuleRegistry: register new transforms + examples","allowedFiles":["src/executor/moduleRegistry.ts","examples/**"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T7025_module-registry.patch"]},
    {"id":"T7026","agent":"susan","title":"Cleanup: remove dead shims/backups, organize exports","allowedFiles":["src/transforms/AnsiParser.ts.backup","src/transports/unix/*.js","package.json"],"verify":["npm run build"],"deliverables":["patches/DIFF_T7026_cleanup-exports.patch"]}
    ,
    {"id":"T8001","agent":"susan","title":"TerminalTTYRenderer v1: simple TTY passthrough renderer (stdout/file)","allowedFiles":["src/modules/ttyRenderer.ts","src/executor/moduleRegistry.ts","tests/renderers/ttyRenderer.spec.ts","examples/configs/tty-basic.yml","docs/devex/tty-renderer.md"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T8001_tty-renderer.patch"]},
    {"id":"T8002","agent":"susan","title":"Examples: ExternalProcess → TTYRenderer (ANSI demo) + mkctl guide", "allowedFiles":["examples/configs/tty-external.yml","docs/devex/quickstart.md"],"verify":["npm run build"],"deliverables":["patches/DIFF_T8002_tty-examples.patch"]},
    {"id":"T8003","agent":"susan","title":"TTYRenderer tests: file-target assertions + non-TTY safeguards","allowedFiles":["tests/renderers/ttyRenderer.spec.ts"],"verify":["npm run build","npm run test:ci"],"deliverables":["patches/DIFF_T8003_tty-tests.patch"]},
    {"id":"T8004","agent":"susan","title":"Acceptance polish: acceptance:run script + PipeMeter/RateLimiter/Tee chain","allowedFiles":["package.json","scripts/acceptance-run.ts","tests/devex/acceptance/local-node-v1.md"],"verify":["npm run build"],"deliverables":["patches/DIFF_T8004_acceptance-run.patch"]},
    {"id":"T8005","agent":"susan","title":"Local soak harness (non‑gating): 30–60m stability under load","allowedFiles":["tests/integration/soakLocal.spec.ts"],"verify":["npm run build"],"deliverables":["patches/DIFF_T8005_soak-harness.patch"]}
  ]
}
```

# Ampcode — Core Sprint (Router polish, FileSink JSONL, ExternalProcess health) + Extended Mega Waves (E4/E5)

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
