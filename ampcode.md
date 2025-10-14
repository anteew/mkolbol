
```json
{
  "ampcode": "v1",
  "notes": "Do not branch/commit/push — VEGA handles git. Focus: Hostess endpoint metadata. Keep changes minimal and aligned with existing style.",
  "waves": [
    { "id": "ENDPOINT-SCHEMA", "parallel": false, "tasks": ["T4601"] },
    { "id": "EXECUTOR-PROP", "parallel": false, "depends_on": ["ENDPOINT-SCHEMA"], "tasks": ["T4602"] },
    { "id": "TOOLS-DOCS", "parallel": true, "depends_on": ["EXECUTOR-PROP"], "tasks": ["T4603", "T4604"] },
    { "id": "INTEGRATION", "parallel": false, "depends_on": ["TOOLS-DOCS"], "tasks": ["T4605"] }
  ],
  "tasks": [
    {
      "id": "T4601",
      "title": "Hostess endpoint schema + APIs",
      "agent": "susan-1",
      "desc": "Add endpoint metadata to Hostess with list/query APIs (types + storage).",
      "allowedFiles": ["src/hostess/Hostess.ts", "src/types.ts"],
      "verify": [
        "rg -n 'interface HostessEndpoint' src/types.ts || true",
        "rg -n 'listEndpoints|registerEndpoint' src/hostess/Hostess.ts",
        "npm run build"
      ],
      "deliverables": ["patches/DIFF_T4601_hostess-endpoint-schema.patch"]
    },
    {
      "id": "T4602",
      "title": "Executor propagates endpoint metadata",
      "agent": "susan-2",
      "desc": "Include endpoint metadata when nodes/wrappers register with Hostess.",
      "allowedFiles": ["src/executor/Executor.ts", "src/wrappers/PTYServerWrapper.ts", "src/wrappers/ExternalServerWrapper.ts"],
      "verify": [
        "rg -n 'endpoint|endpoints' src/executor/Executor.ts",
        "rg -n 'endpoint|endpoints' src/wrappers/PTYServerWrapper.ts src/wrappers/ExternalServerWrapper.ts",
        "npm run build"
      ],
      "deliverables": ["patches/DIFF_T4602_executor-endpoint-prop.patch"]
    },
    {
      "id": "T4603",
      "title": "mkctl endpoints: list Hostess-registered endpoints",
      "agent": "susan-3",
      "desc": "Add a minimal CLI script to print endpoints (type, coordinates).",
      "allowedFiles": ["scripts/mkctl.ts", "README.md"],
      "verify": [
        "rg -n 'endpoints' scripts/mkctl.ts",
        "npm run build && node dist/scripts/mkctl.js endpoints || true"
      ],
      "deliverables": ["patches/DIFF_T4603_mkctl-endpoints.patch"]
    },
    {
      "id": "T4604",
      "title": "Docs: endpoint model + discovery",
      "agent": "susan-4",
      "desc": "Document endpoint types and coordinates; add short how-to in README and core architecture RFC.",
      "allowedFiles": ["README.md", "docs/rfcs/stream-kernel/02-core-architecture.md"],
      "verify": [
        "rg -n 'Endpoints' README.md docs/rfcs/stream-kernel/02-core-architecture.md"
      ],
      "deliverables": ["patches/DIFF_T4604_docs-endpoints.patch"]
    },
    {
      "id": "T4605",
      "title": "Integration test: endpoints registered + listable",
      "agent": "susan-5",
      "desc": "End-to-end test to assert endpoint registration and listing via Hostess.",
      "allowedFiles": ["tests/hostess/hostessEndpoints.spec.ts", "tests/integration/endpointsList.spec.ts"],
      "verify": [
        "npm run test:ci -- tests/hostess/hostessEndpoints.spec.ts --run",
        "npm run test:ci -- tests/integration/endpointsList.spec.ts --run || true"
      ],
      "deliverables": ["patches/DIFF_T4605_tests-endpoints.patch"]
    }
  ]
}
```

# Sprint SB-MK-HOSTESS-ENDPOINTS-P1 — “Endpoint Metadata & Discovery”

Goal: Make endpoints first-class so tools and examples can discover/control nodes without changing the kernel.

Scope
- Add endpoint metadata schema and Hostess list/query APIs.
- Executor/wrappers propagate endpoint metadata on registration.
- Minimal CLI (`mkctl endpoints`) to list endpoints (type + coordinates).
- Documentation of endpoint types + coordinates and discovery pattern.
- Integration tests validating end-to-end registration and listing.

Acceptance
- Running `node dist/examples/hostess-demo.js` followed by `node dist/scripts/mkctl.js endpoints` prints at least one endpoint with type and coordinates.
- Tests covering Hostess registration and listing pass.
- README and RFC updated to include endpoint model.

---

```json
{
  "ampcode": "v1",
  "notes": "Intermediate stabilization to make endpoints usable to humans/agents and remove flaky assumptions.",
  "waves": [
    { "id": "GATEWORKER",  "parallel": false, "tasks": ["T4611"] },
    { "id": "CI-SPLIT",   "parallel": false, "tasks": ["T4612"] },
    { "id": "SNAPSHOT-CLI","parallel": false, "tasks": ["T4613"] }
  ],
  "tasks": [
    {
      "id": "T4611",
      "title": "Gate worker-node endpoint test until harness exists",
      "agent": "susan-1",
      "desc": "Skip or conditionally run the worker-nodes endpoint registration test unless MK_WORKER_EXPERIMENTAL=1 or worker harness is present.",
      "allowedFiles": ["tests/integration/endpointsList.spec.ts", "vitest.config.ts"],
      "verify": [
        "rg -n 'MK_WORKER_EXPERIMENTAL' tests/integration/endpointsList.spec.ts",
        "npx -y vitest run tests/integration/endpointsList.spec.ts --reporter=basic -c vitest.config.ts || true"
      ],
      "deliverables": ["patches/DIFF_T4611_gate-worker-test.patch"]
    },
    {
      "id": "T4612",
      "title": "Confirm CI split: PTY lane isolated; threads lane excludes PTY",
      "agent": "susan-2",
      "desc": "Ensure package.json scripts keep PTY specs in forks lane only and thread lane excludes them. Increase timeout for endpoints integration tests if needed (testTimeout or per-test).",
      "allowedFiles": ["package.json", "tests/integration/endpointsList.spec.ts"],
      "verify": [
        "jq -r .scripts package.json",
        "rg -n 'testTimeout|setTimeout' tests/integration/endpointsList.spec.ts || true"
      ],
      "deliverables": ["patches/DIFF_T4612_ci-split-timeouts.patch"]
    },
    {
      "id": "T4613",
      "title": "Endpoints snapshot + mkctl reader",
      "agent": "susan-3",
      "desc": "Write a JSON snapshot of endpoints to reports/endpoints.json on register; update mkctl to read and print from that snapshot so it works across processes.",
      "allowedFiles": ["src/hostess/Hostess.ts", "scripts/mkctl.ts"],
      "verify": [
        "rg -n 'endpoints.json' src/hostess/Hostess.ts scripts/mkctl.ts",
        "npm run build && node dist/examples/hostess-demo.js >/dev/null 2>&1 & echo $! > /tmp/hostess.pid; sleep 1; node dist/scripts/mkctl.js endpoints || true; kill $(cat /tmp/hostess.pid) 2>/dev/null || true"
      ],
      "deliverables": ["patches/DIFF_T4613_endpoints-snapshot-mkctl.patch"]
    }
  ]
}
```

```json
{
  "ampcode": "v1",
  "notes": "Do not branch/commit/push — VEGA handles git. Next sprint: Process Mode (Phase 1). Keep kernel untouched; add adapters and executor wiring only.",
  "waves": [
    { "id": "IFACES", "parallel": false, "tasks": ["T4701"] },
    { "id": "EXECUTOR", "parallel": false, "depends_on": ["IFACES"], "tasks": ["T4702"] },
    { "id": "TRANSPORT", "parallel": false, "depends_on": ["EXECUTOR"], "tasks": ["T4703"] },
    { "id": "DEMO-TESTS", "parallel": false, "depends_on": ["TRANSPORT"], "tasks": ["T4704", "T4705"] }
  ],
  "tasks": [
    {
      "id": "T4701",
      "title": "Process-mode adapter interfaces",
      "agent": "susan-1",
      "desc": "Define minimal interfaces for process pipes and control adapters (types only). No kernel changes.",
      "allowedFiles": ["src/types.ts", "src/executor/ProcessInterfaces.ts"],
      "verify": [
        "rg -n 'interface ProcessPipeAdapter' src/executor/ProcessInterfaces.ts",
        "npm run build"
      ],
      "deliverables": ["patches/DIFF_T4701_process-ifaces.patch"]
    },
    {
      "id": "T4702",
      "title": "Executor runMode 'process' skeleton",
      "agent": "susan-2",
      "desc": "Add runMode 'process' to Executor: spawn child process, connect stdio to pipe adapters, basic lifecycle (start/stop).",
      "allowedFiles": ["src/executor/Executor.ts", "src/examples/process-demo.ts"],
      "verify": [
        "rg -n 'runMode.*process' src/executor/Executor.ts",
        "npm run build && node dist/examples/process-demo.js || true"
      ],
      "deliverables": ["patches/DIFF_T4702_executor-process-skeleton.patch"]
    },
    {
      "id": "T4703",
      "title": "Unix socket transport stubs (control + pipes)",
      "agent": "susan-3",
      "desc": "Add stub adapters for Unix domain sockets for control channel and data pipes; wire into Executor when runMode=process.",
      "allowedFiles": ["src/transport/unix/UnixControlAdapter.ts", "src/transport/unix/UnixPipeAdapter.ts", "src/executor/Executor.ts"],
      "verify": [
        "rg -n 'class UnixControlAdapter' src/transport/unix/UnixControlAdapter.ts",
        "rg -n 'class UnixPipeAdapter' src/transport/unix/UnixPipeAdapter.ts",
        "npm run build"
      ],
      "deliverables": ["patches/DIFF_T4703_unix-transport-stubs.patch"]
    },
    {
      "id": "T4704",
      "title": "Blue/green cutover demo",
      "agent": "susan-4",
      "desc": "Example script that starts a node in process-mode and demonstrates blue/green cutover by restarting child and switching pipes.",
      "allowedFiles": ["src/examples/process-bluegreen.ts", "README.md"],
      "verify": [
        "npm run build && node dist/examples/process-bluegreen.js || true"
      ],
      "deliverables": ["patches/DIFF_T4704_bluegreen-demo.patch"]
    },
    {
      "id": "T4705",
      "title": "Integration tests (gated)",
      "agent": "susan-5",
      "desc": "Add minimal process-mode integration test gated behind MK_PROCESS_EXPERIMENTAL=1; ensure threads lane excludes it and forks lane runs it.",
      "allowedFiles": ["tests/integration/processMode.spec.ts", "package.json"],
      "verify": [
        "rg -n 'MK_PROCESS_EXPERIMENTAL' tests/integration/processMode.spec.ts",
        "jq -r .scripts package.json"
      ],
      "deliverables": ["patches/DIFF_T4705_process-tests.patch"]
    }
  ]
}
```

# Sprint SB-MK-PROCESS-MODE-P1 — “Process Mode (Phase 1)”

Goal: Introduce a minimal process-mode for Executor with Unix socket stubs, enabling external child processes and a blue/green cutover demo, without changing the kernel.

Scope
- Define adapter interfaces (types only) for process-mode.
- Implement Executor runMode 'process' skeleton (spawn, wire stdio, lifecycle).
- Add Unix socket control/data stubs and integrate.
- Provide a blue/green cutover demo script.
- Add a gated integration test for process-mode.

Acceptance
- `node dist/examples/process-demo.js` and `process-bluegreen.js` run without errors (locally).
- Integration test passes when `MK_PROCESS_EXPERIMENTAL=1`; excluded from threads lane.
- Kernel untouched; all changes in adapters/executor/examples.
