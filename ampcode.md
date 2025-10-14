
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
  "notes": "Do not branch/commit/push — VEGA handles git. Next sprint: Worker Harness (Phase 1). Keep kernel untouched; add worker harness + executor wiring.",
  "waves": [
    { "id": "IFACES", "parallel": false, "tasks": ["T4801"] },
    { "id": "EXECUTOR", "parallel": false, "depends_on": ["IFACES"], "tasks": ["T4802"] },
    { "id": "ADAPTERS", "parallel": false, "depends_on": ["EXECUTOR"], "tasks": ["T4803"] },
    { "id": "TESTS-DOCS", "parallel": false, "depends_on": ["ADAPTERS"], "tasks": ["T4804", "T4805"] }
  ],
  "tasks": [
    { "id": "T4801", "title": "Worker harness skeleton (threads)", "agent": "susan-1", "desc": "Add src/executor/workerHarness.ts (worker_threads) with message loop: handle init/shutdown, heartbeat, and basic error handling.", "allowedFiles": ["src/executor/workerHarness.ts"], "verify": [ "rg -n 'worker_threads' src/executor/workerHarness.ts", "npm run build" ], "deliverables": ["patches/DIFF_T4801_worker-harness.patch"] },
    { "id": "T4802", "title": "Executor runMode 'worker' integration", "agent": "susan-2", "desc": "Wire Executor to spawn Worker with workerHarness for runMode='worker'; exchange a 'ready' message and register endpoint with Hostess.", "allowedFiles": ["src/executor/Executor.ts"], "verify": [ "rg -n 'runMode.*worker' src/executor/Executor.ts", "npm run build" ], "deliverables": ["patches/DIFF_T4802_executor-worker-mode.patch"] },
    { "id": "T4803", "title": "Worker adapters (stub)", "agent": "susan-3", "desc": "Add minimal WorkerControlAdapter/WorkerPipeAdapter stubs (message passing via parentPort) and integrate basic lifecycle messages.", "allowedFiles": ["src/transport/worker/WorkerControlAdapter.ts", "src/transport/worker/WorkerPipeAdapter.ts", "src/executor/Executor.ts"], "verify": [ "rg -n 'class WorkerControlAdapter' src/transport/worker/WorkerControlAdapter.ts", "rg -n 'class WorkerPipeAdapter' src/transport/worker/WorkerPipeAdapter.ts", "npm run build" ], "deliverables": ["patches/DIFF_T4803_worker-adapters-stub.patch"] },
    { "id": "T4804", "title": "Un-gate worker endpoint test", "agent": "susan-4", "desc": "Remove skip gate for worker endpoint test in endpointsList.spec.ts and ensure it passes; adjust timeouts if needed.", "allowedFiles": ["tests/integration/endpointsList.spec.ts"], "verify": [ "rg -n 'MK_WORKER_EXPERIMENTAL' tests/integration/endpointsList.spec.ts", "npx -y vitest run tests/integration/endpointsList.spec.ts --reporter=basic -c vitest.config.ts || true" ], "deliverables": ["patches/DIFF_T4804_ungate-worker-endpoint-test.patch"] },
    { "id": "T4805", "title": "Docs: worker-mode note", "agent": "susan-5", "desc": "Add a short section to README + 02-core-architecture.md explaining worker-mode and endpoint registration, keeping kernel unchanged.", "allowedFiles": ["README.md", "docs/rfcs/stream-kernel/02-core-architecture.md"], "verify": [ "rg -n 'Worker Mode' README.md docs/rfcs/stream-kernel/02-core-architecture.md || true" ], "deliverables": ["patches/DIFF_T4805_docs-worker-mode.patch"] }
  ]
}
```

# Sprint SB-MK-WORKER-HARNESS-P1 — “Worker Harness (Phase 1)”

Goal: Introduce a minimal worker harness (worker_threads) and wire Executor to runMode='worker' to un-gate endpoint tests without changing the kernel.

Scope
- Implement worker harness message loop (init/shutdown/heartbeat).
- Wire Executor to spawn/track Worker; on 'ready', register worker endpoint.
- Add minimal worker adapters stubs for future control/data paths.
- Un-gate worker endpoint test and ensure it passes.
- Light docs note about worker-mode (keeps kernel inert).

Acceptance
- endpointsList worker test passes (gate removed).
- Local build passes; no kernel changes; adapters/executor/tests only.
```json
{
  "ampcode": "v1",
  "notes": "Do not branch/commit/push — VEGA handles git. Next sprint: Process Mode (Phase 2) — harden Unix adapters, health checks, and cutover.",
  "waves": [
    { "id": "CONTROL",  "parallel": false, "tasks": ["T4901"] },
    { "id": "PIPES",    "parallel": false, "depends_on": ["CONTROL"], "tasks": ["T4902"] },
    { "id": "EXECUTOR", "parallel": false, "depends_on": ["PIPES"], "tasks": ["T4903"] },
    { "id": "TESTS",    "parallel": false, "depends_on": ["EXECUTOR"], "tasks": ["T4904"] },
    { "id": "DOCS",     "parallel": true,  "depends_on": ["EXECUTOR"], "tasks": ["T4905"] }
  ],
  "tasks": [
    {
      "id": "T4901",
      "title": "UnixControlAdapter: publish/subscribe + heartbeats + graceful shutdown",
      "agent": "susan-1",
      "desc": "Implement topic-based pub/sub over Unix sockets, periodic heartbeats, and graceful shutdown signalling.",
      "allowedFiles": ["src/transport/unix/UnixControlAdapter.ts"],
      "verify": [
        "rg -n 'publish|subscribe|heartbeat|shutdown' src/transport/unix/UnixControlAdapter.ts",
        "npm run build"
      ],
      "deliverables": ["patches/DIFF_T4901_unix-control-hardening.patch"]
    },
    {
      "id": "T4902",
      "title": "UnixPipeAdapter: Duplex with backpressure + error propagation",
      "agent": "susan-2",
      "desc": "Wrap Unix socket as a Node.js Duplex supporting backpressure; propagate errors/close to executor.",
      "allowedFiles": ["src/transport/unix/UnixPipeAdapter.ts"],
      "verify": [
        "rg -n 'Duplex|_read|_write' src/transport/unix/UnixPipeAdapter.ts",
        "npm run build"
      ],
      "deliverables": ["patches/DIFF_T4902_unix-pipe-backpressure.patch"]
    },
    {
      "id": "T4903",
      "title": "Executor process-mode health checks + blue/green cutover robustness",
      "agent": "susan-3",
      "desc": "Add child health checks (heartbeat timeouts), robust cutover (drain+switch), and graceful teardown.",
      "allowedFiles": ["src/executor/Executor.ts", "src/examples/process-bluegreen.ts"],
      "verify": [
        "rg -n 'heartbeat|cutover|graceful' src/executor/Executor.ts src/examples/process-bluegreen.ts",
        "npm run build && node dist/examples/process-bluegreen.js || true"
      ],
      "deliverables": ["patches/DIFF_T4903_executor-health-cutover.patch"]
    },
    {
      "id": "T4904",
      "title": "Integration tests: process-mode (Unix) under load + teardown",
      "agent": "susan-4",
      "desc": "Add tests for heavy writes + teardown sequence; keep gated behind MK_PROCESS_EXPERIMENTAL=1 (forks lane).",
      "allowedFiles": ["tests/integration/processUnix.spec.ts", "package.json"],
      "verify": [
        "rg -n 'MK_PROCESS_EXPERIMENTAL' tests/integration/processUnix.spec.ts",
        "jq -r .scripts package.json"
      ],
      "deliverables": ["patches/DIFF_T4904_process-unix-tests.patch"]
    },
    {
      "id": "T4905",
      "title": "Docs: process-mode hardening notes",
      "agent": "susan-5",
      "desc": "Document Unix adapter behavior, heartbeats, cutover expectations in README + RFC (02-core-architecture).",
      "allowedFiles": ["README.md", "docs/rfcs/stream-kernel/02-core-architecture.md"],
      "verify": [
        "rg -n 'Process Mode' README.md docs/rfcs/stream-kernel/02-core-architecture.md || true"
      ],
      "deliverables": ["patches/DIFF_T4905_docs-process-mode-p2.patch"]
    }
  ]
}
```

# Sprint SB-MK-PROCESS-MODE-P2 — “Unix Adapters + Health + Cutover”

Goal: Harden process-mode with working Unix control/pipes, health checks, backpressure, and robust blue/green cutover without touching the kernel.

Scope
- Implement topic pub/sub, heartbeats, graceful shutdown in UnixControlAdapter.
- Implement Duplex with backpressure and error propagation in UnixPipeAdapter.
- Add child health checks, robust cutover mechanics in Executor.
- Integration tests under load and teardown (gated).
- Documentation updates.

Acceptance
- Demos run without errors; integration tests pass when gated.
- No kernel changes; adapters/executor only; CI lanes remain split.
