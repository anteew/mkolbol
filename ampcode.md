
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
