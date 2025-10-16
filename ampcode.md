```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "R-A", "parallel": false, "tasks": ["T9601", "T9602"] },
    { "id": "R-B", "parallel": true,  "depends_on": ["R-A"], "tasks": ["T9603"] },
    { "id": "R-C", "parallel": false, "depends_on": ["R-B"], "tasks": ["T9604", "T9605"] }
  ],
  "tasks": [
    {
      "id": "T9601",
      "agent": "susan",
      "title": "CI: process-mode enforcement & stability",
      "allowedFiles": [".github/workflows/tests.yml", "tests/integration/processUnix.spec.ts", "docs/rfcs/stream-kernel/02-core-architecture.md"],
      "verify": [
        "npm run build",
        "npm run test:ci",
        "MK_PROCESS_EXPERIMENTAL=1 npm run test:pty"
      ],
      "deliverables": ["patches/DIFF_T9601_ci-process-enforce.patch"]
    },
    {
      "id": "T9602",
      "agent": "susan",
      "title": "RoutingServer P1: inproc announcements",
      "allowedFiles": [
        "src/router/RoutingServer.ts",
        "src/router/index.ts",
        "src/types.ts",
        "tests/integration/router-inproc.spec.ts",
        "docs/rfcs/stream-kernel/05-router.md"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9602_router-skeleton.patch"]
    },
    {
      "id": "T9603",
      "agent": "susan",
      "title": "Executor → Router: endpoint announcements",
      "allowedFiles": [
        "src/executor/Executor.ts",
        "tests/integration/router-announcements.spec.ts"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9603_router-announcements.patch"]
    },
    {
      "id": "T9604",
      "agent": "susan",
      "title": "mkctl endpoints: Router-backed listing",
      "allowedFiles": [
        "scripts/mkctl.ts",
        "tests/cli/mkctlEndpoints.spec.ts",
        "docs/devex/stdio-path.md"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9604_mkctl-endpoints-router.patch"]
    },
    {
      "id": "T9605",
      "agent": "susan",
      "title": "Docs: Router overview & cookbook",
      "allowedFiles": [
        "README.md",
        "docs/rfcs/stream-kernel/05-router.md",
        "docs/devex/quickstart.md",
        "docs/devex/early-adopter-guide.md"
      ],
      "verify": ["npm run build", "npm run test:ci"],
      "deliverables": ["patches/DIFF_T9605_router-docs.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan

**Architect**: VEGA  
**Sprint/Batch**: SB-MK-ROUTER-P1  
**Reporting**: Results go to `ampcode.log`

---

## Context & Scope

**Goal**: Introduce a minimal in-process RoutingServer and wire endpoint announcements, then surface them via mkctl for discovery. Keep kernel inert.

**Constraints**:

- [ ] No network transport yet (inproc only)
- [ ] Kernel remains pipes + registry only
- [ ] CI remains green on Node 20/24; process-mode enforced

**Prerequisites** (if any):

- Standard repo setup: `npm ci`

---

## Execution Waves

```yaml
# Wave structure for parallel/sequential execution
waves:
  - id: R-A
    parallel: false
    tasks: [T9601, T9602]

  - id: R-B
    parallel: true
    depends_on: [R-A]
    tasks: [T9603]

  - id: R-C
    parallel: false
    depends_on: [R-B]
    tasks: [T9604, T9605]
```

---

## Tasks

### TASK T9601 — CI: process-mode enforcement & stability

**Goal**: Ensure process-mode adapters test is strictly required and resilient (timeouts/retries tuned). Confirm raw log capture.

**Allowed Files**:

```yaml
modify:
  - .github/workflows/tests.yml # tighten and document steps
  - tests/integration/processUnix.spec.ts # tune timeouts, retry wrappers
  - docs/rfcs/stream-kernel/02-core-architecture.md # note on process-mode enforcement
```

**Requirements**:

1. Forks lane remains strict (no continue-on-error), except Laminar summary step.
2. Process-mode job required; flaky retries limited and deterministic.
3. Raw logs captured to reports/*_raw.log.

**Success Criteria**:

- npm run test:ci green; MK_PROCESS_EXPERIMENTAL=1 npm run test:pty green.

**Verification Commands**:

```bash
npm run build
npm run test:ci
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
```

**Deliverable**: `patches/DIFF_T9601_ci-process-enforce.patch`

---

### TASK T9602 — RoutingServer P1: inproc announcements

**Goal**: Add a minimal inproc RoutingServer that tracks endpoint announcements (`announce`, `withdraw`) and provides `list()`.

**Allowed Files**:

```yaml
create:
  - src/router/RoutingServer.ts # inproc implementation
  - src/router/index.ts # export
  - tests/integration/router-inproc.spec.ts # coverage
  - docs/rfcs/stream-kernel/05-router.md # spec stub
modify:
  - src/types.ts # shared types for announcements
```

**Requirements**:

1. In-memory store of endpoints keyed by id; includes type/coords/metadata.
2. `announce()` idempotent; `withdraw()` removes.
3. Emits Laminar-friendly JSONL events via existing logger.

**Success Criteria**:

- Tests green; `list()` returns announced endpoints.

**Verification Commands**:

```bash
npm run build
npm run test:ci
```

**Deliverable**: `patches/DIFF_T9602_router-skeleton.patch`

---

### TASK T9603 — Executor → Router: endpoint announcements

**Goal**: On spawn/teardown, Executor emits `announce/withdraw` to RoutingServer.

**Allowed Files**:

```yaml
modify:
  - src/executor/Executor.ts # hook lifecycle to routing
create:
  - tests/integration/router-announcements.spec.ts # verifies announcements
```

**Requirements**:

1. Emit on up/down with minimal metadata (id, type, coords).
2. No cross-process IPC; direct inproc call.

**Success Criteria**:

- Tests observe Router state reflecting Executor lifecycle.

**Verification Commands**:

```bash
npm run build
npm run test:ci
```

**Deliverable**: `patches/DIFF_T9603_router-announcements.patch`

---

### TASK T9604 — mkctl endpoints: Router-backed listing

**Goal**: Extend `mkctl endpoints` to read from RoutingServer and render a concise table.

**Allowed Files**:

```yaml
modify:
  - scripts/mkctl.ts # add router-backed listing
  - docs/devex/stdio-path.md # doc update
create:
  - tests/cli/mkctlEndpoints.spec.ts # CLI verification
```

**Requirements**:

1. `mkctl endpoints` shows id, type, coords, metadata keys.
2. Graceful when router empty.

**Success Criteria**:

- CLI test passes under threads lane.

**Verification Commands**:

```bash
npm run build
npm run test:ci
```

**Deliverable**: `patches/DIFF_T9604_mkctl-endpoints-router.patch`

---

### TASK T9605 — Docs: Router overview & cookbook

**Goal**: Introduce Router concept, lifecycle, and mkctl discovery in docs.

**Allowed Files**:

```yaml
modify:
  - README.md
  - docs/rfcs/stream-kernel/05-router.md
  - docs/devex/quickstart.md
  - docs/devex/early-adopter-guide.md
```

**Requirements**:

1. One-page overview + minimal API.
2. Cookbook snippets for announce/list in tests/demos.

**Deliverable**: `patches/DIFF_T9605_router-docs.patch`

---

## Quality Bar

**Non-negotiable**:

- [ ] All tests pass; no kernel changes
- [ ] Deterministic tests; small diffs; clear patch headers
- [ ] Reports generated under `reports/`; point to `reports/summary.jsonl`

## Reporting Format

Follow AMPCODE_TEMPLATE.md “Reporting Format”; append results to `ampcode.log` with deliverables and verification status.

