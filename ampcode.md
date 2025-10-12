```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "W-A", "parallel": false, "tasks": ["T1501", "T1502"] },
    { "id": "W-B", "parallel": true, "depends_on": ["W-A"], "tasks": ["T1503", "T1504"] },
    { "id": "W-C", "parallel": false, "depends_on": ["W-B"], "tasks": ["T1505"] },
    { "id": "W-D", "parallel": true, "depends_on": ["W-C"], "tasks": ["T1506", "T1507"] }
  ],
  "tasks": [
    { "id": "T1501", "agent": "worker-1", "title": "Define ControlBusAdapter and extract InProc adapter", "allowedFiles": ["src/control/**"], "verify": ["npm run build", "npm run dev:control-bus"], "deliverables": ["patches/DIFF_T1501_controlbus-adapter.patch"] },
    { "id": "T1502", "agent": "worker-2", "title": "Define PipeAdapter and extract InProc pipe adapter", "allowedFiles": ["src/pipes/**", "src/kernel/**"], "verify": ["npm run build"], "deliverables": ["patches/DIFF_T1502_pipe-adapter.patch"] },
    { "id": "T1503", "agent": "worker-3", "title": "Implement WorkerControlBusAdapter (MessagePort)", "allowedFiles": ["src/control/adapters/**", "src/controller/**"], "verify": ["npm run build"], "deliverables": ["patches/DIFF_T1503_worker-controlbus-adapter.patch"] },
    { "id": "T1504", "agent": "worker-4", "title": "Implement WorkerPipeAdapter (MessagePort duplex)", "allowedFiles": ["src/pipes/adapters/**"], "verify": ["npm run build"], "deliverables": ["patches/DIFF_T1504_worker-pipe-adapter.patch"] },
    { "id": "T1505", "agent": "worker-5", "title": "Executor runMode 'worker' + harness + handshake", "allowedFiles": ["src/executor/**", "src/config/schema.ts", "src/examples/**"], "verify": ["npm run build", "node dist/examples/worker-demo.js"], "deliverables": ["patches/DIFF_T1505_executor-worker-mode.patch"] },
    { "id": "T1506", "agent": "worker-6", "title": "Mixed-mode demo (inproc + worker) and script", "allowedFiles": ["src/examples/**", "package.json"], "verify": ["npm run build", "npm run dev:worker-demo"], "deliverables": ["patches/DIFF_T1506_mixed-mode-demo.patch"] },
    { "id": "T1507", "agent": "worker-7", "title": "Basic tests for worker adapters + handshake", "allowedFiles": ["test/**", "tests/**", "vitest.config.ts"], "verify": ["npm test"], "deliverables": ["patches/DIFF_T1507_worker-tests.patch"] }
  ]
}
```

# Ampcode — Subagent Sprint Plan (Worker-Mode Phase 1)

**Architect**: VEGA  
**Sprint/Batch**: SB-CTRL-ISOLATION-P1  
**Reporting**: Results go to `ampcode.log`

---

## Context & Scope

**Goal**: Introduce worker-mode isolation with pluggable adapters for control (ControlBus) and data (pipes), keeping the kernel unchanged and the message envelope stable.

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

### TASK T1501 — Define ControlBusAdapter and extract InProc adapter

**Goal**: Introduce a ControlBusAdapter interface and move current in-process bus into an InProc adapter, preserving publish/subscribe API.

**Allowed Files**:

```yaml
modify:
  - src/control/ControlBus.ts # refactor to delegate to adapters
create:
  - src/control/BusAdapter.ts # interface
  - src/control/adapters/InProcBusAdapter.ts # PassThrough-based implementation
```

**Requirements**:

1. ControlBus exposes publish(topic, frame) and subscribe(topic, handler)
2. BusAdapter defines topic(name) and subscription mechanism; InProc adapter mirrors current behavior
3. No behavior change to existing demo (`npm run dev:control-bus`)

**Success Criteria**:

- Build passes; control-bus demo prints events/acks as before

**Verification Commands**:

```bash
npm run build
npm run dev:control-bus
```

**Deliverable**: `patches/DIFF_T1501_controlbus-adapter.patch`

---

### TASK T1502 — Define PipeAdapter and extract InProc pipe adapter

**Goal**: Provide a PipeAdapter abstraction for data pipes; extract PassThrough implementation as InProc pipe adapter.

**Allowed Files**:

```yaml
modify:
  - src/kernel/Kernel.ts # use adapter-created pipes internally if needed (minimal change)
create:
  - src/pipes/PipeAdapter.ts # interface with createReadable/createWritable or createDuplex
  - src/pipes/adapters/InProcPipe.ts # PassThrough-based duplex
```

**Requirements**:

1. PipeAdapter can create a Duplex with options (highWaterMark, objectMode)
2. Default adapter is InProc; kernel behavior unchanged

**Success Criteria**:

- Build passes; existing demos run unchanged

**Verification Commands**:

```bash
npm run build
```

**Deliverable**: `patches/DIFF_T1502_pipe-adapter.patch`

---

### TASK T1503 — Implement WorkerControlBusAdapter (MessagePort)

**Goal**: Implement a ControlBus adapter over MessagePort for worker isolates.

**Allowed Files**:

```yaml
create:
  - src/control/adapters/WorkerBusAdapter.ts # MessagePort-backed publish/subscribe
```

**Requirements**:

1. Serialize frames as structured clones over MessagePort
2. Support subscribe/unsubscribe; multiple topics per port

**Success Criteria**:

- Build passes; basic local harness sends/receives frames across a worker

**Verification Commands**:

```bash
npm run build
```

**Deliverable**: `patches/DIFF_T1503_worker-controlbus-adapter.patch`

---

### TASK T1504 — Implement WorkerPipeAdapter (MessagePort duplex)

**Goal**: Provide a Duplex-like pipe over MessagePort with backpressure emulation.

**Allowed Files**:

```yaml
create:
  - src/pipes/adapters/WorkerPipe.ts # wraps MessagePort into Duplex; basic backpressure
```

**Requirements**:

1. Support Buffer payloads; objectMode optional for control tests
2. Minimal backpressure (pause/resume semantics simulated)

**Success Criteria**:

- Build passes; simple echo across worker using WorkerPipe

**Verification Commands**:

```bash
npm run build
```

**Deliverable**: `patches/DIFF_T1504_worker-pipe-adapter.patch`

---

### TASK T1505 — Executor runMode 'worker' + harness + handshake

**Goal**: Extend Executor to start servers in worker mode with a minimal harness and control handshake.

**Allowed Files**:

```yaml
modify:
  - src/executor/Executor.ts # runMode 'worker'
  - src/config/schema.ts # runMode already present
create:
  - src/executor/workerHarness.ts # boots a module, wires adapters, sends control.hello
  - src/examples/worker-demo.ts # mixed-mode demo entry
```

**Requirements**:

1. Executor spawns Worker with workerData (ports/endpoints as needed)
2. Worker sends control.hello; Executor logs ready
3. Mixed-mode wiring: inproc source → worker transform → inproc sink

**Success Criteria**:

- `node dist/examples/worker-demo.js` prints events and acks; data flows end-to-end

**Verification Commands**:

```bash
npm run build
node dist/examples/worker-demo.js
```

**Deliverable**: `patches/DIFF_T1505_executor-worker-mode.patch`

---

### TASK T1506 — Mixed-mode demo (inproc + worker) and script

**Goal**: Add a demo showcasing inproc + worker servers under one wiring and add npm script.

**Allowed Files**:

```yaml
create:
  - src/examples/worker-demo.ts
modify:
  - package.json # add dev:worker-demo script
```

**Requirements**:

1. Demo must wire at least three nodes across inproc/worker boundary
2. Log key events to stdout for verification

**Success Criteria**:

- `npm run dev:worker-demo` runs and prints expected messages

**Verification Commands**:

```bash
npm run build
npm run dev:worker-demo
```

**Deliverable**: `patches/DIFF_T1506_mixed-mode-demo.patch`

---

### TASK T1507 — Basic tests for worker adapters + handshake

**Goal**: Cover adapter send/receive and handshake path with minimal tests.

**Allowed Files**:

```yaml
create:
  - tests/worker/workerAdapters.spec.ts
modify:
  - vitest.config.ts
```

**Requirements**:

1. Round-trip a control frame over WorkerBusAdapter
2. Round-trip a Buffer over WorkerPipe
3. Assert handshake event structure

**Success Criteria**:

- `npm test` passes locally

**Verification Commands**:

```bash
npm test
```

**Deliverable**: `patches/DIFF_T1507_worker-tests.patch`

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

