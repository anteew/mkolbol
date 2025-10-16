```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "E4-A",  "parallel": true,  "tasks": ["T7001","T7002","T7003","T7004","T7005","T7006"] },
    { "id": "E4-B",  "parallel": true,  "tasks": ["T7011","T7012","T7013","T7014","T7015","T7016"] },
    { "id": "E4-C",  "parallel": true,  "depends_on": ["E4-A"], "tasks": ["T7021","T7022","T7023","T7024","T7025","T7026"] }
  ],
  "tasks": [
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
  ]
}
```

# Susan E4 Mega Sprint — Local Node v1.0 (Bin-Packed)

Goal
- Heavily parallelize independent, Local‑Node‑only features to stress Susan’s subagent orchestration (up to ~20 tasks). Focus on: Router polish, mkctl UX, File/Console sinks, transforms, ExternalProcess health, Executor cutover, examples, CI, and docs. Kernel remains unchanged.

Constraints
- `MK_LOCAL_NODE=1` enforced. No network adapters.
- Each task must deliver a patch file and tests/docs where applicable.
- Keep CI lanes green; acceptance smoke is best‑effort and must not gate merges.

Verification Commands
```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
```

Quality Bar
- Deterministic tests; Laminar reporter enabled.
- Clear, minimal diffs; consistent naming; small modules.
- Failure surfaces with actionable messages.

Notes for Susan
- Run waves E4‑A/B in parallel; E4‑C depends on A.
- Prefer creating small, composable transforms over expanding core.
- Use AMPCODE template within subagents; append concise status to ampcode.log.

