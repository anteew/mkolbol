```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "A", "parallel": true, "tasks": ["T8001", "T8002"] },
    { "id": "B", "parallel": false, "depends_on": ["A"], "tasks": ["T8003", "T8004"] },
    { "id": "C", "parallel": true, "depends_on": ["B"], "tasks": ["T8005", "T8006", "T8007"] },
    { "id": "D", "parallel": false, "depends_on": ["C"], "tasks": ["T8008", "T8009"] }
  ],
  "tasks": [
    {
      "id": "T8001",
      "agent": "devex",
      "title": "Early Adopter Guide (First 5 Minutes)",
      "deliverables": ["patches/DIFF_DEVEX_T8001_early-adopter-guide.patch"]
    },
    {
      "id": "T8002",
      "agent": "devex",
      "title": "Quickstart: Run a Minimal Topology",
      "deliverables": ["patches/DIFF_DEVEX_T8002_quickstart-topology.patch"]
    },
    {
      "id": "T8003",
      "agent": "devex",
      "title": "Write Your First Server (Tutorial)",
      "deliverables": ["patches/DIFF_DEVEX_T8003_first-server-tutorial.patch"]
    },
    {
      "id": "T8004",
      "agent": "devex",
      "title": "Wire-Up & Test: Config + CI",
      "deliverables": ["patches/DIFF_DEVEX_T8004_wire-and-test.patch"]
    },
    {
      "id": "T8005",
      "agent": "devex",
      "title": "Packaging Prototype (Single Runner)",
      "deliverables": ["patches/DIFF_DEVEX_T8005_packaging-prototype.patch"]
    },
    {
      "id": "T8006",
      "agent": "devex",
      "title": "Third‑Party Server Acceptance Suite",
      "deliverables": ["patches/DIFF_DEVEX_T8006_acceptance-suite.patch"]
    },
    {
      "id": "T8007",
      "agent": "devex",
      "title": "Laminar Dev Workflow for Early Adopters",
      "deliverables": ["patches/DIFF_DEVEX_T8007_laminar-dev-workflow.patch"]
    },
    {
      "id": "T8008",
      "agent": "devex",
      "title": "Scaffolder RFC: mkolbol init",
      "deliverables": ["patches/DIFF_DEVEX_T8008_scaffolder-rfc.patch"]
    },
    {
      "id": "T8009",
      "agent": "devex",
      "title": "DX Issue Templates + Feedback Hooks",
      "deliverables": ["patches/DIFF_DEVEX_T8009_feedback-hooks.patch"]
    }
  ]
}
```

# Sprint — SB-DEVEX-MKCTL-P1 (Docs for mkctl run + First-Five-Minutes landing)

**Architect**: VEGA  
**Role**: Developer Experience (external early adopter focus)  
**Reporting**: Append results to `ampcode.log` and place diffs under `patches/` as listed.

---

## Context & Scope

**Goal**: Enable a third‑party developer to (1) understand mkolbol’s model, (2) run a minimal topology locally, (3) author a simple server, (4) wire and test it, and (5) produce a distributable runner — all without changing the kernel.

**Constraints**

- No kernel changes; scope limited to docs, examples, simple tooling, tests.
- Keep CI green on Node 20/24; process‑mode enforcement remains required.
- Deterministic tests; avoid long sleeps and flakiness.

**Prerequisites**

- Node 20 or 24; npm.
- Local runs may use `lam` (Laminar) but publishing is not required; use GitHub install method if needed.

---

## Waves

```yaml
waves:
  - id: A
    parallel: true
    tasks: [T8001, T8002]

  - id: B
    parallel: false
    depends_on: [A]
    tasks: [T8003, T8004]

  - id: C
    parallel: true
    depends_on: [B]
    tasks: [T8005, T8006, T8007]

  - id: D
    parallel: false
    depends_on: [C]
    tasks: [T8008, T8009]
```

---

## Tasks (new)

### TASK D8701 — mkctl run docs + quickstart

**Goal**: Document `mkctl run --file` usage and update quickstart to prefer mkctl for first runs.

**Allowed Files**

```yaml
modify:
  - docs/devex/quickstart.md
  - README.md
  - docs/devex/wiring-and-tests.md
```

**Requirements**

1. Add YAML/JSON blocks that match the new schema (runMode: 'process' optional; module: 'ExternalProcess'; params: { command, args, ioMode }).
2. Clarify when to run forks vs threads; point to acceptance suite templates.
3. Link to example configs under examples/configs/ if present.

**Deliverable**: `patches/DIFF_D8701_docs-mkctl-run.patch`

---

### TASK D8702 — mkctl endpoints doc update

**Goal**: Document that mkctl endpoints show ioMode for external endpoints and how to interpret it.

**Allowed Files**

```yaml
modify:
  - README.md
  - docs/devex/stdio-path.md
```

**Deliverable**: `patches/DIFF_D8702_docs-mkctl-endpoints.patch`

---

### TASK D8703 — Acceptance suite note (executor gating)

**Goal**: Note the MK_DEVEX_EXECUTOR flag to enable the “Executor topology” acceptance test and provide brief instructions.

**Allowed Files**

```yaml
modify:
  - tests/devex/README.md
  - docs/devex/wiring-and-tests.md
```

**Deliverable**: `patches/DIFF_D8703_docs-acceptance-gating.patch`

---

### TASK D8704 — Early adopter guide cross-links + First Five Minutes landing

**Goal**: Add a small landing section in early-adopter-guide that presents “Choose your path” (mkctl run, StdIO, Interactive), and cross-link between pages.

**Allowed Files**

```yaml
modify:
  - docs/devex/early-adopter-guide.md
  - docs/devex/quickstart.md
```

**Deliverable**: `patches/DIFF_D8704_docs-first-five-minutes.patch`

### TASK T8001 — Early Adopter Guide (First 5 Minutes)

**Goal**: Produce a concise “what it is / how it flows” doc tailored to new developers.

**Allowed Files**

```yaml
create:
  - docs/devex/early-adopter-guide.md # overview, glossary, mental model
modify:
  - README.md # link to guide
```

**Requirements**

1. Explain: kernel as pipes+registry; modules by type; run modes (inproc/worker/process).
2. Show a one‑screen diagram + ASCII flow for a minimal topology.
3. Call out where logs/artifacts appear (reports/, Laminar summary/trends).

**Success Criteria**

- Dev can read this doc alone and understand how to try the quickstart next.

**Verification**

- Self‑containment review; links resolve.

**Deliverable**: `patches/DIFF_DEVEX_T8001_early-adopter-guide.patch`

---

### TASK T8002 — Quickstart: Run a Minimal Topology

**Goal**: Document a minimal local run using existing pieces (no new code): PTY → XtermTTYRenderer.

**Allowed Files**

```yaml
create:
  - docs/devex/quickstart.md # commands and expected output
modify:
  - README.md # add Quickstart section anchor
```

**Requirements**

1. Commands to install, build, and run demo: `node dist/examples/tty-renderer-demo.js`.
2. Expected terminal output (what you’ll see), and how to exit cleanly.
3. Troubleshooting notes (e.g., PTY permissions on macOS/Linux, Node version).

**Success Criteria**

- Fresh machine can follow and see live terminal output.

**Verification**

- Run: `npm ci && npm run build && node dist/examples/tty-renderer-demo.js` (document only; no code changes).

**Deliverable**: `patches/DIFF_DEVEX_T8002_quickstart-topology.patch`

---

### TASK T8003 — Write Your First Server (Tutorial)

**Goal**: Teach an adopter to create a simple server module (choose: new Transform or simple External process) and wire it.

**Allowed Files**

```yaml
create:
  - docs/devex/first-server-tutorial.md # step-by-step with code snippets
  - examples/early-adopter/README.md # index for sample app
  - examples/early-adopter/README_CODEOWNERS.txt # attribution placeholder
modify:
  - docs/rfcs/stream-kernel/03-module-types.md # link to tutorial
```

**Requirements**

1. Present two paths (adopter chooses one):
   - Transform module (inproc): read from inputPipe, transform, write to outputPipe.
   - External process (process‑mode): spawn a child (e.g., `cat`) and forward stdin/stdout.
2. Provide minimal TypeScript skeleton(s) and where to place them in adopter’s repo (not this repo’s kernel).
3. Show how to register endpoints with Hostess (expected metadata), and how to trace via logs.

**Success Criteria**

- Following tutorial yields a working module in a separate project.

**Verification**

- Include a “smoke checklist” the adopter can run (build/test commands) — documented only.

**Deliverable**: `patches/DIFF_DEVEX_T8003_first-server-tutorial.patch`

---

### TASK T8004 — Wire‑Up & Test: Config + CI

**Goal**: Document how to wire the adopter’s server using the config loader and how to run tests locally and in CI.

**Allowed Files**

```yaml
create:
  - docs/devex/wiring-and-tests.md # config schema & examples
  - tests/devex/README.md # describes acceptance checks
  - tests/devex/server-acceptance.spec.ts # skeleton test (no kernel changes)
modify:
  - docs/testing/ci.md # link DevEx docs
```

**Requirements**

1. YAML + JSON examples for a topology that includes the adopter’s server.
2. Explain forks/threads lanes and which tests go where.
3. Provide a Vitest skeleton the adopter can copy into their repo that exercises Hostess endpoint registration + stream IO.

**Success Criteria**

- A newcomer can wire their module and run tests that meaningfully fail if wiring is wrong.

**Verification**

- `npx vitest --help` reference and copy‑pasteable test skeleton (doc-only here).

**Deliverable**: `patches/DIFF_DEVEX_T8004_wire-and-test.patch`

---

### TASK T8005 — Packaging Prototype (Single Runner)

**Goal**: Show an adopter one way to ship a single executable runner that embeds their servers and references kernel APIs.

**Allowed Files**

```yaml
create:
  - docs/devex/packaging.md # evaluate esbuild/ncc/pkg; pros/cons
  - examples/early-adopter/package.json # example scripts (build:bundle)
  - examples/early-adopter/scripts/build-bundle.mjs # example (stub) bundling script
```

**Requirements**

1. Compare esbuild vs. @vercel/ncc vs. pkg — pick one for the sample and document why.
2. Provide a sample bundle script and commands (in examples/early-adopter) that creates `dist/runner.js` or a native‑like bundle.
3. Document how environment variables/config files are discovered at runtime.

**Success Criteria**

- Adopter can produce a runnable artifact with their server included.

**Verification**

- Commands listed and sanity‑checked (doc + example files only).

**Deliverable**: `patches/DIFF_DEVEX_T8005_packaging-prototype.patch`

---

### TASK T8006 — Third‑Party Server Acceptance Suite

**Goal**: Provide a small, copy‑friendly test suite an adopter can run in their repo to validate a server implementation.

**Allowed Files**

```yaml
create:
  - tests/devex/acceptance/README.md
  - tests/devex/acceptance/hostess.spec.ts # endpoint metadata, liveness
  - tests/devex/acceptance/streams.spec.ts # input/output roundtrip, backpressure smoke
  - tests/devex/acceptance/process-mode.spec.ts # forks lane life‑cycle (gated note)
```

**Requirements**

1. Each spec should be minimal and self‑contained; avoid kernel internals.
2. Include comments on how to adapt imports for an external project.
3. Note which specs belong to threads vs. forks lanes.

**Success Criteria**

- A third‑party server passes the suite if it’s wired correctly.

**Verification**

- Document exact `vitest` commands (threads/forks), expected artifacts under `reports/` if Laminar is used.

**Deliverable**: `patches/DIFF_DEVEX_T8006_acceptance-suite.patch`

---

### TASK T8007 — Laminar Dev Workflow for Early Adopters

**Goal**: Document how to use Laminar locally (GitHub install) with this project and with an adopter’s repo for ROI‑friendly logs.

**Allowed Files**

```yaml
create:
  - docs/devex/laminar-workflow.md # install (github:…), run, summary/trends, artifacts
modify:
  - README.md # point to laminar-workflow
```

**Requirements**

1. Only show GitHub dependency install (no private npm publish required).
2. Show `npm run lam -- summary` and `-- trends --top 10` usage; explain artifacts.
3. Include a note on how to attach Laminar to CI (sample yaml) without breaking builds.

**Success Criteria**

- Adopter can self‑service basic observability of tests and failures.

**Deliverable**

- `patches/DIFF_DEVEX_T8007_laminar-dev-workflow.patch`

---

### TASK T8008 — Scaffolder RFC: mkolbol init

**Goal**: Write a brief RFC proposing a scaffolder that generates a skeleton server project wired to the kernel.

**Allowed Files**

```yaml
create:
  - docs/devex/rfcs/0001-mkolbol-init.md # scope, UX, minimal files created, guardrails
```

**Requirements**

1. CLI UX (`npm create mkolbol@latest` vs. `npx`) and inputs (project name, server type).
2. Files generated, minimal tests, and CI stub.
3. Guardrails (no kernel changes; versions pinned; deterministic template).

**Success Criteria**

- RFC is actionable; we can approve/decline with clear next steps.

**Deliverable**: `patches/DIFF_DEVEX_T8008_scaffolder-rfc.patch`

---

### TASK T8009 — DX Issue Templates + Feedback Hooks

**Goal**: Provide issue templates and a CONTRIBUTING addendum focused on early‑adopter feedback.

**Allowed Files**

```yaml
create:
  - .github/ISSUE_TEMPLATE/devex_bug.md
  - .github/ISSUE_TEMPLATE/devex_request.md
  - CONTRIBUTING-DEVEX.md
```

**Requirements**

1. Templates ask for repo link, failing command, logs/artifacts pointers.
2. CONTRIBUTING‑DEVEX explains how to share minimal repros and which logs to attach.

**Success Criteria**

- We receive structured, actionable feedback from early adopters.

**Deliverable**: `patches/DIFF_DEVEX_T8009_feedback-hooks.patch`

---

## Quality Bar

- Diffs compile and tests remain green (threads/forks lanes).
- Changes are minimal and scoped to allowed files; no kernel edits.
- Docs are copy‑pasteable; commands verified locally by the agent.
- Any added tests are deterministic and complete in < 30s total across lanes.

## Reporting Format

Follow the template in `agent_template/AMPCODE_TEMPLATE.md` and aggregate results to `ampcode.log`. Include links to:

- `reports/summary.jsonl`, `reports/*_raw.log` (if produced)
- New docs under `docs/devex/`

---

## Notes to DevEx Agent

- You own authoring the docs/examples/tests listed above. Do not modify kernel code.
- If you propose minor stubs to make examples clearer (e.g., a readme in examples/early-adopter), keep them trivial and isolated.
- If anything is ambiguous, document assumptions and continue; we’ll iterate.
