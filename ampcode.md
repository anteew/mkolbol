```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "TR-A", "parallel": true,  "tasks": ["T2901", "T2902"] },
    { "id": "TR-B", "parallel": false, "depends_on": ["TR-A"], "tasks": ["T2903"] }
  ],
  "tasks": [
    { "id": "T2901", "agent": "susan-1", "title": "Failure fingerprinting + history ledger (history.jsonl)", "allowedFiles": ["src/digest/fingerprint.ts", "scripts/laminar-run.ts", "scripts/lam.ts"], "verify": ["npm run build"], "deliverables": ["patches/DIFF_T2901_fingerprint-history.patch"] },
    { "id": "T2902", "agent": "susan-2", "title": "CLI: lam trends (top offenders, first/last seen)", "allowedFiles": ["scripts/lam.ts", "docs/testing/laminar.md"], "verify": ["npm run lam -- --help"], "deliverables": ["patches/DIFF_T2902_cli-trends.patch"] },
    { "id": "T2903", "agent": "susan-3", "title": "Tests: synthetic regression history + trend outputs", "allowedFiles": ["tests/laminar/trends.spec.ts", "tests/fixtures/**", "reports/**"], "verify": ["npm run test:ci || true"], "deliverables": ["patches/DIFF_T2903_tests-trends.patch"] }
  ]
}
```

# Ampcode — Subagent Sprint Plan (mkolbol Debug Instrumentation P1)

**Architect**: VEGA  
**Sprint/Batch**: SB-MK-DEBUG-P1 (Brand: Laminar)  
**Reporting**: Results go to `ampcode.log`

---

## Context & Scope

**Goal**: Add a lightweight, runtime‑configurable debug instrumentation layer to mkolbol that agents/humans can toggle without code edits, and integrate it with Laminar so debug events are captured automatically in JSONL when enabled. Keep overhead near‑zero when disabled.

---

## Execution Waves

```yaml
waves:
  - id: D-A
    parallel: true
    tasks: [T2201, T2202, T2203]

  - id: D-B
    parallel: true
    depends_on: [D-A]
    tasks: [T2204, T2205, T2206, T2207]

  - id: D-C
    parallel: true
    depends_on: [D-B]
    tasks: [T2208, T2209, T2210]
```

---

## Tasks

### TASK T2201 — Debug config + API (near‑zero overhead when disabled)

**Goal**: Create `src/debug/` with a tiny API to check toggles and emit structured debug events. Reads env (DEBUG, MK_DEBUG_MODULES, MK_DEBUG_LEVEL) once at startup.

**Allowed Files**:

```yaml
create:
  - src/debug/config.ts # parse env, freeze flags
  - src/debug/api.ts    # debug.on('module'), debug.emit(module, evt, payload)
modify:
  - README.md           # short section on enabling debug
```

**Requirements**:
1. Disabled path adds ~no work (guard clauses)
2. Tokens: map to Laminar TestEvent envelope when Laminar is present

**Verify**:
```bash
npm run build
```

**Deliverable**: `patches/DIFF_T2201_debug-api.patch`

---

### TASK T2202 — Debug helpers: function wrapper + simple decorator

**Goal**: Provide helpers to wrap functions/methods with entry/exit logging (args, duration) when enabled. Use TS decorator only if enabled in tsconfig (fallback wrapper otherwise).

**Allowed Files**:

```yaml
create:
  - src/debug/wrap.ts   # wrap(fn, name, module)
  - src/debug/decorators.ts # optional, behind compiler flag
```

**Requirements**:
1. Do not require project‑wide decorators; helpers must work without them
2. Redact large/secret args (lengths only) by default

**Verify**: `npm run build`

**Deliverable**: `patches/DIFF_T2202_debug-helpers.patch`

---

### TASK T2203 — Laminar bridge: auto‑attach when LAMINAR_DEBUG=1

**Goal**: If LAMINAR_DEBUG=1, bind debug.emit() to Laminar logger so debug events flow into JSONL without test code changes.

**Allowed Files**:

```yaml
modify:
  - src/logging/logger.ts
  - src/debug/api.ts
```

**Verify**: `npm run build`

**Deliverable**: `patches/DIFF_T2203_laminar-bridge.patch`

---

### TASK T2204 — Instrument core surfaces (Kernel/StateManager minimal)

**Goal**: Guarded debug emits for pipe create/connect/split/merge and state events.

**Allowed Files**:

```yaml
modify:
  - src/kernel/Kernel.ts
  - src/state/StateManager.ts
```

**Requirements**:
1. No behavior change when debug off
2. When on, emit evt=pipe.create|connect|split|merge with ids

**Verify**: `npm run test:ci`

**Deliverable**: `patches/DIFF_T2204_kernel-state-instrument.patch`

---

### TASK T2205 — Instrument Hostess (registrations/usage)

**Allowed Files**:

```yaml
modify:
  - src/hostess/Hostess.ts
```

**Verify**: `npm run test:ci`

**Deliverable**: `patches/DIFF_T2205_hostess-instrument.patch`

---

### TASK T2206 — Instrument Executor (start/stop/workers)

**Allowed Files**:

```yaml
modify:
  - src/executor/Executor.ts
```

**Verify**: `npm run test:ci`

**Deliverable**: `patches/DIFF_T2206_executor-instrument.patch`

---

### TASK T2207 — Instrument Wrappers (PTY + External)

**Allowed Files**:

```yaml
modify:
  - src/wrappers/PTYServerWrapper.ts
  - src/wrappers/ExternalServerWrapper.ts
```

**Verify**: `npm run test:pty`

**Deliverable**: `patches/DIFF_T2207_wrappers-instrument.patch`

---

### TASK T2208 — Examples: enable debug via env (docs + demo)

**Goal**: Add a short example showing debug on/off and where events appear in reports/.

**Allowed Files**:

```yaml
modify:
  - docs/testing/laminar.md
create:
  - src/examples/debug-demo.ts
```

**Verify**: `npm run build && node dist/examples/debug-demo.js`

**Deliverable**: `patches/DIFF_T2208_debug-demo-docs.patch`

---

### TASK T2209 — Tests: ensure off==silent, on==emits minimal events

**Allowed Files**:

```yaml
create:
  - tests/debug/debug-api.spec.ts
```

**Verify**: `npm run test:ci`

**Deliverable**: `patches/DIFF_T2209_debug-tests.patch`

---

### TASK T2210 — CI: add laminar:run to default pipeline

**Goal**: Ensure auto‑debug rerun is used in CI for fast triage.

**Allowed Files**:

```yaml
modify:
  - package.json
  - README.md (CI notes)
```

**Verify**: `npm run laminar:run || true`

**Deliverable**: `patches/DIFF_T2210_ci-laminar-run.patch`

**Constraints**:

- [ ] No kernel growth beyond existing primitives (create/connect/split/merge/register/lookup)
- [ ] Maintain current demos; add new demo for mixed inproc + worker
- [ ] Keep message envelope {kind,type,id,ts,correlationId,src,dst,payload} stable

**Prerequisites**:

- TypeScript build must pass; Vitest available for any added tests
- Node 20+

---

## Execution Waves

```yaml
waves:
  - id: W-A
    parallel: false
    tasks: [T1501, T1502]

  - id: W-B
    parallel: true
    depends_on: [W-A]
    tasks: [T1503, T1504]

  - id: W-C
    parallel: false
    depends_on: [W-B]
    tasks: [T1505]

  - id: W-D
    parallel: true
    depends_on: [W-C]
    tasks: [T1506, T1507]
```

---

## Tasks

### TASK T2001 — Event schema + test logger (JSONL)

**Goal**: Introduce a stable event schema and a tiny logger to emit JSONL to `reports/<suite>/<case>.jsonl` with helpers.

**Allowed Files**:

```yaml
modify:
  - README.md # short section on reports/ and event schema (optional)
create:
  - src/logging/TestEvent.ts # types for envelope and helpers
  - src/logging/logger.ts # JSONL writer with case/phase helpers
```

**Requirements**:

1. Define envelope keys: ts,lvl,case,phase,evt,id,corr,path,payload
2. Logger writes one JSON object per line; creates reports/ directories as needed
3. Expose helpers: beginCase, endCase, emit(evt,...)

**Success Criteria**:

- Build passes; simple smoke test writes JSONL to reports/demo/demo.case.jsonl

**Verification Commands**:

```bash
npm run build

```

**Deliverable**: `patches/DIFF_T2001_logging-schema.patch`

---

### TASK T2002 — Vitest reporter (compact + JSONL summary)

**Goal**: Add a custom vitest reporter that prints compact console lines and writes `reports/summary.jsonl` with per-test status and artifact pointers.

**Allowed Files**:

```yaml
modify:
  - vitest.config.ts # attach reporter
create:
  - src/test/reporter/jsonlReporter.ts # implements onTestResult/onFinished
```

**Requirements**:

1. Console output: one line per test (ok/fail) + duration
2. JSONL summary: status, duration, file:line, artifact URIs (reports/<suite>/<case>.jsonl)

**Success Criteria**:

- Running `npm test || true` generates summary.jsonl even on failure

**Verification Commands**:

```bash
npm run build
```

**Deliverable**: `patches/DIFF_T2002_vitest-reporter.patch`

---

### TASK T2003 — logq CLI (filter/slice JSONL)

**Goal**: Provide a tiny CLI to query JSONL logs with composable filters (field=value) and slice windows.

**Allowed Files**:

```yaml
create:
  - scripts/logq.ts # `node scripts/logq.ts failures`, `logq case id`, `logq around corr=...`
```

**Requirements**:

1. Filters: case=, evt=, path=, corr=; support regex; windows via --around and --window
2. Output: compact human lines plus raw JSONL option

**Success Criteria**:

- Build passes; `node scripts/logq.ts --help` shows usage

**Verification Commands**:

```bash
npm run build
```

**Deliverable**: `patches/DIFF_T2003_logq-cli.patch`

---

### TASK T2004A — Instrumentation: TopologyController events

**Goal**: Emit structured events from TopologyController (cmd received, applied, snapshot, errors) to logger hooks in test mode.

**Allowed Files**:

```yaml
modify:
  - src/controller/TopologyController.ts # add optional logger hook
```

**Requirements**:

1. No behavior change in production; only emit when logger hook provided
2. Events adhere to schema

**Success Criteria**:

- Build passes

**Verification Commands**:

```bash
npm run build
```

**Deliverable**: `patches/DIFF_T2004A_controller-instrument.patch`

---

### TASK T2004B — Instrumentation: Executor events

**Goal**: Emit worker lifecycle and wiring events (worker.ready, worker.exit, connect edges) under logger hook.

**Allowed Files**:

```yaml
modify:
  - src/executor/Executor.ts
```

**Requirements**:

1. No logic change; emit events behind optional logger
2. Include node ids and mapping to file:line when available

**Success Criteria**:

- Build passes

**Verification Commands**:

```bash
npm run build
node dist/examples/worker-demo.js
```

**Deliverable**: `patches/DIFF_T2004B_executor-instrument.patch`

---

### TASK T2004C — Instrumentation: Hostess events

**Goal**: Emit guest-book registration/heartbeat/markInUse events under logger hook.

**Allowed Files**:

```yaml
modify:
  - src/hostess/Hostess.ts
```

**Requirements**:

1. No logic change; emit when logger provided
2. Stable schema

**Success Criteria**:

- Build passes

**Verification Commands**:

```bash
npm run build
npm run dev:worker-demo
```

**Deliverable**: `patches/DIFF_T2004C_hostess-instrument.patch`

---

### TASK T2004D — Instrumentation: ControlBus (test mode)

**Goal**: Optionally emit publish/subscribe events for control frames when a logger is attached (tests only).

**Allowed Files**:

```yaml
modify:
  - src/control/ControlBus.ts
```

**Requirements**:

1. Keep default silent; enable via flag/hook only in tests
2. Attach topic name and minimal payload size stats

**Success Criteria**:

- Build passes

**Verification Commands**:

```bash
npm test
```

**Deliverable**: `patches/DIFF_T2004D_controlbus-instrument.patch`

---

### TASK T2005 — Golden transcript harness (snapshots + masks)

**Goal**: Provide snapshot compare utilities for complex streams (e.g., PTY transcripts) with redaction masks.

**Allowed Files**:

```yaml
create:
  - src/test/golden/harness.ts
  - tests/golden/sample.spec.ts
```

**Requirements**:

1. Write snapshots under `reports/<suite>/<case>.snap/`
2. Mask rules: replace volatile fields (timestamps, uuids)

**Success Criteria**:

- `npm test || true` creates a sample golden artifact and compares it

**Verification Commands**:

```bash
npm test || true
```

**Deliverable**: `patches/DIFF_T2005_golden-harness.patch`

---

### TASK T2006 — Property-based test harness (seeded)

**Goal**: Add a seeded property-based test harness for small invariants (no flakes), recording seeds in logs for repro.

**Allowed Files**:

```yaml
modify:
  - package.json # optional dev dep (fast-check) if used
create:
  - tests/property/invariants.spec.ts
```

**Requirements**:

1. Use fixed seed; log `seed` in summary.jsonl when property tests fail
2. Cover split/merge invariants on small graphs

**Success Criteria**:

- `npm test || true` runs invariants and logs seeds

**Verification Commands**:

```bash
npm test || true
```

**Deliverable**: `patches/DIFF_T2006_property-tests.patch`

---

### TASK T2007 — CI runner flags + Node matrix + scripts

**Goal**: Add npm scripts and vitest flags to run reliably on Node 20/24, avoiding tinypool issues.

**Allowed Files**:

```yaml
modify:
  - package.json
  - vitest.config.ts
```

**Requirements**:

1. Add `test:ci` script with `--pool=threads` or `--single-thread`
2. Document Node matrix in README or a CI note

**Success Criteria**:

- `npm run test:ci || true` runs and produces summary.jsonl

**Verification Commands**:

```bash
npm run test:ci || true
```

**Deliverable**: `patches/DIFF_T2007_ci-runner.patch`

---

### TASK T2008 — Repro script generator from summary.jsonl

**Goal**: Add a script that reads `reports/summary.jsonl` and prints an exact `logq` command and test filter for any failed case.

**Allowed Files**:

```yaml
create:
  - scripts/repro.ts
modify:
  - package.json
```

**Requirements**:

1. CLI prints repro commands per failure (vitest --filter plus logq slice)
2. Friendly messages when no failures

**Success Criteria**:

- `node scripts/repro.ts` prints useful commands after a failing run

**Verification Commands**:

```bash
node scripts/repro.ts || true
```

**Deliverable**: `patches/DIFF_T2008_repro-script.patch`

---

### TASK T2009 — Amp integration: reporting pointers to reports/

**Goal**: Ensure ampcode template and docs tell agents to include report pointers in ampcode.log for each task.

**Allowed Files**:

```yaml
modify:
  - agent_template/AMPCODE_TEMPLATE.md
  - README.md
  - VEGA/ampcode.md
```

**Requirements**:

1. Add a note in template Reporting Format to include `reports/summary.jsonl` and case files
2. Keep console output compact; rely on files for depth

**Success Criteria**:

- Build passes; docs updated

**Verification Commands**:

```bash
npm run build
```

**Deliverable**: `patches/DIFF_T2009_amp-integration-docs.patch`

---

## Quality Bar

**Non-negotiable**:

- [ ] Build passes; no unrelated changes
- [ ] Tests (if added) deterministic; avoid long sleeps
- [ ] Kernel untouched beyond adapter hooks
- [ ] Message envelope unchanged

**Conventions**:

- Unified diffs against current branch HEAD
- Keep changes minimal and focused per task
- Update docs only when explicitly listed

---

## Reporting Format

At completion, aggregate to `ampcode.log` using the template in agent_template/AMPCODE_TEMPLATE.md (TASK sections with PASS/FAIL, verification, deliverables).

---

## Master Agent Notes

- Execute waves in order; parallelize where `parallel: true`
- Stop dependent waves if a task FAILs; report immediately
- Place diff files under `patches/` at repo root

---

## Appendix

**Rollback Plan**: If any adapter task fails, revert only that adapter’s files; keep ControlBus (inproc) path intact to preserve existing demos.

**Reference Links**:

- VEGA/near-term-and-future-plan.md
- src/control/ControlBus.ts (baseline)
- src/state/StateManager.ts
- src/executor/Executor.ts
