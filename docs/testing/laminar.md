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

### Directory Structure
```
reports/
├── index.json                          # Manifest of all test artifacts
├── summary.jsonl                       # One-line summaries (status, duration, URIs)
└── <suite>/                            # Per test-suite directories
    ├── <case>.jsonl                    # Event stream for each test case
    ├── <case>.digest.json              # Structured digest (on failure)
    ├── <case>.digest.md                # Human-readable digest (on failure)
    └── <case>.snap/                    # Optional golden snapshots
```

### Core Files

**`reports/index.json`** — Artifact manifest with cross-references:
- Generated on test completion
- Maps each test to its artifacts
- Provides timestamp, status, location metadata
- Enables discovery of all test outputs

**`reports/summary.jsonl`** — JSONL stream with one entry per test:
- Test status (pass/fail/skip)
- Duration in milliseconds
- Source location (file:line)
- Artifact URI pointer
- Error message (if failed)

**`reports/<suite>/<case>.jsonl`** — Per-case event stream:
- Test lifecycle events (begin → run → end)
- Error events with stack traces (on failure)
- Debug events (if `LAMINAR_DEBUG=1`)
- Uses standard event envelope schema

### index.json Structure

The index manifest provides a complete catalog of test artifacts:

```json
{
  "generated": "2025-10-12T17:37:43.104Z",
  "totalTests": 151,
  "artifacts": [
    {
      "testName": "connect moves data 1:1",
      "status": "pass",
      "duration": 6,
      "location": "/srv/repos0/mkolbol/tests/kernel.spec.ts:45",
      "timestamp": "2025-10-12T17:37:41.027Z",
      "artifacts": {
        "summary": "reports/summary.jsonl",
        "caseFile": "reports/kernel.spec/connect_moves_data_1_1.jsonl",
        "digestFile": "reports/kernel.spec/connect_moves_data_1_1.digest.json"
      }
    }
  ]
}
```

**Fields:**
- `generated`: ISO 8601 timestamp when index was created
- `totalTests`: Count of test cases (matches `artifacts.length`)
- `artifacts[]`: Array of test artifact entries

**Per-artifact entry:**
- `testName`: Human-readable test name
- `status`: 'pass' | 'fail' | 'skip'
- `duration`: Execution time in milliseconds
- `location`: Source file path with line number
- `timestamp`: ISO 8601 timestamp when test completed
- `artifacts.summary`: Path to summary.jsonl (always present)
- `artifacts.caseFile`: Path to per-case JSONL (always present)
- `artifacts.digestFile`: Path to digest (only if failed and digest generated)

### Per-Case JSONL Lifecycle

Every test case JSONL file contains a predictable event sequence:

**1. Test Begin (`case.begin`)**
```json
{
  "ts": 1760290661027,
  "lvl": "info",
  "case": "connect moves data 1:1",
  "phase": "setup",
  "evt": "case.begin"
}
```

**2. Test Execution (`test.run`)**
```json
{
  "ts": 1760290661028,
  "lvl": "info",
  "case": "connect moves data 1:1",
  "phase": "execution",
  "evt": "test.run"
}
```

**3. Error Events (if test failed)**
```json
{
  "ts": 1760290661029,
  "lvl": "error",
  "case": "topology rewire",
  "phase": "execution",
  "evt": "test.error",
  "payload": {
    "message": "Expected value to be 42, got 40",
    "stack": "Error: ...\n  at tests/topology.spec.ts:61:5"
  }
}
```

**4. Test End (`case.end`)**
```json
{
  "ts": 1760290661029,
  "lvl": "info",
  "case": "connect moves data 1:1",
  "phase": "teardown",
  "evt": "case.end",
  "payload": {
    "duration": 6,
    "status": "passed"
  }
}
```

**Note:** Failed tests have `"lvl": "error"` and `"status": "failed"` in the `case.end` event.

### Artifact Guarantees

Laminar guarantees the following invariants for all test runs:

**✓ Always Present:**
- `reports/index.json` — exists after any test run
- `reports/summary.jsonl` — exists after any test run
- `reports/<suite>/<case>.jsonl` — exists for every test case
- `case.begin` event — first event in every case JSONL
- `case.end` event — last event in every case JSONL

**✓ Chronological Ordering:**
- Timestamps (`ts`) are monotonically increasing within each case JSONL
- Events appear in execution order (setup → execution → teardown)

**✓ Cross-References:**
- `index.json` entries reference valid `caseFile` paths
- All `caseFile` paths exist on disk
- `summary.jsonl` `artifactURI` matches `index.json` `caseFile`

**✓ Failed Test Additions:**
- `test.error` events appear before `case.end` (if errors exist)
- `case.end` has `"lvl": "error"` for failed tests
- `case.end.payload.status` is 'failed' for failed tests

**⚠ Conditional:**
- `digestFile` — only present if test failed AND digests were generated
- Debug events — only present if `LAMINAR_DEBUG=1` was set

### Reading Artifacts (Examples)

**List all test results:**
```typescript
import * as fs from 'fs';

const index = JSON.parse(fs.readFileSync('reports/index.json', 'utf-8'));
index.artifacts.forEach(test => {
  console.log(`${test.status.toUpperCase()} ${test.duration}ms ${test.testName}`);
});
```

**Find failures:**
```typescript
const failures = index.artifacts.filter(t => t.status === 'fail');
failures.forEach(fail => {
  console.log(`FAIL: ${fail.testName} → ${fail.artifacts.caseFile}`);
});
```

**Read case events:**
```typescript
const caseEvents = fs.readFileSync('reports/kernel.spec/connect_moves_data_1_1.jsonl', 'utf-8')
  .trim()
  .split('\n')
  .map(line => JSON.parse(line));

const errors = caseEvents.filter(e => e.lvl === 'error');
console.log(`Found ${errors.length} error events`);
```

**Query with logq CLI:**
```bash
# Show all failures
logq lvl=error reports/summary.jsonl

# Show events around correlation ID
logq --around corr=abc123 --window 10 reports/kernel.spec/connect_moves_data_1_1.jsonl

# Find specific event types
logq evt=test.error reports/**/*.jsonl
```

## CLI: lam

The `lam` CLI provides comprehensive test management and analysis capabilities.

### Commands

#### Test Execution
- `lam run [--lane ci|pty|auto] [--filter <pattern>]` — run tests
- `lam summary` — list all test results from latest run

#### Failure Analysis
- `lam show --case <suite/case> [--around <pattern>] [--window <n>]` — inspect test artifacts
- `lam digest [--cases <case1,case2,...>]` — generate failure digests
- `lam trends [--since <timestamp>] [--until <timestamp>] [--top <n>]` — analyze failure history

#### Configuration
- `lam rules get` — show current digest rules
- `lam rules set --file <path> | --inline '<json>'` — update digest rules

#### Integration
- `lam ingest --go [--from-file <path> | --cmd "<command>"]` — ingest Go test results

### lam trends — Failure Trend Analysis

Analyzes `reports/history.jsonl` to identify recurring failures and track failure patterns over time.

**Usage:**
```bash
lam trends [--since <timestamp>] [--until <timestamp>] [--top <n>]
```

**Options:**
- `--since <timestamp>` — filter to failures after this date (ISO 8601 or parseable date string)
- `--until <timestamp>` — filter to failures before this date (default: now)
- `--top <n>` — show top N failure fingerprints (default: 10)

**Features:**
- **Fingerprint grouping**: Groups failures by fingerprint to identify recurring issues
- **Temporal tracking**: Shows first seen and last seen timestamps for each failure pattern
- **Failure statistics**: Displays total runs, failure count, and failure rate
- **Top offenders**: Ranks failures by occurrence count
- **Location tracking**: Shows all file locations where each failure occurred

**Example Output:**
```
=== Laminar Trends ===
Period: 1970-01-01T00:00:00.000Z → 2025-10-12T18:30:45.123Z
Total test runs: 342
Total failures: 28
Failure rate: 8.2%
Unique failure fingerprints: 5

=== Top 10 Offenders ===

#1 kernel.spec/connect_moves_data_1_1 (12 failures)
   Fingerprint: fp-abc123def456
   First seen:  2025-10-01T14:23:11.000Z
   Last seen:   2025-10-12T17:45:22.000Z
   Locations:   /srv/repos0/mkolbol/tests/kernel.spec.ts:45
   Error:       Expected value to be 42, got 40

#2 topology.spec/rewire_edges (8 failures)
   Fingerprint: fp-xyz789abc012
   First seen:  2025-10-05T09:12:33.000Z
   Last seen:   2025-10-12T16:20:15.000Z
   Locations:   /srv/repos0/mkolbol/tests/topology.spec.ts:128
   Error:       Assertion failed: edge count mismatch
```

**Examples:**
```bash
# Show all-time trends
lam trends

# Show top 20 failures
lam trends --top 20

# Show failures from the last week
lam trends --since 2025-10-05

# Show failures in a specific date range
lam trends --since 2025-10-01 --until 2025-10-10
```

**Requirements:**
- `reports/history.jsonl` must exist (generated by test runs with fingerprinting enabled)
- History entries must contain: `ts`, `fingerprint`, `caseName`, `status`
- Optional fields: `location`, `errorMessage`

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

## Determinism & Reproducibility

### Why Determinism Matters

Deterministic tests are critical for:
- **Reproducibility**: Same inputs → same outputs across machines and time
- **Debugging**: Failures can be replayed exactly as they occurred
- **Confidence**: Pass/fail is meaningful, not random noise
- **CI stability**: Prevents false positives that block deployments

Non-deterministic tests ("flakes") erode trust in test suites and waste engineering time triaging phantom failures.

### Fixed Seed for Randomness

All Laminar tests run with a fixed seed by default:

```bash
TEST_SEED=42  # Default seed injected by laminar-run.ts
```

This ensures:
- Property-based tests generate identical random values each run
- Timing-sensitive tests use consistent delays
- Random sampling produces stable results

**Usage:**
```bash
# Normal run (seed 42 injected automatically)
npm run laminar:run

# Override seed for exploration
TEST_SEED=99 npm run laminar:run
```

Property-based tests consume the seed via:
```typescript
import * as fc from 'fast-check';

const SEED = parseInt(process.env.TEST_SEED || '42', 10);

test('property test', () => {
  fc.assert(
    fc.property(fc.integer(), (n) => n + 1 > n),
    { seed: SEED }
  );
});
```

## Flake Detection & Stability Scoring

### Concept

Flake detection runs the entire test suite N times with the same seed to identify unstable tests. A test is **flaky** if it passes on some runs and fails on others under identical conditions.

**Stability score** = (passes / total runs) × 100%

- 100% = stable (always passes)
- 0% = always fails (not flaky, but broken)
- 1–99% = flaky (intermittent failure)

### Running Flake Detection

```bash
# Default: 5 runs per test
npm run laminar:run -- --flake-detect

# Custom rerun count
npm run laminar:run -- --flake 10

# Shorter flag
npm run laminar:run -- --flake 3
```

**Process:**
1. Runs all tests with seed 42
2. Cleans summary, reruns N-1 times (silent)
3. Aggregates pass/fail counts per test location
4. Calculates stability score for each test
5. Reports flaky tests, always-fail tests, stable tests
6. Saves detailed JSON to `reports/stability-report.json`
7. Exits with code 1 if flaky/failing tests found (CI integration)

### Example Output

```
=== FLAKE DETECTION MODE (5 runs per test) ===

Run 1/5 (seed: 42)...
[... test output ...]

Run 2/5 (seed: 42)...
[silent]

=== STABILITY REPORT ===

FLAKY TESTS:
  60% stable - tests/feature.spec.ts:45 (3/5 passed)
  80% stable - tests/timing.spec.ts:12 (4/5 passed)

ALWAYS FAIL:
  tests/broken.spec.ts:8 (0/5 passed)

SUMMARY: 142 stable, 2 flaky, 1 always fail

Detailed report saved to reports/stability-report.json
```

### Stability Report JSON

```json
{
  "seed": "42",
  "reruns": 5,
  "timestamp": "2025-10-12T14:23:45.678Z",
  "results": [
    {
      "location": "tests/feature.spec.ts:45",
      "runs": 5,
      "passes": 3,
      "fails": 2,
      "score": 60
    }
  ]
}
```

### Triage Workflow

1. **Identify flakes**: Run `npm run laminar:run -- --flake-detect`
2. **Inspect failures**: Check `reports/<suite>/<case>.jsonl` for failed runs
3. **Generate digest**: `lam digest` to get suspects and context
4. **Review code frames**: See source code around error (if enabled)
5. **Fix root cause**: Address timing assumptions, race conditions, etc.
6. **Re-verify stability**: Run flake detection again to confirm 100% score

**CI Integration:**
```yaml
- name: Flake Detection
  run: npm run laminar:run -- --flake 10
  # Fails if any test has < 100% stability
```

## Code Frames in Digest

### Concept

Code frames extract source code snippets around error locations from stack traces, making it easier to triage failures without manually opening files.

**Benefits:**
- **Context at a glance**: See the exact line that failed plus surrounding code
- **Source mapping**: Maps compiled JS back to TypeScript sources
- **Token-efficient**: Includes only relevant lines (±2 by default)
- **Digest integration**: Code frames appear in `.digest.json` and `.digest.md`

### Enabling Code Frames

Add `codeframe` action to digest rules in `laminar.config.json`:

```json
{
  "enabled": true,
  "rules": [
    {
      "match": { "lvl": "error" },
      "actions": [
        { "type": "include" },
        { "type": "codeframe", "contextLines": 2 }
      ],
      "priority": 10
    },
    {
      "match": { "evt": "assert.fail" },
      "actions": [
        { "type": "include" },
        { "type": "slice", "window": 10 },
        { "type": "codeframe", "contextLines": 3 }
      ],
      "priority": 9
    }
  ]
}
```

**Action parameters:**
- `type: 'codeframe'` — extract code frames from stack traces
- `contextLines` — lines before/after error (default: 2)

### Code Frame Structure

```typescript
interface CodeFrame {
  file: string;        // Source file path
  line: number;        // Error line number
  column?: number;     // Column position
  source: string[];    // Full snippet lines
  context: {
    before: string[];  // Lines before error
    focus: string;     // Error line
    after: string[];   // Lines after error
  };
}
```

### Example Digest with Code Frames

**`.digest.json`:**
```json
{
  "summary": { "total": 42, "included": 8 },
  "events": [ /* ... */ ],
  "codeframes": [
    {
      "file": "/srv/repos0/mkolbol/tests/topology.spec.ts",
      "line": 61,
      "column": 5,
      "context": {
        "before": [
          "  const result = controller.applyCommand(cmd);",
          "  "
        ],
        "focus": "  expect(result.nodes.length).toBe(42);",
        "after": [
          "  expect(result.edges.length).toBe(12);",
          "});"
        ]
      }
    }
  ]
}
```

**`.digest.md`:**
```markdown
## Code Frames

  at /srv/repos0/mkolbol/tests/topology.spec.ts:61:5
  59 |   const result = controller.applyCommand(cmd);
  60 |   
> 61 |   expect(result.nodes.length).toBe(42);
     |     ^
  62 |   expect(result.edges.length).toBe(12);
  63 | });
```

### Budget Behavior

Code frames count toward digest budget:
- Each frame adds ~200–500 bytes (depending on context lines)
- Limited to 5 frames per digest to prevent budget exhaustion
- If budget exceeded, code frames are truncated or omitted

**Budget tuning** (in `laminar.config.json`):
```json
{
  "budget": {
    "kb": 15,      // Increase if you want more code frames
    "lines": 300
  }
}
```

### Source Map Resolution

Code frame extractor automatically resolves TypeScript source maps:
1. Parses error stack trace
2. Checks for `.map` files next to compiled `.js`
3. Resolves original TypeScript line/column
4. Extracts code from `.ts` file (if available)
5. Falls back to compiled `.js` if sourcemap missing

**No configuration required** — works automatically for standard TypeScript builds.

### CLI Usage

```bash
# Generate digest with code frames (if configured)
lam digest

# View specific case digest
cat reports/kernel.spec/connect_moves_data_1_1.digest.md
```

Code frames appear in the **Code Frames** section of the markdown digest, after suspects and before events.

## Branding Notes
Laminar fits the project’s physical‑manifold metaphor: smooth, predictable flow with clear gauges and valves for control.

## MCP Server Integration

### Overview

Laminar provides a full-featured MCP (Model Context Protocol) server for AI agent integration. The server exposes test artifacts, logs, and digests through a standard protocol that AI agents and tools can consume.

**Key Features:**
- 12 MCP tools for test execution, querying, and analysis
- Resources for accessing summary and digest files
- Focus overlay system for ephemeral digest rule management
- Type-safe JSON schemas with validation
- Structured error handling with detailed context

### Server Setup

```typescript
import { createLaminarServer } from './src/mcp/laminar/server.js';

const server = await createLaminarServer({
  reportsDir: 'reports',              // Test artifact directory
  summaryFile: 'reports/summary.jsonl', // Summary JSONL file
  configFile: 'laminar.config.json'    // Digest rules config
});

await server.start();
// Laminar MCP Server started
// Reports directory: reports
// Summary file: reports/summary.jsonl
// Config file: laminar.config.json
// Available resources: 15
// Available tools: 12
```

### MCP Resources

Resources are read-only URIs that expose test artifacts:

#### `laminar://summary`
- **Type:** JSONL stream
- **Content:** One-line summaries for all test cases
- **Schema:** `{ status, duration, location, artifactURI, error?, testName? }`

```typescript
const summary = await server.readResource('laminar://summary');
// Returns raw JSONL content
```

#### `laminar://digest/{caseName}`
- **Type:** JSON object
- **Content:** Structured digest for a failed test case
- **Schema:** `DigestOutput` (see digest section)

```typescript
const digest = await server.readResource('laminar://digest/kernel.spec/connect_moves_data_1_1');
// Returns digest JSON
```

### MCP Tools Reference

#### 1. `run` - Execute Tests

Run tests with optional filters and flake detection.

**Input Schema:**
```json
{
  "suite": "string (optional)",
  "case": "string (optional)",
  "flakeDetect": "boolean (optional, default: false)",
  "flakeRuns": "number (optional, default: 5)"
}
```

**Output Schema:**
```json
{
  "exitCode": "number",
  "message": "string"
}
```

**Examples:**
```typescript
// Run all tests
await server.callTool('run', {});

// Run specific suite
await server.callTool('run', { suite: 'kernel.spec' });

// Run specific test
await server.callTool('run', { case: 'connect moves data 1:1' });

// Run with flake detection
await server.callTool('run', { 
  flakeDetect: true, 
  flakeRuns: 10 
});
```

#### 2. `rules.get` - Get Digest Rules

Retrieve current digest rules from `laminar.config.json`.

**Input Schema:**
```json
{}
```

**Output Schema:**
```json
{
  "config": "DigestConfig"
}
```

**Example:**
```typescript
const result = await server.callTool('rules.get', {});
console.log(result.config.rules);
// [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }]
```

#### 3. `rules.set` - Update Digest Rules

Persist digest rules to `laminar.config.json`.

**Input Schema:**
```json
{
  "config": "DigestConfig (required)"
}
```

**Output Schema:**
```json
{
  "success": "boolean",
  "message": "string"
}
```

**Example:**
```typescript
await server.callTool('rules.set', {
  config: {
    enabled: true,
    budget: { kb: 10, lines: 200 },
    rules: [
      { 
        match: { lvl: 'error' }, 
        actions: [{ type: 'include' }],
        priority: 10
      }
    ]
  }
});
```

#### 4. `digest.generate` - Generate Digests

Create digest files for failed test cases.

**Input Schema:**
```json
{
  "cases": "string[] (optional, all failures if omitted)"
}
```

**Output Schema:**
```json
{
  "count": "number",
  "message": "string"
}
```

**Examples:**
```typescript
// Generate for all failures
await server.callTool('digest.generate', {});
// { count: 5, message: "Generated 5 digest(s)" }

// Generate for specific cases
await server.callTool('digest.generate', { 
  cases: ['kernel.spec/connect_moves_data_1_1', 'topology.spec/rewire'] 
});
```

#### 5. `logs.case.get` - Get Case Logs

Retrieve raw JSONL logs for a test case.

**Input Schema:**
```json
{
  "caseName": "string (required)"
}
```

**Output Schema:**
```json
{
  "logs": "string (JSONL content)"
}
```

**Example:**
```typescript
const result = await server.callTool('logs.case.get', { 
  caseName: 'kernel.spec/connect_moves_data_1_1' 
});
console.log(result.logs);
// Raw JSONL: one event per line
```

#### 6. `query` / `query_logs` - Query Event Logs

Filter and query test events with multiple criteria.

**Input Schema:**
```json
{
  "caseName": "string (optional)",
  "level": "string (optional, 'error' | 'warn' | 'info' | 'debug')",
  "event": "string (optional, event type filter)",
  "limit": "number (optional, default: 100, max: 1000)"
}
```

**Output Schema:**
```json
{
  "events": "DigestEvent[]",
  "totalCount": "number"
}
```

**Examples:**
```typescript
// Query all error events
const errors = await server.callTool('query', {
  caseName: 'topology.spec/rewire',
  level: 'error'
});

// Query specific event type
const assertions = await server.callTool('query', {
  caseName: 'topology.spec/rewire',
  event: 'assert.fail',
  limit: 50
});

// Query with limit
const recent = await server.callTool('query', {
  caseName: 'topology.spec/rewire',
  limit: 10
});
```

**Validation:**
- `limit` must be between 1 and 1000
- Invalid parameters throw `McpError` with `INVALID_INPUT` code

#### 7. `repro` - Get Reproduction Commands

Generate commands to reproduce test failures.

**Input Schema:**
```json
{
  "caseName": "string (optional, all failures if omitted)"
}
```

**Output Schema:**
```json
{
  "commands": [
    {
      "testName": "string",
      "testFile": "string",
      "vitestCommand": "string",
      "logCommand": "string"
    }
  ]
}
```

**Example:**
```typescript
const result = await server.callTool('repro', { 
  caseName: 'topology.spec/rewire' 
});

console.log(result.commands[0]);
// {
//   testName: "topology rewire",
//   testFile: "tests/topology.spec.ts",
//   vitestCommand: 'vitest run --reporter=verbose --pool=threads "tests/topology.spec.ts" -t "topology rewire"',
//   logCommand: 'npm run logq -- reports/topology.spec/rewire.jsonl'
// }
```

#### 8. `get_digest` - Get Test Digest

Retrieve structured digest for a failed test.

**Input Schema:**
```json
{
  "caseName": "string (required)"
}
```

**Output Schema:**
```json
{
  "digest": "DigestOutput | null"
}
```

**Example:**
```typescript
const result = await server.callTool('get_digest', { 
  caseName: 'topology.spec/rewire' 
});

if (result.digest) {
  console.log(result.digest.summary);
  console.log(result.digest.suspects);
  console.log(result.digest.events);
}
```

#### 9. `list_failures` - List Failed Tests

Get all failed test cases from summary.

**Input Schema:**
```json
{}
```

**Output Schema:**
```json
{
  "failures": [
    {
      "status": "fail",
      "duration": "number",
      "location": "string",
      "artifactURI": "string",
      "error": "string (optional)",
      "testName": "string (optional)"
    }
  ]
}
```

**Example:**
```typescript
const result = await server.callTool('list_failures', {});
result.failures.forEach(f => {
  console.log(`FAIL: ${f.testName} (${f.duration}ms)`);
  console.log(`  Location: ${f.location}`);
  console.log(`  Logs: ${f.artifactURI}`);
  console.log(`  Error: ${f.error}`);
});
```

#### 10. `focus.overlay.set` - Set Focus Overlay

Set ephemeral digest rules that override persistent config (non-persistent, runtime only).

**Input Schema:**
```json
{
  "rules": "DigestRule[] (required)"
}
```

**Output Schema:**
```json
{
  "success": "boolean",
  "message": "string"
}
```

**Example:**
```typescript
await server.callTool('focus.overlay.set', {
  rules: [
    { 
      match: { lvl: 'error' }, 
      actions: [{ type: 'include' }],
      priority: 10
    },
    { 
      match: { evt: 'assert.fail' }, 
      actions: [
        { type: 'include' },
        { type: 'slice', window: 10 }
      ],
      priority: 9
    }
  ]
});
// { success: true, message: "Set 2 overlay rule(s)" }
```

**Use Cases:**
- Temporary focus on specific event types without modifying config
- Debugging sessions requiring different digest filters
- Agent-driven dynamic filtering based on failure patterns

#### 11. `focus.overlay.clear` - Clear Focus Overlay

Remove all ephemeral overlay rules.

**Input Schema:**
```json
{}
```

**Output Schema:**
```json
{
  "success": "boolean",
  "message": "string"
}
```

**Example:**
```typescript
await server.callTool('focus.overlay.clear', {});
// { success: true, message: "Cleared overlay rules" }
```

#### 12. `focus.overlay.get` - Get Focus Overlay

Retrieve current ephemeral overlay rules.

**Input Schema:**
```json
{}
```

**Output Schema:**
```json
{
  "rules": "DigestRule[]"
}
```

**Example:**
```typescript
const result = await server.callTool('focus.overlay.get', {});
console.log(result.rules);
// [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }]
```

### Error Handling

All MCP tools return structured errors on failure:

**Error Codes:**
- `INVALID_INPUT` - Invalid parameters (missing required fields, type mismatch, out of range)
- `RESOURCE_NOT_FOUND` - Resource URI not found
- `TOOL_NOT_FOUND` - Unknown tool name
- `IO_ERROR` - File system operation failed
- `PARSE_ERROR` - JSON parsing failed
- `INTERNAL_ERROR` - Unexpected internal error

**Error Format:**
```typescript
{
  error: {
    code: 'INVALID_INPUT',
    message: 'caseName is required and must be a string',
    details: { received: null }
  }
}
```

**Error Handling Example:**
```typescript
try {
  await server.callTool('get_digest', {});
} catch (error) {
  if (error instanceof McpError) {
    console.error(`Error [${error.code}]: ${error.message}`);
    console.error('Details:', error.details);
  }
}
// Error [INVALID_INPUT]: caseName is required and must be a string
// Details: { received: undefined }
```

### Agent Integration Workflows

#### Workflow 1: Automated Test Triage

AI agent analyzes test failures and generates reports.

```typescript
// 1. Run tests
const runResult = await server.callTool('run', {});

if (runResult.exitCode !== 0) {
  // 2. List all failures
  const failures = await server.callTool('list_failures', {});
  
  // 3. Generate digests for all failures
  await server.callTool('digest.generate', {});
  
  // 4. Analyze each failure
  for (const failure of failures.failures) {
    const caseName = failure.artifactURI
      .replace('reports/', '')
      .replace('.jsonl', '');
    
    // Get digest
    const digest = await server.callTool('get_digest', { caseName });
    
    // Get repro commands
    const repro = await server.callTool('repro', { caseName });
    
    // Agent analyzes digest.suspects and generates report
    console.log(`Analyzing: ${failure.testName}`);
    console.log(`Top suspect: ${digest.digest.suspects[0]}`);
    console.log(`Repro: ${repro.commands[0].vitestCommand}`);
  }
}
```

#### Workflow 2: Focus Overlay for Deep Debugging

Agent temporarily changes digest filters to focus on specific patterns.

```typescript
// 1. Set focus overlay for worker-related events
await server.callTool('focus.overlay.set', {
  rules: [
    { 
      match: { evt: /^worker\./ }, 
      actions: [{ type: 'include' }],
      priority: 10
    },
    { 
      match: { path: 'tests/worker/' }, 
      actions: [{ type: 'include' }],
      priority: 9
    }
  ]
});

// 2. Regenerate digests with overlay
await server.callTool('digest.generate', { 
  cases: ['worker.spec/lifecycle'] 
});

// 3. Analyze focused digest
const digest = await server.callTool('get_digest', { 
  caseName: 'worker.spec/lifecycle' 
});

// 4. Clear overlay
await server.callTool('focus.overlay.clear', {});
```

#### Workflow 3: Incremental Query and Analysis

Agent queries logs incrementally to avoid token limits.

```typescript
// 1. Query error events first
const errors = await server.callTool('query', {
  caseName: 'topology.spec/rewire',
  level: 'error',
  limit: 10
});

// 2. If error found, query context around correlation ID
const errorCorr = errors.events[0].corr;

// Use logq for correlation context
// (MCP doesn't expose correlation queries directly)

// 3. Query specific event types for deeper analysis
const workerEvents = await server.callTool('query', {
  caseName: 'topology.spec/rewire',
  event: 'worker.ready',
  limit: 20
});

// 4. Build timeline from incremental queries
const timeline = [...errors.events, ...workerEvents.events]
  .sort((a, b) => a.ts - b.ts);
```

#### Workflow 4: Persistent Rule Management

Agent updates digest rules based on failure patterns.

```typescript
// 1. Get current rules
const current = await server.callTool('rules.get', {});

// 2. Analyze failures to determine new patterns
const failures = await server.callTool('list_failures', {});

// Agent detects common pattern: worker.exit errors

// 3. Add new rule to config
const newConfig = {
  ...current.config,
  rules: [
    ...current.config.rules,
    {
      match: { evt: 'worker.exit', lvl: 'error' },
      actions: [
        { type: 'include' },
        { type: 'slice', window: 20 }
      ],
      priority: 8
    }
  ]
};

// 4. Persist updated rules
await server.callTool('rules.set', { config: newConfig });

// 5. Regenerate digests with new rules
await server.callTool('digest.generate', {});
```

### Tool Schemas (TypeScript Interfaces)

```typescript
// DigestRule - Used by rules.set, rules.get, focus.overlay.set
interface DigestRule {
  match: {
    evt?: string | string[];    // Event type pattern(s)
    lvl?: 'error' | 'warn' | 'info' | 'debug';
    phase?: 'arrange' | 'act' | 'assert' | 'teardown';
    case?: string | string[];   // Test case pattern(s)
    path?: string | string[];   // File path pattern(s)
  };
  actions: Array<
    | { type: 'include' }
    | { type: 'slice'; window: number }
    | { type: 'redact'; field: string | string[] }
    | { type: 'priority'; level: number }
    | { type: 'codeframe'; contextLines?: number }
  >;
  priority?: number;  // 0-10, higher = evaluated first
}

// DigestConfig - Used by rules.set, rules.get
interface DigestConfig {
  enabled?: boolean;
  budget?: {
    kb?: number;
    events?: number;
    cases?: number;
  };
  rules?: DigestRule[];
}

// DigestEvent - Used by query, query_logs output
interface DigestEvent {
  ts: number;         // Epoch ms
  lvl: 'info' | 'warn' | 'error' | 'debug';
  case: string;       // Test case name
  phase: 'arrange' | 'act' | 'assert' | 'teardown';
  evt: string;        // Event type
  id?: string;        // Event ID
  corr?: string;      // Correlation ID
  path?: string;      // Source location (file:line)
  payload?: unknown;  // Event-specific data
}

// DigestOutput - Used by get_digest output
interface DigestOutput {
  summary: {
    total: number;
    included: number;
    excluded?: number;
  };
  suspects?: Array<{
    ts: number;
    lvl: string;
    evt: string;
    score: number;
    reasons: string[];
  }>;
  events: DigestEvent[];
  codeframes?: Array<{
    file: string;
    line: number;
    column?: number;
    context: {
      before: string[];
      focus: string;
      after: string[];
    };
  }>;
}

// ReproCommand - Used by repro output
interface ReproCommand {
  testName: string;
  testFile: string;
  vitestCommand: string;
  logCommand: string;
}

// SummaryEntry - Used by list_failures output
interface SummaryEntry {
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  location: string;
  artifactURI: string;
  error?: string;
  testName?: string;
}
```

## Repro Bundles: Portable Failure Reproduction

Repro bundles package all information needed to reproduce a failed test into portable JSON and Markdown files. Each bundle contains failure context, environment details, and reproduction commands.

### What's Included in Bundles

Every repro bundle includes:

1. **Metadata**
   - Bundle version
   - Generation timestamp
   - Test name and file location
   - Test status (fail, skip)
   - Test duration in milliseconds

2. **Environment**
   - Test seed (if used)
   - Node.js version
   - Platform (OS + architecture)
   - Environment variables (if captured)

3. **Failure Details**
   - Error message
   - Error-level events (all events with `lvl: 'error'`)
   - Context events (±5 events around each error)

4. **Reproduction Commands**
   - Vitest command to re-run test
   - Logq command to view full logs
   - Digest file reference (if available)

### Bundle Structure

Bundles are written to `reports/bundles/` in two formats:

**JSON Bundle** (`<suite>/<case>.repro.json`):
```json
{
  "metadata": {
    "bundleVersion": "1.0.0",
    "generated": "2025-10-12T18:30:45.123Z",
    "testName": "connect moves data 1:1",
    "testFile": "tests/kernel.spec.ts",
    "status": "fail",
    "duration": 12,
    "timestamp": "2025-10-12T18:30:43.000Z"
  },
  "environment": {
    "seed": "test-seed-12345",
    "nodeVersion": "v20.10.0",
    "platform": "linux x64",
    "env": {
      "TEST_MODE": "ci",
      "LAMINAR_DEBUG": "1"
    }
  },
  "failure": {
    "errorMessage": "Expected value to be 42, got 40",
    "errorEvents": [
      {
        "ts": 1760290661029,
        "lvl": "error",
        "case": "connect moves data 1:1",
        "phase": "execution",
        "evt": "test.error",
        "payload": {
          "message": "Expected value to be 42, got 40",
          "stack": "Error: ...\n  at tests/kernel.spec.ts:45:5"
        }
      }
    ],
    "contextEvents": [
      // ±5 events around each error
    ]
  },
  "reproduction": {
    "vitestCommand": "vitest run --reporter=verbose --pool=threads \"tests/kernel.spec.ts\" -t \"connect moves data 1:1\"",
    "logCommand": "npm run logq -- reports/kernel.spec/connect_moves_data_1_1.jsonl",
    "digestFile": "reports/kernel.spec/connect_moves_data_1_1.digest.md"
  }
}
```

**Markdown Summary** (`<suite>/<case>.repro.md`):
```markdown
# Reproduction Bundle: connect moves data 1:1

**Generated:** 2025-10-12T18:30:45.123Z
**Status:** FAIL
**Duration:** 12ms
**Test File:** tests/kernel.spec.ts

## Environment

- **Seed:** test-seed-12345
- **Node:** v20.10.0
- **Platform:** linux x64

## Failure Summary

**Error:**
```
Expected value to be 42, got 40
```

**Error Events:** 1

- **test.error** (2025-10-12T18:30:43.029Z)
  - Expected value to be 42, got 40

## Reproduction Commands

**Run test:**
```bash
vitest run --reporter=verbose --pool=threads "tests/kernel.spec.ts" -t "connect moves data 1:1"
```

**View logs:**
```bash
npm run logq -- reports/kernel.spec/connect_moves_data_1_1.jsonl
```

**Digest file:**
`reports/kernel.spec/connect_moves_data_1_1.digest.md`

## Context Events

**Total context events:** 11

_See JSON bundle for full event details_
```

### Generating Repro Bundles

#### CLI: `lam repro --bundle`

Generate bundles for all failures:
```bash
lam repro --bundle
```

Generate bundle for specific failure:
```bash
lam repro --bundle --case kernel.spec/connect_moves_data_1_1
```

**Output:**
```
=== Generating Repro Bundles (2 failures) ===

✓ kernel.spec/connect_moves_data_1_1
  JSON: reports/bundles/kernel.spec/connect_moves_data_1_1.repro.json
  MD:   reports/bundles/kernel.spec/connect_moves_data_1_1.repro.md

✓ topology.spec/rewire_edges
  JSON: reports/bundles/topology.spec/rewire_edges.repro.json
  MD:   reports/bundles/topology.spec/rewire_edges.repro.md

✓ Generated 2 bundles in reports/bundles/
```

#### MCP Tool: `repro.bundle`

```typescript
// Generate all bundles
const result = await server.callTool('repro.bundle', {});

// Generate bundle for specific case
const result = await server.callTool('repro.bundle', {
  caseName: 'kernel.spec/connect_moves_data_1_1',
  format: 'json'  // or 'markdown'
});

// Output
{
  count: 1,
  message: "Generated 1 repro bundle(s)",
  bundles: [
    {
      caseName: "kernel.spec/connect_moves_data_1_1",
      jsonPath: "reports/bundles/kernel.spec/connect_moves_data_1_1.repro.json",
      mdPath: "reports/bundles/kernel.spec/connect_moves_data_1_1.repro.md"
    }
  ]
}
```

### Use Cases and Workflows

#### Workflow 1: CI Failure Triage

After a CI failure, generate bundles and send to developers:

```bash
# In CI pipeline
npm run test:ci || {
  # Generate bundles for all failures
  lam repro --bundle
  
  # Upload bundles to artifact storage
  # Bundles contain everything needed to reproduce locally
}
```

#### Workflow 2: Bug Report Automation

AI agent creates GitHub issue with bundle:

```typescript
// 1. Run tests
await server.callTool('run', {});

// 2. List failures
const failures = await server.callTool('list_failures', {});

// 3. Generate bundle for first failure
const bundle = await server.callTool('repro.bundle', {
  caseName: failures.failures[0].testName,
  format: 'markdown'
});

// 4. Create GitHub issue with bundle markdown
// Issue contains all context: error, environment, repro steps
```

#### Workflow 3: Local Debugging

Developer receives bundle and reproduces failure:

```bash
# 1. Receive bundle file: kernel.spec/connect_moves_data_1_1.repro.md

# 2. Read reproduction command from bundle
vitest run --reporter=verbose --pool=threads "tests/kernel.spec.ts" -t "connect moves data 1:1"

# 3. View full logs if needed
npm run logq -- reports/kernel.spec/connect_moves_data_1_1.jsonl

# 4. View digest if available
cat reports/kernel.spec/connect_moves_data_1_1.digest.md
```

#### Workflow 4: Regression Investigation

Compare bundles across test runs to identify changes:

```bash
# Generate bundle from current run
lam repro --bundle --case kernel.spec/connect_moves_data_1_1

# Compare with previous bundle (check git history)
git show HEAD~1:reports/bundles/kernel.spec/connect_moves_data_1_1.repro.json > old.json
diff old.json reports/bundles/kernel.spec/connect_moves_data_1_1.repro.json
```

## Digest Diffs: Tracking Failure Changes

Digest diffs compare two digest files to identify changes in test failures. This helps track regressions, verify fixes, and analyze failure evolution.

### What's Compared

The diff engine compares:

1. **Events**: Added and removed events
2. **Suspects**: Changed suspect scoring and reasons
3. **Codeframes**: Added and removed stack frames
4. **Metadata**: Duration, location, error message changes

### Diff Output Formats

#### JSON Format

```json
{
  "oldDigest": "kernel.spec/connect_moves_data_1_1",
  "newDigest": "kernel.spec/connect_moves_data_1_1",
  "summary": {
    "eventsAdded": 2,
    "eventsRemoved": 1,
    "eventsChanged": 3,
    "suspectsChanged": true,
    "codeframesChanged": false,
    "durationDelta": 5
  },
  "addedEvents": [
    {
      "ts": 1760290661030,
      "lvl": "error",
      "case": "connect moves data 1:1",
      "evt": "worker.exit",
      "phase": "execution"
    }
  ],
  "removedEvents": [
    {
      "ts": 1760290661025,
      "lvl": "warn",
      "case": "connect moves data 1:1",
      "evt": "worker.ready"
    }
  ],
  "changedSuspects": {
    "added": [
      {
        "ts": 1760290661030,
        "lvl": "error",
        "evt": "worker.exit",
        "score": 8.5,
        "reasons": ["error level", "worker lifecycle"]
      }
    ],
    "removed": [],
    "scoreChanged": [
      {
        "event": "assert.fail",
        "oldScore": 9.0,
        "newScore": 7.5
      }
    ]
  },
  "changedCodeframes": {
    "added": [],
    "removed": []
  },
  "metadataChanges": {
    "durationChanged": true,
    "oldDuration": 10,
    "newDuration": 15,
    "locationChanged": false,
    "oldLocation": "tests/kernel.spec.ts:45",
    "newLocation": "tests/kernel.spec.ts:45",
    "errorChanged": false,
    "oldError": "Expected value to be 42, got 40",
    "newError": "Expected value to be 42, got 40"
  }
}
```

#### Markdown Format

```markdown
# Digest Diff: kernel.spec/connect_moves_data_1_1 → kernel.spec/connect_moves_data_1_1

## Summary
- Events Added: 2
- Events Removed: 1
- Events Changed: 3
- Suspects Changed: Yes
- Codeframes Changed: No
- Duration Delta: +5ms

## Metadata Changes
- **Duration**: 10ms → 15ms

## Added Events
- `worker.exit` (error) at 2025-10-12T18:30:43.030Z

## Removed Events
- `worker.ready` (warn) at 2025-10-12T18:30:43.025Z

## Suspect Changes

### Added Suspects
- `worker.exit` (score: 8.5)
  - Reasons: error level, worker lifecycle

### Score Changes
- `assert.fail`: 9.0 → 7.5
```

### Generating Digest Diffs

#### CLI: `lam diff`

Compare two digest files:
```bash
lam diff reports/case1.digest.json reports/case2.digest.json
```

Output to file:
```bash
lam diff reports/case1.digest.json reports/case2.digest.json --output diff.json
```

Generate markdown diff:
```bash
lam diff reports/case1.digest.json reports/case2.digest.json --output diff.md --format markdown
```

**Output:**
```
Digest Diff: case1 → case2

Summary:
  Events Added: 2
  Events Removed: 1
  Suspects Changed: Yes
  Duration Delta: +5ms

Diff written to: diff.md
```

#### MCP Tool: `diff.get`

```typescript
// Compare two digests (JSON output)
const diff = await server.callTool('diff.get', {
  digest1Path: 'reports/kernel.spec/connect_moves_data_1_1.digest.json',
  digest2Path: 'reports/kernel.spec/connect_moves_data_1_1-v2.digest.json',
  outputFormat: 'json'
});

// Compare with markdown output
const diff = await server.callTool('diff.get', {
  digest1Path: 'reports/kernel.spec/test1.digest.json',
  digest2Path: 'reports/kernel.spec/test2.digest.json',
  outputFormat: 'markdown'
});

// Output includes both structured diff and formatted markdown
{
  diff: {
    summary: { eventsAdded: 2, eventsRemoved: 1, ... },
    addedEvents: [...],
    removedEvents: [...],
    changedSuspects: { added: [...], removed: [...], scoreChanged: [...] }
  },
  formatted: "# Digest Diff: ...\n\n## Summary\n..."
}
```

#### Programmatic API

```typescript
import { DigestDiffEngine, diffDigests } from './src/digest/diff.js';

// Simple comparison
const diff = diffDigests(
  'reports/case1.digest.json',
  'reports/case2.digest.json',
  'output/diff.json',  // optional output path
  'json'               // 'json' or 'markdown'
);

// Using engine directly
const engine = new DigestDiffEngine();

// Compare files
const diff = engine.compareFiles(
  'reports/case1.digest.json',
  'reports/case2.digest.json'
);

// Compare in-memory digests
const diff = engine.compareDigests(digest1, digest2);

// Format output
const jsonStr = engine.formatAsJson(diff, true);  // pretty print
const mdStr = engine.formatAsMarkdown(diff);

// Write to file
engine.writeDiff(diff, 'output.md', 'markdown');
```

### Use Cases and Workflows

#### Use Case 1: Regression Detection

Compare digests before and after code changes to detect regressions:

```bash
# Before changes
lam digest --cases kernel.spec/connect_moves_data_1_1
cp reports/kernel.spec/connect_moves_data_1_1.digest.json baseline.digest.json

# Make code changes

# After changes
lam digest --cases kernel.spec/connect_moves_data_1_1

# Compare
lam diff baseline.digest.json reports/kernel.spec/connect_moves_data_1_1.digest.json --format markdown

# Check for new errors or suspect changes
```

#### Use Case 2: Fix Verification

Verify that a fix reduces suspects or removes errors:

```bash
# Digest from broken test
lam digest --cases topology.spec/rewire
cp reports/topology.spec/rewire.digest.json broken.digest.json

# Apply fix

# Digest from fixed test
lam digest --cases topology.spec/rewire

# Compare to verify improvement
lam diff broken.digest.json reports/topology.spec/rewire.digest.json
# Expected: fewer suspects, removed error events, negative duration delta
```

#### Use Case 3: CI Regression Tracking

In CI pipeline, compare digests across commits:

```bash
# In CI script
npm run test:ci || true

# Generate digests for current failures
lam digest

# Download previous digests from artifact storage
# Compare each digest with previous version

for digest in reports/**/*.digest.json; do
  if [ -f "previous/$digest" ]; then
    lam diff "previous/$digest" "$digest" --output "diffs/$digest.diff.md" --format markdown
  fi
done

# Upload diffs to artifact storage
# Alert on significant changes (new suspects, more errors)
```

#### Use Case 4: AI Agent Failure Analysis

Agent analyzes failure evolution over time:

```typescript
// Agent workflow
async function analyzeFailureProgression(caseName: string) {
  // Get current digest
  const current = await server.callTool('get_digest', { caseName });
  
  // Get historical digest from git
  const previousPath = `history/${caseName}.digest.json`;
  
  // Compare
  const diff = await server.callTool('diff.get', {
    digest1Path: previousPath,
    digest2Path: `reports/${caseName}.digest.json`,
    outputFormat: 'markdown'
  });
  
  // Analyze changes
  if (diff.diff.summary.suspectsChanged) {
    console.log('Suspects changed - failure pattern evolving');
    
    if (diff.diff.changedSuspects.added.length > 0) {
      console.log('New suspects indicate regression or new failure mode');
    }
    
    if (diff.diff.changedSuspects.removed.length > 0) {
      console.log('Removed suspects indicate partial fix or symptom shift');
    }
  }
  
  if (diff.diff.summary.durationDelta > 100) {
    console.log('Significant performance regression detected');
  }
  
  return diff.formatted;
}
```

#### Use Case 5: Test Stability Monitoring

Track digest changes over multiple runs to identify flaky tests:

```typescript
// Run test 5 times, compare digests
const digests: DigestOutput[] = [];

for (let i = 0; i < 5; i++) {
  await server.callTool('run', { 
    case: 'kernel.spec/connect_moves_data_1_1' 
  });
  
  const digest = await server.callTool('get_digest', { 
    caseName: 'kernel.spec/connect_moves_data_1_1' 
  });
  
  digests.push(digest.digest);
}

// Compare all pairs
let hasVariation = false;
const engine = new DigestDiffEngine();

for (let i = 0; i < digests.length - 1; i++) {
  const diff = engine.compareDigests(digests[i], digests[i + 1]);
  
  if (diff.summary.eventsChanged > 0 || diff.summary.suspectsChanged) {
    hasVariation = true;
    console.log(`Variation detected between run ${i} and ${i + 1}`);
  }
}

if (hasVariation) {
  console.log('Test is FLAKY - digests vary across runs');
} else {
  console.log('Test is STABLE - consistent digests across runs');
}
```

### Integration Examples

#### CLI + MCP Combined Workflow

```bash
# Generate baseline digests (CLI)
lam run --lane ci
lam digest

# Agent analyzes failures and compares (MCP)
```

```typescript
// Agent script
const failures = await server.callTool('list_failures', {});

for (const failure of failures.failures) {
  // Generate repro bundle
  const bundle = await server.callTool('repro.bundle', {
    caseName: failure.testName
  });
  
  // Compare with historical digest if available
  const historicalPath = `history/${failure.testName}.digest.json`;
  
  if (fs.existsSync(historicalPath)) {
    const diff = await server.callTool('diff.get', {
      digest1Path: historicalPath,
      digest2Path: `reports/${failure.testName}.digest.json`,
      outputFormat: 'markdown'
    });
    
    // Create report combining bundle + diff
    const report = `
# Failure Report: ${failure.testName}

## Reproduction Bundle
${bundle.formatted}

## Change Analysis
${diff.formatted}

## Recommendation
${analyzeDiffForRecommendation(diff.diff)}
    `;
    
    console.log(report);
  }
}
```

#### Automated Regression Alerts

```typescript
// CI integration: alert on digest regressions
async function checkForRegressions() {
  const failures = await server.callTool('list_failures', {});
  const regressions: string[] = [];
  
  for (const failure of failures.failures) {
    const previousDigest = loadPreviousDigest(failure.testName);
    
    if (!previousDigest) continue;
    
    const diff = await server.callTool('diff.get', {
      digest1Path: previousDigest,
      digest2Path: `reports/${failure.testName}.digest.json`
    });
    
    // Check for regression indicators
    if (diff.diff.summary.eventsAdded > 0) {
      regressions.push(`${failure.testName}: ${diff.diff.summary.eventsAdded} new error events`);
    }
    
    if (diff.diff.changedSuspects?.added.length > 0) {
      regressions.push(`${failure.testName}: ${diff.diff.changedSuspects.added.length} new suspects`);
    }
    
    if (diff.diff.summary.durationDelta > 200) {
      regressions.push(`${failure.testName}: +${diff.diff.summary.durationDelta}ms performance regression`);
    }
  }
  
  if (regressions.length > 0) {
    sendAlert('Regressions detected', regressions.join('\n'));
  }
}
```

### Focus Overlay Deep Dive

The focus overlay system provides ephemeral digest rule management without modifying the persistent config file.

**Key Characteristics:**
- **Non-persistent:** Overlay rules exist only in memory, cleared on server restart
- **Override behavior:** Overlay rules are applied AFTER persistent rules
- **Independent:** Changing overlay doesn't affect `laminar.config.json`
- **Atomic operations:** Set/clear/get are immediate, no file I/O

**Use Cases:**
1. **Debugging sessions:** Focus on specific event patterns without config changes
2. **Agent-driven filtering:** AI agents dynamically adjust filters based on failure analysis
3. **Temporary experiments:** Try different digest rules without persisting changes
4. **Multi-tenant scenarios:** Different agents can use different overlays (if server instances isolated)

**Workflow Example:**
```typescript
// Agent analyzing a complex failure
async function debugComplexFailure(caseName: string) {
  // Save current overlay state
  const originalOverlay = await server.callTool('focus.overlay.get', {});
  
  try {
    // Phase 1: Focus on errors only
    await server.callTool('focus.overlay.set', {
      rules: [{ match: { lvl: 'error' }, actions: [{ type: 'include' }] }]
    });
    const errorDigest = await server.callTool('get_digest', { caseName });
    
    // Phase 2: Focus on worker events
    await server.callTool('focus.overlay.set', {
      rules: [{ match: { evt: /^worker\./ }, actions: [{ type: 'include' }] }]
    });
    const workerDigest = await server.callTool('get_digest', { caseName });
    
    // Phase 3: Combine insights
    const analysis = analyzeDigests(errorDigest, workerDigest);
    
    return analysis;
  } finally {
    // Restore original overlay
    if (originalOverlay.rules.length > 0) {
      await server.callTool('focus.overlay.set', { rules: originalOverlay.rules });
    } else {
      await server.callTool('focus.overlay.clear', {});
    }
  }
}
```

**Overlay vs Persistent Rules:**

| Feature | Persistent (`rules.set`) | Overlay (`focus.overlay.set`) |
|---------|-------------------------|-------------------------------|
| Storage | `laminar.config.json` | Memory only |
| Lifetime | Until file deleted/modified | Until server restart or cleared |
| Scope | All digest generation | All digest generation (overrides persistent) |
| Use case | Long-term project defaults | Temporary debugging/analysis |
| Modification | Requires file write | In-memory only |

### MCP Server Configuration

**Server Options:**
```typescript
interface McpServerConfig {
  reportsDir?: string;    // Default: 'reports'
  summaryFile?: string;   // Default: 'reports/summary.jsonl'
  configFile?: string;    // Default: 'laminar.config.json'
}
```

**Environment Integration:**
- Server reads `laminar.config.json` on startup
- Digest generator loads rules from config file
- Focus overlay is initialized empty on server start

**Best Practices:**
1. **Config file location:** Keep `laminar.config.json` in repo root for version control
2. **Reports directory:** Use gitignore for `reports/` to avoid committing artifacts
3. **Error handling:** Always wrap tool calls in try-catch for `McpError`
4. **Idempotency:** Tools are safe to retry on network failures
5. **Resource limits:** Use `limit` parameter in `query` to avoid large responses
