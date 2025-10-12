# Laminar — Structured Flow Testing

Laminar is a branded, structured testing system for flow‑based applications. It produces compact human summaries and deep JSONL artifacts that agents and humans can query precisely without blowing token budgets.

## Why Laminar
- Token‑cheap: short summaries, deep artifacts on disk
- Deterministic: seeded, no flaky sleeps, reproducible
- Composable: unit → component → integration → e2e
- Inspectable: JSONL events with a stable envelope schema
- Portable: reuse across projects; same reporter/CLI

## Event Envelope (JSONL)
Every event is a single JSON object per line with stable keys:

- `ts`: number (epoch ms)
- `lvl`: 'info' | 'warn' | 'error'
- `case`: string (test id)
- `phase`: 'arrange' | 'act' | 'assert' | 'teardown'
- `evt`: string (domain event, e.g., 'connect', 'worker.ready', 'assert.fail')
- `id`: string (event id)
- `corr`: string (correlation id)
- `path`: string (`file:line`)
- `payload`: object (domain‑specific)

## Artifacts & Layout
- `reports/summary.jsonl` — one line per test (status, duration, pointers)
- `reports/<suite>/<case>.jsonl` — event stream for the case
- `reports/<suite>/<case>.snap/` — optional golden snapshots (transcripts)

## CLI: logq
A tiny CLI to slice/filter JSONL by fields and windows.

Examples:
- `logq failures` — list only failures with pointers
- `logq case topology.rewire --around assert.fail --window 50` — ±50 events
- `logq grep evt=worker.ready` — list readiness events
- `logq path tests/worker/workerAdapters.spec.ts:61` — events from a code location

## Reporter
Vitest reporter prints compact console lines and writes `reports/summary.jsonl` mapping each test to artifact URIs and correlation IDs.

## Instrumentation (test mode)
Optional hooks emit events from:
- TopologyController (cmd received/applied/snapshot)
- Executor (worker lifecycle; edge wiring)
- Hostess (register/markInUse/markAvailable)
- ControlBus (publish/subscribe metadata)

These hooks are no‑ops in production code paths unless a logger is attached during tests.

## Debug Output

### Environment Variables
- `DEBUG=1` — enable all debug output to console
- `MK_DEBUG_MODULES=kernel,pipes` — enable specific modules only
- `MK_DEBUG_LEVEL=trace` — set level (error|warn|info|debug|trace, default: info)
- `LAMINAR_DEBUG=1` — write debug events as JSONL to `reports/` instead of console

### Console Mode (default)
```bash
DEBUG=1 node dist/examples/debug-demo.js
```
Prints timestamped debug events to stdout:
```
[2025-10-12T14:30:45.123Z] [DEBUG] [kernel] pipe.create: {"pipeId":"p-1"}
[2025-10-12T14:30:45.124Z] [DEBUG] [kernel] pipe.connect: {"fromId":"p-1","toId":"p-2"}
```

### Test Mode (JSONL artifacts)
```bash
LAMINAR_DEBUG=1 npm test
```
Writes debug events to `reports/<suite>/<case>.jsonl` alongside test events, using the same envelope schema.

## Test Types
- Unit: adapters and small modules
- Component: module + adapters (inproc/worker/process)
- Integration: topology wiring + Controller flows
- Property‑based (seeded)
- Golden transcripts (snapshots + masks)

## CI & Local

### Test Execution Split
CI runs tests in two separate jobs to handle PTY isolation requirements:

1. **`test:ci`** — All tests except PTY tests
   - Uses `--pool=threads` (tinypool worker threads)
   - Excludes: `ptyServerWrapper.spec.ts`, `multiModalOutput.spec.ts`
   - Parallel execution for speed

2. **`test:pty`** — PTY tests only
   - Uses `--pool=forks --poolOptions.forks.singleFork=true`
   - Includes: `ptyServerWrapper.spec.ts`, `multiModalOutput.spec.ts`
   - Single-threaded execution (one fork, no parallelism)

### Why PTY Tests Run Single-Threaded

**Problem**: PTY (pseudo-terminal) tests using `node-pty` have race conditions when run in parallel with tinypool worker threads:
- Signal handling interference (SIGWINCH, SIGHUP, SIGCHLD)
- File descriptor conflicts on `/dev/ptmx`
- Timing issues in terminal session cleanup

**Solution**: PTY tests run in a single fork to ensure complete isolation:
- No concurrent PTY sessions
- Clean signal handling per test
- Deterministic teardown order

### Adding New Tests

**For regular tests** (adapters, topology, workers):
- Add to `tests/` directory
- No special configuration needed
- Runs in `test:ci` by default

**For PTY tests**:
1. Add test file to `tests/wrappers/` or `tests/integration/`
2. Update `test:ci` exclude pattern: `--exclude='**/{ptyServerWrapper,multiModalOutput,yourNewPtyTest}.spec.ts'`
3. Update `test:pty` file list: add explicit path to your new test
4. Document why the test needs PTY isolation

**Local Development**:
- `npm test` — runs all tests (may have PTY race conditions)
- `npm run test:ci` — test the CI-safe subset
- `npm run test:pty` — test only PTY tests (slow, sequential)
- Repro: `node scripts/repro.ts` prints exact filters and `logq` slices

## Digest Rules: Smart Failure Summarization

### Concept & Benefits
Digest rules filter and aggregate test failures into compact, token-efficient summaries. Instead of dumping thousands of JSONL events, digests apply declarative rules to:

- **Reduce noise**: Include only events matching failure patterns (errors, assertions, correlations)
- **Preserve context**: Slice windows around critical events (±10 events near assert.fail)
- **Protect secrets**: Redact sensitive fields (credentials, tokens) from artifacts
- **Fit budgets**: Enforce KB/line limits for LLM prompts and human review

A digest is generated per failed test, written as `.digest.json` (structured) and `.digest.md` (human readable).

### Configuration: laminar.config.json
Place in repo root. Uses JSON Schema at docs/testing/laminar.schema.json.

```json
{
  "enabled": true,
  "budget": {
    "kb": 10,
    "lines": 200
  },
  "rules": [
    {
      "match": { "lvl": "error" },
      "actions": [{ "type": "include" }],
      "priority": 10
    },
    {
      "match": { "evt": "assert.fail" },
      "actions": [
        { "type": "include" },
        { "type": "slice", "window": 10 }
      ],
      "priority": 9
    }
  ]
}
```

**Fields**:
- `enabled` (bool): toggle digest generation globally
- `budget.kb`: max output size in kilobytes
- `budget.lines`: max event count
- `rules[]`: ordered match/action pairs (applied by priority)

### Rule Structure
Each rule has:
- `match`: pattern object (AND semantics; all must match)
- `actions`: array of transformations (applied in order)
- `priority`: higher = evaluated first (0–10)

**Match Patterns** (all optional; string or array):
- `evt`: event name(s), e.g., 'assert.fail', ['worker.ready', 'worker.exit']
- `lvl`: log level(s), e.g., 'error', ['error', 'warn']
- `phase`: test phase(s), e.g., 'assert', ['act', 'assert']
- `case`: test case pattern(s), e.g., 'topology.rewire'
- `path`: file path pattern(s), e.g., 'tests/worker/'

**Action Types**:
- `include`: add event to digest
- `slice`: include ±N events around match (requires `window`)
- `redact`: mask fields (requires `field` string or array)

### Common Rule Examples

**Capture all errors**:
```json
{ "match": { "lvl": "error" }, "actions": [{ "type": "include" }], "priority": 10 }
```

**Assertion failures with context**:
```json
{
  "match": { "evt": "assert.fail" },
  "actions": [
    { "type": "include" },
    { "type": "slice", "window": 10 }
  ],
  "priority": 9
}
```

**Worker lifecycle events**:
```json
{
  "match": { "evt": ["worker.ready", "worker.exit", "worker.error"] },
  "actions": [{ "type": "include" }],
  "priority": 7
}
```

**Redact secrets from topology events**:
```json
{
  "match": { "evt": "topology.snapshot" },
  "actions": [
    { "type": "include" },
    { "type": "redact", "field": ["apiKey", "token"] }
  ],
  "priority": 5
}
```

**Include specific test phases**:
```json
{
  "match": { "phase": ["assert", "teardown"] },
  "actions": [{ "type": "include" }],
  "priority": 6
}
```

### Suspect Scoring
For failed tests, digest identifies top 5 "suspect" events using heuristic scoring:

**Score Components**:
- **Level**: error +50, warn +20
- **Temporal proximity**: +30 → 0 (decays with distance from failure timestamp)
- **Correlation**: +40 if event shares `corr` ID with failure
- **Repetition**: +2 per similar event within 5s (max +20)

**Example suspects**:
```json
{
  "suspects": [
    {
      "ts": 1728756789123,
      "lvl": "error",
      "evt": "worker.exit",
      "score": 110,
      "reasons": ["error_level", "temporal_proximity", "corr_match"]
    }
  ]
}
```

Suspects appear at the top of `.digest.md` for quick human triage.

### CLI Usage

**Generate digests** for all failed tests:
```bash
lam digest
```

**Generate for specific cases**:
```bash
lam digest --cases kernel.spec/connect_moves_data_1_1,topology.spec/rewire_edges
```

**Show single test artifact** with optional slicing:
```bash
lam show --case kernel.spec/connect_moves_data_1_1
lam show --case topology.spec/rewire --around assert.fail --window 50
```

**Output**:
- `reports/<suite>/<case>.digest.json` — structured digest (for agents)
- `reports/<suite>/<case>.digest.md` — markdown digest (for humans)
- `reports/<suite>/<case>.jsonl` — full event stream (raw artifact)

**Typical workflow**:
1. `npm test` — runs tests, writes JSONL artifacts
2. `lam digest` — generates digests for failures
3. `lam show --case <id>` — inspect specific failure with context

### Integration with CI
Digests are token-efficient for LLM review:
- 10KB budget = ~2500 tokens (vs. 50KB+ raw JSONL)
- Suspects surface root cause without manual log diving
- Redaction prevents credential leaks in artifacts

Attach `.digest.md` to CI failure notifications; agents can request `.digest.json` for structured analysis.

## Cross-Language Test Ingest

### Concept
Laminar can import test results from external test frameworks (Go, Rust, Python, etc.) and convert them into Laminar's unified JSONL format. This enables:

- **Unified reporting**: View results from multiple languages in one place
- **Cross-language debugging**: Use `logq` and `lam show` on any ingested test
- **Digest generation**: Apply Laminar's smart failure summarization to external tests
- **Token-efficient CI reports**: Consolidate polyglot test results into compact summaries

Ingested tests integrate seamlessly with all Laminar features: `logq`, `lam digest`, `lam show`, and suspect scoring.

### Go Test Ingest

Go's `go test -json` output produces structured JSON events. Laminar converts these to the standard event envelope schema.

**Usage**:
```bash
# From file
lam ingest --go --from-file go-test-output.json

# From command (live)
lam ingest --go --cmd "go test -json ./..."
```

**Go Event Mapping**:
| Go Action | Laminar Event | Level | Phase |
|-----------|---------------|-------|-------|
| `run` | `test.start` | info | run |
| `output` | `test.output` | info | run |
| `pass` | `test.pass` | info | complete |
| `fail` | `test.fail` | error | complete |
| `skip` | `test.skip` | info | complete |

**Output**:
- `reports/<package>.<test>.jsonl` — event stream per test
- `reports/summary.jsonl` — summary with status, duration, location, artifact URI

### Complete Workflow Example

**1. Run Go tests and capture output**:
```bash
cd /path/to/go-project
go test -json ./... > go-test-output.json
```

**2. Ingest into Laminar**:
```bash
lam ingest --go --from-file go-test-output.json
```

Output:
```
Ingested 847 go test events
Generated 23 test case summaries
Wrote artifacts to reports/
```

**3. View summary**:
```bash
lam summary
```

Output:
```
PASS 120ms github.com/user/project/TestBasicAuth → reports/github.com.user.project.TestBasicAuth.jsonl
FAIL 89ms github.com/user/project/TestDatabaseConnect → reports/github.com.user.project.TestDatabaseConnect.jsonl
SKIP 0ms github.com/user/project/TestSlowIntegration → reports/github.com.user.project.TestSlowIntegration.jsonl
```

**4. Query failure logs**:
```bash
lam show --case github.com/user/project/TestDatabaseConnect
```

**5. Generate digest for failed tests**:
```bash
lam digest
```

Creates `reports/github.com.user.project.TestDatabaseConnect.digest.md` with suspects and context.

**6. Query specific events**:
```bash
# Find all test failures
logq lvl=error reports/summary.jsonl

# View output around failure
logq --around evt=test.fail --window 10 reports/github.com.user.project.TestDatabaseConnect.jsonl
```

### Integration with CI Pipelines

**GitHub Actions Example**:
```yaml
- name: Run Go tests
  run: go test -json ./... > go-test-output.json
  continue-on-error: true

- name: Ingest into Laminar
  run: lam ingest --go --from-file go-test-output.json

- name: Generate failure digests
  run: lam digest

- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: reports/
```

**Attach to PR comments**:
```bash
# Generate compact summary for LLM/human review
lam digest
cat reports/*.digest.md >> $GITHUB_STEP_SUMMARY
```

### Live Ingest (Direct Command)

Skip intermediate files by running Go tests directly:
```bash
lam ingest --go --cmd "go test -json ./..."
```

This captures stdout (up to 10MB) and processes it immediately. Use for:
- Local development workflows
- Quick CI pipelines without artifact storage
- Streaming test results into Laminar

### Future Language Support

Planned ingestion adapters:
- **Rust**: `cargo test -- --format json`
- **Python**: `pytest --json-report`
- **JavaScript/TypeScript**: `jest --json`

Each adapter will map native test events to Laminar's envelope schema, enabling unified reporting across polyglot projects.

## Branding Notes
Laminar fits the project’s physical‑manifold metaphor: smooth, predictable flow with clear gauges and valves for control.
