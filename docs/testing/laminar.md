# Laminar — Structured Flow Testing

Laminar is a branded, structured testing system for flow‑based applications. It produces compact human summaries and deep JSONL artifacts that agents and humans can query precisely without blowing token budgets.

## Quickstart (5 Minutes)

### Installation & First Run

```bash
# 1. Install locally in your project (recommended)
npm install mkolbol

# 2. Initialize Laminar config
npx lam init

# 3. Run your tests
npx lam run --lane auto

# 4. View test results
npx lam summary
```

**Alternative: Using npx without installation:**
```bash
# Run commands directly without installing
npx mkolbol lam init
npx mkolbol lam run --lane auto
npx mkolbol lam summary
```

**Global installation option:**
```bash
# Install globally for 'lam' command everywhere
npm install -g mkolbol

# Use without npx prefix
lam init
lam run --lane auto
lam summary
```

### Analyze Failures

```bash
# Generate digests for all failures
npx lam digest

# Show specific test details with context
npx lam show --case kernel.spec/connect_moves_data_1_1 --around assert.fail --window 10

# Get reproduction commands
npx lam repro
```

### Basic Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `npx lam init` | Create laminar.config.json with defaults | `npx lam init --template node-defaults` |
| `npx lam run` | Execute tests with structured logging | `npx lam run --lane ci --filter kernel` |
| `npx lam summary` | List all test results | `npx lam summary --hints` |
| `npx lam digest` | Generate failure analysis digests | `npx lam digest --cases kernel.spec/test1` |
| `npx lam show` | Inspect test artifacts and events | `npx lam show --case kernel.spec/test1` |
| `npx lam repro` | Get repro commands for failures | `npx lam repro --bundle` |

**Usage Notes:**
- **Local install**: Use `npx lam` prefix for all commands
- **Global install**: Use `lam` directly (no `npx` needed)
- **No install**: Use `npx mkolbol lam` prefix (downloads on-demand)

**Quick Tips:**
- All artifacts → `reports/` directory
- Quick failure scan → `reports/summary.jsonl`
- Per-case logs → `reports/<suite>/<case>.jsonl`
- Digests auto-generated on failure (see configuration below)

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

#### Project Setup
- `lam init [--template <t>] [--dry-run] [--force]` — scaffold laminar.config.json
  - `--template`: Choose template (node-defaults, go-defaults, minimal)
  - `--dry-run`: Preview config without writing files
  - `--force`: Overwrite existing config

#### Test Execution
- `lam run [--lane ci|pty|auto] [--filter <pattern>]` — run tests
- `lam summary [--hints]` — list all test results from latest run
  - `--hints`: Show triage hints inline with failures (OR with `LAMINAR_HINTS=1`)

#### Failure Analysis
- `lam show --case <suite/case> [--around <pattern>] [--window <n>]` — inspect test artifacts
- `lam digest [--cases <case1,case2,...>]` — generate failure digests
- `lam trends [--since <timestamp>] [--until <timestamp>] [--top <n>]` — analyze failure history

#### Configuration
- `lam rules get` — show current digest rules
- `lam rules set --file <path> | --inline '<json>'` — update digest rules

#### Integration
- `lam ingest --go [--from-file <path> | --cmd "<command>"]` — ingest Go test results
- `lam ingest --pytest [--from-file <path> | --cmd "<command>"]` — ingest pytest JSON results
- `lam ingest --junit <file>` — ingest JUnit XML test results

### lam init — Project Scaffolding

Initialize Laminar configuration in your project with sensible defaults:

```bash
# Quick start with node defaults
npx lam init

# Preview config without creating files
npx lam init --dry-run

# Use minimal template
npx lam init --template minimal

# Use Go defaults for Go projects
npx lam init --template go-defaults

# Overwrite existing config
npx lam init --force
```

**What it does:**
1. Creates `laminar.config.json` with chosen template
2. Adds `reports/` to `.gitignore` if not already present
3. Won't overwrite existing config without `--force` flag

**Available Templates:**
- `node-defaults` (default): Includes error capture, assert.fail with context, worker events, and codeframes
- `go-defaults`: Optimized for Go test.fail events with codeframes
- `minimal`: Basic error-only capture

**Template: node-defaults**
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
        { "type": "codeframe", "contextLines": 2 }
      ],
      "priority": 9
    },
    {
      "match": { "evt": ["worker.ready", "worker.exit", "worker.error"] },
      "actions": [{ "type": "include" }],
      "priority": 7
    }
  ]
}
```

### lam ingest — Cross-Language Test Integration

Converts test results from other frameworks into Laminar JSONL format.

#### Pytest Integration

Ingest pytest JSON reports (generated via `pytest-json-report` plugin):

##### Installation & Setup

```bash
# Install pytest-json-report plugin
pip install pytest-json-report

# Or add to requirements.txt
echo "pytest-json-report>=1.5.0" >> requirements-test.txt
pip install -r requirements-test.txt
```

##### Generate pytest JSON report

```bash
# Generate report file
pytest --json-report --json-report-file=report.json

# With test selection
pytest tests/unit/ --json-report --json-report-file=unit-tests.json

# To stdout (for piping)
pytest --json-report --json-report-file=/dev/stdout
```

##### Ingest into Laminar

```bash
# From file
lam ingest --pytest --from-file report.json

# From command (one-liner)
lam ingest --pytest --cmd "pytest --json-report --json-report-file=/dev/stdout"

# Alternative: Direct CLI
tsx scripts/ingest-pytest.ts --from-file pytest-report.json
```

##### Pytest → Laminar Event Mapping

The adapter converts pytest's JSON format into Laminar's structured JSONL events:

| Pytest Field | Laminar Event | Phase | Level | Notes |
|-------------|---------------|-------|-------|-------|
| `nodeid` | `case.begin` | setup | info | Test identifier with file path |
| `setup.outcome` | `test.setup.{outcome}` | setup | info/error | Setup phase result |
| `setup.crash` | `test.error` | setup | error | Setup error details + stack |
| `call` start | `test.run` | execution | info | Test execution begins |
| `call.stdout` | `test.output` | execution | info | Captured stdout during test |
| `call.stderr` | `test.stderr` | execution | warn | Captured stderr during test |
| `call.outcome` | `test.call.{outcome}` | execution | info/error | Test call phase result |
| `call.crash` | `test.error` | execution | error | Test failure details + stack |
| `teardown.outcome` | `test.teardown.{outcome}` | teardown | info/error | Teardown phase result |
| Test completion | `case.end` | teardown | info/error | Final status + total duration |

##### Outcome Mapping

Pytest outcomes are normalized to Laminar status values:

| Pytest Outcome | Laminar Status | Description |
|----------------|----------------|-------------|
| `passed` | `pass` | Test passed successfully |
| `failed` | `fail` | Assertion or test failure |
| `error` | `error` | Setup/teardown error or exception |
| `skipped` | `skip` | Test skipped via decorator or condition |
| `xfailed` | `skip` | Expected failure (marked with `@pytest.mark.xfail`) |
| `xpassed` | `skip` | Unexpected pass (xfail that passed) |

##### Extracted Data

The adapter extracts and preserves rich metadata:

**Test Metadata:**
- `nodeid` — Test identifier (e.g., `test_example.py::TestClass::test_method`)
- `lineno` — Line number where test is defined
- `keywords` — Pytest markers and tags (e.g., `["smoke", "unit"]`)

**Duration (converted from seconds to milliseconds):**
- `setup.duration` — Setup phase time
- `call.duration` — Test execution time
- `teardown.duration` — Teardown phase time
- Total duration — Sum of all phases

**Error Information:**
- `crash.message` — Primary error message
- `longrepr` — Full error representation (fallback)
- `traceback[]` — Array of stack frames with file paths and line numbers
- Stack trace formatting preserves Python file locations

**Output Streams:**
- `stdout` — Captured standard output
- `stderr` — Captured standard error
- Both streams are trimmed and attached to events

##### Generated Event Lifecycle

Every pytest test produces a predictable sequence of Laminar events:

**1. Test Begin**
```json
{
  "ts": 1678886400500,
  "lvl": "info",
  "case": "test_example.py::test_success",
  "phase": "setup",
  "evt": "case.begin",
  "payload": {
    "nodeid": "test_example.py::test_success",
    "lineno": 5,
    "keywords": ["test_success", "unit"]
  }
}
```

**2. Setup Phase**
```json
{
  "ts": 1678886400501,
  "lvl": "info",
  "case": "test_example.py::test_success",
  "phase": "setup",
  "evt": "test.setup.passed",
  "payload": {
    "duration": 2,
    "stdout": null,
    "stderr": null
  }
}
```

**3. Test Run**
```json
{
  "ts": 1678886400503,
  "lvl": "info",
  "case": "test_example.py::test_success",
  "phase": "execution",
  "evt": "test.run"
}
```

**4. Test Output (if captured)**
```json
{
  "ts": 1678886400504,
  "lvl": "info",
  "case": "test_example.py::test_success",
  "phase": "execution",
  "evt": "test.output",
  "payload": {
    "output": "Debug: Processing item 42"
  }
}
```

**5. Test Call Result**
```json
{
  "ts": 1678886400505,
  "lvl": "info",
  "case": "test_example.py::test_success",
  "phase": "execution",
  "evt": "test.call.passed",
  "payload": {
    "duration": 15
  }
}
```

**6. Test Error (if failed)**
```json
{
  "ts": 1678886400520,
  "lvl": "error",
  "case": "test_example.py::test_failure",
  "phase": "execution",
  "evt": "test.error",
  "payload": {
    "message": "AssertionError: Expected 42 but got 40",
    "stack": "  at test_example.py:15\n    assert result == 42",
    "crash": {
      "path": "test_example.py",
      "lineno": 15,
      "message": "AssertionError: Expected 42 but got 40"
    }
  }
}
```

**7. Teardown Phase**
```json
{
  "ts": 1678886400521,
  "lvl": "info",
  "case": "test_example.py::test_success",
  "phase": "teardown",
  "evt": "test.teardown.passed",
  "payload": {
    "duration": 1,
    "stdout": null,
    "stderr": null
  }
}
```

**8. Test End**
```json
{
  "ts": 1678886400522,
  "lvl": "info",
  "case": "test_example.py::test_success",
  "phase": "teardown",
  "evt": "case.end",
  "payload": {
    "duration": 18,
    "status": "passed"
  }
}
```

##### Complete Workflow Examples

**Example 1: Basic Ingestion**
```bash
# Run pytest with JSON report
pytest --json-report --json-report-file=pytest-report.json

# Ingest into Laminar
lam ingest --pytest --from-file pytest-report.json

# View summary
lam summary

# Analyze failures
lam digest
```

**Example 2: Continuous Integration (GitHub Actions)**
```yaml
name: Python Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements-test.txt
          pip install pytest-json-report
      
      - name: Run pytest with JSON report
        run: |
          pytest --json-report --json-report-file=pytest-report.json
        continue-on-error: true
      
      - name: Install Laminar tools
        run: |
          npm install -g laminar
      
      - name: Ingest pytest results
        run: |
          lam ingest --pytest --from-file pytest-report.json
      
      - name: Generate failure digests
        run: |
          lam digest
      
      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            reports/
            pytest-report.json
```

**Example 3: Multi-Environment Testing**
```bash
#!/bin/bash
# test-all-envs.sh - Run tests across Python versions

for version in 3.9 3.10 3.11; do
  echo "Testing with Python $version"
  
  # Run pytest with JSON output
  docker run --rm -v $(pwd):/app python:$version \
    bash -c "cd /app && pip install -r requirements-test.txt && \
             pytest --json-report --json-report-file=pytest-py${version}.json"
  
  # Ingest each version's results
  lam ingest --pytest --from-file pytest-py${version}.json
done

# Analyze aggregated results
lam summary
lam trends --top 10
```

**Example 4: Subset Testing**
```bash
# Test only unit tests
pytest tests/unit/ --json-report --json-report-file=unit-report.json
lam ingest --pytest --from-file unit-report.json

# Test only integration tests
pytest tests/integration/ --json-report --json-report-file=integration-report.json
lam ingest --pytest --from-file integration-report.json

# Compare failure rates
lam summary
```

**Example 5: Pipe Mode (No Intermediate File)**
```bash
# One-liner: run pytest and ingest directly
pytest --json-report --json-report-file=/dev/stdout | \
  lam ingest --pytest --cmd "cat"

# With test selection
pytest -k "test_critical" --json-report --json-report-file=/dev/stdout | \
  lam ingest --pytest --cmd "cat"
```

##### CI Integration Patterns

**Pattern 1: Fail-Fast with Digests**
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: pytest --json-report --json-report-file=pytest-report.json
  
- name: Ingest and analyze failures
  if: failure()
  run: |
    lam ingest --pytest --from-file pytest-report.json
    lam digest
    lam repro --bundle
    
- name: Comment on PR with failures
  if: failure()
  run: |
    # Upload digest markdown to PR comments
    gh pr comment ${{ github.event.pull_request.number }} \
      --body-file reports/*/digest.md
```

**Pattern 2: Historical Trend Tracking**
```bash
# In CI script - track failure trends over time
lam ingest --pytest --from-file pytest-report.json

# Append to history (for trend analysis)
cat reports/summary.jsonl >> reports/history.jsonl

# Analyze trends
lam trends --since $(date -d "7 days ago" +%Y-%m-%d) --top 20

# Alert on new failure patterns
NEW_FAILURES=$(lam trends --since $(date -d "1 day ago" +%Y-%m-%d) --top 5)
if [ -n "$NEW_FAILURES" ]; then
  send_alert "New test failures detected: $NEW_FAILURES"
fi
```

**Pattern 3: Parallel Test Execution**
```yaml
# Split tests and run in parallel, then aggregate
strategy:
  matrix:
    shard: [1, 2, 3, 4]
    
steps:
  - name: Run pytest shard
    run: |
      pytest --json-report --json-report-file=shard-${{ matrix.shard }}.json \
             --shard-id=${{ matrix.shard }} --num-shards=4
  
  - name: Upload shard results
    uses: actions/upload-artifact@v3
    with:
      name: pytest-shard-${{ matrix.shard }}
      path: shard-${{ matrix.shard }}.json

# Aggregate job (runs after all shards complete)
aggregate:
  needs: test
  runs-on: ubuntu-latest
  steps:
    - name: Download all shards
      uses: actions/download-artifact@v3
    
    - name: Ingest all results
      run: |
        for shard in pytest-shard-*/shard-*.json; do
          lam ingest --pytest --from-file $shard
        done
    
    - name: Generate combined digest
      run: lam digest
```

**Pattern 4: Quality Gate Enforcement**
```bash
#!/bin/bash
# quality-gate.sh - Enforce test quality standards

# Run tests and ingest
pytest --json-report --json-report-file=pytest-report.json
lam ingest --pytest --from-file pytest-report.json

# Parse summary for metrics
TOTAL=$(jq -s 'length' reports/summary.jsonl)
FAILURES=$(jq -s '[.[] | select(.status == "fail")] | length' reports/summary.jsonl)
FAILURE_RATE=$(echo "scale=2; $FAILURES / $TOTAL * 100" | bc)

# Quality gates
if (( $(echo "$FAILURE_RATE > 5.0" | bc -l) )); then
  echo "❌ Failure rate ${FAILURE_RATE}% exceeds 5% threshold"
  exit 1
fi

# Check for new flaky tests
if lam trends --since $(date -d "1 day ago" +%Y-%m-%d) | grep -q "flaky"; then
  echo "⚠️  New flaky tests detected"
  exit 1
fi

echo "✅ Quality gates passed"
```

##### Troubleshooting

**Issue: Missing traceback information**
- Pytest's JSON report may not include full tracebacks by default
- Use `pytest --tb=long` to capture detailed traces
- Combine with `--json-report-verbosity=2` for maximum detail

**Issue: Large report files**
- Pytest JSON can be large for test suites with many tests
- Consider splitting by test directory or using sharding
- Archive old reports after ingestion

**Issue: Timestamp alignment**
- Pytest JSON uses Unix epoch seconds (float)
- Laminar converts to milliseconds (integer)
- Minor drift (<1ms) is expected and safe

**Issue: Skipped tests not appearing in Laminar**
- Skipped tests ARE ingested with `status: skip`
- Use `lam summary | grep skip` to verify
- Check pytest's `--json-report-omit` setting isn't excluding skips

#### Go Integration

Ingest Go test JSON output (generated via `go test -json`):

##### Installation & Setup

Go has built-in support for JSON test output (no additional dependencies required):

```bash
# Verify Go is installed
go version

# Generate JSON test output
go test -json ./...
```

##### Generate Go Test JSON

```bash
# Run all tests with JSON output
go test -json ./... > go-test.json

# Run specific package
go test -json ./pkg/mypackage > go-test.json

# With verbose output
go test -json -v ./...

# With coverage
go test -json -cover ./... > go-test.json
```

##### Ingest into Laminar

```bash
# From file
lam ingest --go --from-file go-test.json

# From command (one-liner)
lam ingest --go --cmd "go test -json ./..."

# Alternative: Direct script
tsx scripts/ingest-go.ts --from-file go-test.json
```

##### Go → Laminar Event Mapping

The adapter converts Go's JSON test events into Laminar's structured JSONL events:

| Go Action | Laminar Event | Phase | Level | Notes |
|-----------|---------------|-------|-------|-------|
| `run` (test start) | `case.begin` | setup | info | Test identifier from Package + Test |
| `output` | `test.output` | execution | info | Captured stdout/stderr during test |
| `pass` | `case.end` | teardown | info | Test passed successfully |
| `fail` | `test.error` + `case.end` | execution/teardown | error | Test failure with output |
| `skip` | `test.skip` + `case.end` | execution/teardown | info | Test skipped with reason |
| `bench` | `test.benchmark` | execution | info | Benchmark result (if applicable) |

##### Status Mapping

Go test outcomes are normalized to Laminar status values:

| Go Outcome | Laminar Status | Description |
|------------|----------------|-------------|
| `pass` | `pass` | Test passed successfully |
| `fail` | `fail` | Test failed assertion or panic |
| `skip` | `skip` | Test skipped via `t.Skip()` |

##### Extracted Data

The adapter extracts and preserves test metadata:

**Test Metadata:**
- `Package` — Go package name (e.g., `github.com/user/project/pkg`)
- `Test` — Test function name (e.g., `TestBasicAuth`)
- Combined as case ID: `<package>.<test>`

**Duration:**
- `Elapsed` — Test execution time in seconds (converted to milliseconds)

**Output:**
- All `output` events are captured with their content
- Both stdout and stderr are preserved
- Test failure messages extracted from output

**Location:**
- Package path used as location reference
- Line numbers not directly available in Go JSON format

##### Generated Event Lifecycle

Every Go test produces a predictable sequence of Laminar events:

**1. Test Begin**
```json
{
  "ts": 1678886400000,
  "lvl": "info",
  "case": "github.com/user/project.TestExample",
  "phase": "setup",
  "evt": "case.begin",
  "payload": {
    "package": "github.com/user/project",
    "test": "TestExample"
  }
}
```

**2. Test Output (captured during execution)**
```json
{
  "ts": 1678886400050,
  "lvl": "info",
  "case": "github.com/user/project.TestExample",
  "phase": "execution",
  "evt": "test.output",
  "payload": {
    "output": "=== RUN   TestExample\n"
  }
}
```

**3. Test Error (if failed)**
```json
{
  "ts": 1678886400100,
  "lvl": "error",
  "case": "github.com/user/project.TestExample",
  "phase": "execution",
  "evt": "test.error",
  "payload": {
    "message": "Expected 5, got 3",
    "output": "    example_test.go:42: Expected 5, got 3\n"
  }
}
```

**4. Test Skip (if skipped)**
```json
{
  "ts": 1678886400120,
  "lvl": "info",
  "case": "github.com/user/project.TestSkipped",
  "phase": "execution",
  "evt": "test.skip",
  "payload": {
    "message": "Skipping slow test"
  }
}
```

**5. Test End**
```json
{
  "ts": 1678886400150,
  "lvl": "info",
  "case": "github.com/user/project.TestExample",
  "phase": "teardown",
  "evt": "case.end",
  "payload": {
    "duration": 150,
    "status": "passed"
  }
}
```

##### Output Structure

Ingested Go tests follow the standard Laminar artifact layout:

```
reports/
├── summary.jsonl                                    # One-line summaries (all tests)
└── <package-name>/                                  # Per-package directories
    ├── <test-name>.jsonl                           # Event stream for each test
    └── ...
```

**Example `summary.jsonl` entry:**
```json
{
  "status": "pass",
  "duration": 150,
  "location": "github.com/user/project",
  "artifactURI": "reports/github.com.user.project/TestExample.jsonl",
  "testName": "github.com/user/project.TestExample"
}
```

##### Complete Workflow Examples

**Example 1: Basic Go Project**
```bash
# Run Go tests with JSON output
go test -json ./... > go-test.json

# Ingest into Laminar
lam ingest --go --from-file go-test.json

# View summary
lam summary

# Generate digests for failures
lam digest
```

**Example 2: Specific Package Testing**
```bash
# Test a specific package
go test -json ./internal/auth > auth-tests.json

# Ingest
lam ingest --go --from-file auth-tests.json

# View failures only
lam summary | grep fail
```

**Example 3: With Coverage**
```bash
# Run tests with coverage
go test -json -cover ./... > go-test-coverage.json

# Ingest
lam ingest --go --from-file go-test-coverage.json

# Analyze results
lam trends --top 5
```

**Example 4: CI Integration (GitHub Actions)**
```yaml
name: Go Tests with Laminar

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Run Go tests
        run: go test -json ./... > go-test.json
        continue-on-error: true
      
      - name: Install Laminar
        run: npm install -g mkolbol
      
      - name: Ingest Go test results
        run: lam ingest --go --from-file go-test.json
      
      - name: Generate failure digests
        if: failure()
        run: lam digest
      
      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: reports/
```

**Example 5: Live Ingest (No Intermediate File)**
```bash
# Direct ingest from command
lam ingest --go --cmd "go test -json ./..."

# With specific tags
lam ingest --go --cmd "go test -json -tags=integration ./..."

# With timeout
lam ingest --go --cmd "go test -json -timeout 30s ./..."
```

**Example 6: Multi-Module Go Project**
```bash
#!/bin/bash
# test-all-modules.sh - Test multiple Go modules

MODULES=("module1" "module2" "module3")

for module in "${MODULES[@]}"; do
  echo "Testing $module..."
  cd "$module"
  go test -json ./... > "../go-test-$module.json"
  cd ..
  
  # Ingest each module
  lam ingest --go --from-file "go-test-$module.json"
done

# Generate consolidated digest
lam digest

# Summary
lam summary
```

##### CI Integration Patterns

**Pattern 1: Fail-Fast with Analysis**
```bash
# Run tests (don't fail immediately)
go test -json ./... > go-test.json || true

# Ingest results
lam ingest --go --from-file go-test.json

# Generate digests
lam digest

# Check for failures
if grep -q '"status":"fail"' reports/summary.jsonl; then
  echo "Tests failed - see reports/"
  exit 1
fi
```

**Pattern 2: Parallel Package Testing**
```bash
# Get all packages
PACKAGES=$(go list ./...)

# Test each package in parallel
for pkg in $PACKAGES; do
  (
    echo "Testing $pkg..."
    go test -json "$pkg" > "go-test-$(basename $pkg).json"
    lam ingest --go --from-file "go-test-$(basename $pkg).json"
  ) &
done

# Wait for all to complete
wait

# Generate combined analysis
lam summary
lam trends
```

**Pattern 3: Historical Comparison**
```bash
# Run tests
go test -json ./... > go-test.json
lam ingest --go --from-file go-test.json

# Compare with baseline
CURRENT_FAILS=$(jq -s '[.[] | select(.status == "fail")] | length' reports/summary.jsonl)
BASELINE_FAILS=$(cat baseline-failures.txt)

if [ "$CURRENT_FAILS" -gt "$BASELINE_FAILS" ]; then
  echo "⚠️  New failures detected: $CURRENT_FAILS (baseline: $BASELINE_FAILS)"
  exit 1
fi
```

##### Troubleshooting

**Issue: Missing test output**
- Go's `-json` flag captures output differently than regular mode
- Use `go test -json -v` for verbose output
- Some output may be buffered; ensure tests flush output

**Issue: Incomplete JSON**
- If `go test` crashes, JSON may be malformed
- Check the last line of the JSON file is complete
- Use `jq empty < go-test.json` to validate JSON structure

**Issue: Test names not unique**
- Go allows same test name in different packages
- Laminar uses `<package>.<test>` to ensure uniqueness
- Subtests use the full name including parent (e.g., `TestMain/subtest`)

**Issue: Timing discrepancies**
- Go reports elapsed time in seconds (float)
- Laminar converts to milliseconds (integer)
- Minor precision loss (<1ms) is expected

**Issue: Benchmark results**
- `go test -bench` output is partially supported
- Benchmark iterations are captured as output events
- Use `-json` with `-bench` to capture benchmark data

**Issue: Package-level failures**
- If package fails to compile, no test events are emitted
- Check for build errors before the first test event
- Use `go build ./...` to verify compilation separately

See `scripts/ingest-go.ts` for implementation details.

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

## Cross-Language Test Ingestion

Laminar supports ingesting test results from multiple languages and frameworks through standardized adapters.

#### JUnit XML Integration

Convert JUnit XML output (used by Maven, Gradle, Jest, pytest, and many other tools) to Laminar JSONL format.

##### Supported Sources

JUnit XML is a widely-adopted test result format supported by many frameworks:

| Platform | Tool | Command |
|----------|------|---------|
| **Java** | Maven Surefire | `mvn test` (auto-generates in `target/surefire-reports/`) |
| **Java** | Gradle Test | `./gradlew test --tests '*'` (results in `build/test-results/`) |
| **JavaScript/TypeScript** | Jest | `jest --reporters=jest-junit` |
| **Python** | pytest | `pytest --junit-xml=junit-report.xml` |
| **C#** | NUnit | `nunit3-console --result=junit-results.xml` |
| **C#** | xUnit | `dotnet test --logger "junit;LogFilePath=junit.xml"` |
| **Ruby** | RSpec | `rspec --format RspecJunitFormatter --out junit.xml` |
| **Go** | go-junit-report | `go test -v 2>&1 | go-junit-report > junit.xml` |

##### Installation & Setup

**For Java (Maven):**
```xml
<!-- pom.xml - Surefire plugin (default in most projects) -->
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.0.0</version>
</plugin>
```

**For JavaScript/TypeScript (Jest):**
```bash
# Install jest-junit reporter
npm install --save-dev jest-junit

# Or add to package.json
npm install -D jest-junit
```

```json
// jest.config.js or package.json
{
  "reporters": [
    "default",
    ["jest-junit", {
      "outputDirectory": "./test-results",
      "outputName": "junit.xml"
    }]
  ]
}
```

**For Python (pytest):**
```bash
# pytest has built-in JUnit XML support
pytest --junit-xml=junit-report.xml

# With custom output directory
pytest --junit-xml=test-results/junit.xml
```

##### Generate JUnit XML Reports

```bash
# Maven
mvn test
# Output: target/surefire-reports/TEST-*.xml

# Gradle
./gradlew test
# Output: build/test-results/test/TEST-*.xml

# Jest
jest --reporters=jest-junit
# Output: junit.xml (or configured path)

# pytest
pytest --junit-xml=junit-report.xml
# Output: junit-report.xml

# From stdin (pipe)
your-test-command | tee junit-output.xml
```

##### Ingest into Laminar

```bash
# From file
lam ingest --junit junit-report.xml

# Direct script invocation
tsx scripts/ingest-junit.ts junit-report.xml

# From stdin (pipe)
cat junit-output.xml | tsx scripts/ingest-junit.ts -

# Maven example (auto-find results)
lam ingest --junit target/surefire-reports/TEST-*.xml

# Jest example
jest --reporters=jest-junit
lam ingest --junit junit.xml
```

##### JUnit → Laminar Event Mapping

The adapter converts JUnit XML elements into Laminar's structured JSONL events:

| JUnit Element | Laminar Event | Phase | Level | Notes |
|--------------|---------------|-------|-------|-------|
| `<testcase>` start | `case.begin` | setup | info | Test identifier from suite + name |
| `<testcase>` exec | `test.run` | execution | info | Test execution begins |
| `<failure>` | `test.error` | execution | error | Assertion failure with stack trace |
| `<error>` | `test.error` | execution | error | Exception/error with stack trace |
| `<skipped>` | `test.skip` | execution | info | Test skipped with optional reason |
| `<testcase>` end | `case.end` | teardown | info/error | Final status + duration |

##### Attribute Mapping

JUnit attributes are extracted and mapped to Laminar fields:

| JUnit Attribute | Laminar Field | Transformation |
|----------------|---------------|----------------|
| `name` | Test name (part of case ID) | `suite/name` format |
| `classname` | `location` field | Fully qualified class/file name |
| `time` | `duration` (in payload) | Seconds → milliseconds (× 1000) |
| `failure@message` | `payload.message` | Error message text |
| `failure@type` | `payload.type` | Error/exception type |
| `failure` content | `payload.stack` | Full stack trace |
| `skipped@message` | `payload.message` | Skip reason |

##### Status Mapping

JUnit test outcomes are normalized to Laminar status values:

| JUnit State | Laminar Status | Condition |
|------------|----------------|-----------|
| Pass | `pass` | No `<failure>`, `<error>`, or `<skipped>` child |
| Fail | `fail` | Has `<failure>` child element |
| Fail | `fail` | Has `<error>` child element |
| Skip | `skip` | Has `<skipped>` child element |

##### Generated Event Lifecycle

Every JUnit test case produces a predictable sequence of Laminar events:

**1. Test Begin**
```json
{
  "ts": 1678886400000,
  "lvl": "info",
  "case": "math-tests/addition works",
  "phase": "setup",
  "evt": "case.begin",
  "payload": {
    "suite": "math-tests",
    "classname": "com.example.MathTest",
    "testName": "addition works"
  }
}
```

**2. Test Run**
```json
{
  "ts": 1678886400001,
  "lvl": "info",
  "case": "math-tests/addition works",
  "phase": "execution",
  "evt": "test.run"
}
```

**3. Test Error (if failed)**
```json
{
  "ts": 1678886400010,
  "lvl": "error",
  "case": "math-tests/division fails",
  "phase": "execution",
  "evt": "test.error",
  "payload": {
    "message": "Expected 2 but got 3",
    "type": "AssertionError",
    "stack": "AssertionError: Expected 2 but got 3\n    at tests/math.spec.js:45:5\n    at Object.<anonymous> (tests/math.spec.js:44:3)"
  }
}
```

**4. Test Skip (if skipped)**
```json
{
  "ts": 1678886400015,
  "lvl": "info",
  "case": "math-tests/experimental feature",
  "phase": "execution",
  "evt": "test.skip",
  "payload": {
    "message": "Feature not yet implemented"
  }
}
```

**5. Test End**
```json
{
  "ts": 1678886400020,
  "lvl": "info",
  "case": "math-tests/addition works",
  "phase": "teardown",
  "evt": "case.end",
  "payload": {
    "duration": 5,
    "status": "passed"
  }
}
```

##### Output Structure

```
reports/
├── summary.jsonl                     # One-line summaries (all tests)
└── <suite-name>/                     # Per-suite directories
    ├── <test-name>.jsonl            # Event stream for each test
    ├── <test-name>.jsonl
    └── ...
```

**Example `summary.jsonl` entry:**
```json
{
  "status": "pass",
  "duration": 5,
  "location": "com.example.MathTest",
  "artifactURI": "reports/math-tests/addition_works.jsonl",
  "testName": "math-tests/addition works"
}
```

##### Complete Workflow Examples

**Example 1: Maven Project**
```bash
# Run Maven tests
mvn clean test

# Find generated JUnit XML files
find target/surefire-reports -name "TEST-*.xml"

# Ingest into Laminar
for report in target/surefire-reports/TEST-*.xml; do
  lam ingest --junit "$report"
done

# Analyze results
lam summary
lam digest
```

**Example 2: Jest Testing**
```bash
# Configure Jest for JUnit output (jest.config.js)
cat > jest.config.js << 'EOF'
module.exports = {
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: 'false'
    }]
  ]
};
EOF

# Run Jest tests
npm test

# Ingest into Laminar
lam ingest --junit test-results/junit.xml

# View failures
lam summary | grep fail
```

**Example 3: pytest with JUnit XML**
```bash
# Run pytest with JUnit output
pytest --junit-xml=junit-report.xml --tb=short

# Ingest into Laminar
lam ingest --junit junit-report.xml

# Generate digests for failures
lam digest

# Get repro commands
lam repro
```

**Example 4: Continuous Integration (GitLab CI)**
```yaml
# .gitlab-ci.yml
test:
  stage: test
  script:
    - mvn clean test
  after_script:
    - npm install -g laminar
    - |
      for report in target/surefire-reports/TEST-*.xml; do
        lam ingest --junit "$report"
      done
    - lam digest
    - lam summary
  artifacts:
    when: always
    paths:
      - target/surefire-reports/
      - reports/
    reports:
      junit: target/surefire-reports/TEST-*.xml
```

**Example 5: GitHub Actions (Multi-Platform)**
```yaml
name: Cross-Platform Tests

on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        java: ['11', '17']
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK ${{ matrix.java }}
        uses: actions/setup-java@v3
        with:
          java-version: ${{ matrix.java }}
          distribution: 'temurin'
      
      - name: Run tests
        run: mvn test
        continue-on-error: true
      
      - name: Install Laminar
        run: npm install -g laminar
      
      - name: Ingest JUnit results
        run: |
          find target/surefire-reports -name "TEST-*.xml" -exec \
            lam ingest --junit {} \;
      
      - name: Generate failure digests
        if: failure()
        run: lam digest
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.os }}-java${{ matrix.java }}
          path: |
            target/surefire-reports/
            reports/
```

**Example 6: Gradle Project**
```bash
# Run Gradle tests
./gradlew test

# Ingest all JUnit XML results
find build/test-results/test -name "TEST-*.xml" | while read report; do
  lam ingest --junit "$report"
done

# Analyze trends
lam trends --top 10
```

**Example 7: Aggregating Multi-Module Results**
```bash
#!/bin/bash
# aggregate-tests.sh - Collect and ingest from multiple modules

# Run tests for all modules
mvn clean test -pl module1,module2,module3

# Ingest all JUnit reports
find . -path "*/target/surefire-reports/TEST-*.xml" | while read xml; do
  echo "Ingesting: $xml"
  lam ingest --junit "$xml"
done

# Generate consolidated digest
lam digest

# Check failure rate
TOTAL=$(jq -s 'length' reports/summary.jsonl)
FAILURES=$(jq -s '[.[] | select(.status == "fail")] | length' reports/summary.jsonl)
echo "Results: $FAILURES failures out of $TOTAL tests"
```

##### CI Integration Patterns

**Pattern 1: Fail-Fast with Immediate Analysis**
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: mvn test
  continue-on-error: true

- name: Ingest and analyze
  run: |
    for xml in target/surefire-reports/TEST-*.xml; do
      lam ingest --junit "$xml"
    done
    lam digest
    
- name: Fail if tests failed
  run: |
    if grep -q '"status":"fail"' reports/summary.jsonl; then
      echo "::error::Tests failed - see reports/"
      exit 1
    fi
```

**Pattern 2: Historical Comparison**
```bash
# CI script: compare current run with baseline
lam ingest --junit target/surefire-reports/TEST-*.xml

# Download baseline from previous successful run
aws s3 cp s3://ci-artifacts/baseline/summary.jsonl baseline-summary.jsonl

# Compare failure counts
CURRENT_FAILS=$(jq -s '[.[] | select(.status == "fail")] | length' reports/summary.jsonl)
BASELINE_FAILS=$(jq -s '[.[] | select(.status == "fail")] | length' baseline-summary.jsonl)

if [ "$CURRENT_FAILS" -gt "$BASELINE_FAILS" ]; then
  echo "⚠️  New failures detected: $CURRENT_FAILS (baseline: $BASELINE_FAILS)"
  exit 1
fi
```

**Pattern 3: Test Stability Monitoring**
```bash
#!/bin/bash
# stability-check.sh - Run tests multiple times and check for flakes

RUNS=5
for i in $(seq 1 $RUNS); do
  echo "=== Run $i of $RUNS ==="
  mvn test -DfailIfNoTests=false
  
  # Ingest with run identifier
  for xml in target/surefire-reports/TEST-*.xml; do
    lam ingest --junit "$xml"
  done
  
  # Append to historical log
  cat reports/summary.jsonl >> reports/history.jsonl
done

# Analyze for flaky tests
lam trends --since $(date -d "1 hour ago" +%Y-%m-%d)
```

**Pattern 4: Matrix Testing with Aggregation**
```yaml
# .github/workflows/matrix-test.yml
strategy:
  matrix:
    jdk: [11, 17, 21]
    os: [ubuntu, macos, windows]

steps:
  - name: Run tests
    run: mvn test
  
  - name: Upload JUnit XML
    uses: actions/upload-artifact@v3
    with:
      name: junit-${{ matrix.os }}-jdk${{ matrix.jdk }}
      path: target/surefire-reports/TEST-*.xml

# Aggregation job
aggregate:
  needs: test
  runs-on: ubuntu-latest
  steps:
    - name: Download all artifacts
      uses: actions/download-artifact@v3
    
    - name: Ingest all reports
      run: |
        find junit-* -name "TEST-*.xml" | while read xml; do
          lam ingest --junit "$xml"
        done
    
    - name: Generate combined analysis
      run: |
        lam summary
        lam digest
        lam trends
```

##### Example JUnit XML

**Simple passing tests:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="math-tests" tests="2" failures="0" errors="0" skipped="0" time="0.015">
    <testcase classname="com.example.MathTest" name="addition works" time="0.007"/>
    <testcase classname="com.example.MathTest" name="multiplies correctly" time="0.008"/>
  </testsuite>
</testsuites>
```

**With failures and errors:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="math-tests" tests="3" failures="1" errors="1" skipped="0" time="0.045">
    <testcase classname="math-tests" name="addition works" time="0.005"/>
    
    <testcase classname="math-tests" name="division fails" time="0.012">
      <failure message="Expected 2 but got 3" type="AssertionError">
AssertionError: Expected 2 but got 3
    at tests/math.spec.js:45:5
    at Object.&lt;anonymous&gt; (tests/math.spec.js:44:3)
      </failure>
    </testcase>
    
    <testcase classname="math-tests" name="throws on invalid input" time="0.028">
      <error message="Unexpected error" type="TypeError">
TypeError: Unexpected error
    at calculator.divide (src/calc.js:12:11)
    at tests/math.spec.js:52:7
      </error>
    </testcase>
  </testsuite>
</testsuites>
```

**With skipped tests:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="feature-tests" tests="4" failures="0" errors="0" skipped="2" time="0.030">
    <testcase classname="feature-tests" name="basic feature works" time="0.010"/>
    <testcase classname="feature-tests" name="advanced feature works" time="0.015"/>
    
    <testcase classname="feature-tests" name="experimental feature" time="0.000">
      <skipped message="Feature not yet implemented"/>
    </testcase>
    
    <testcase classname="feature-tests" name="deprecated test" time="0.000">
      <skipped/>
    </testcase>
  </testsuite>
</testsuites>
```

##### Troubleshooting

**Issue: Missing test details in JUnit XML**
- Some test frameworks produce minimal JUnit XML
- Check framework documentation for verbosity settings
- Maven Surefire: use `-X` for debug output
- Gradle: use `--info` or `--debug` flags

**Issue: XML parsing errors**
- Ensure XML is well-formed (proper encoding, closed tags)
- Check for special characters in test names (escape with entities)
- Large stack traces may need CDATA wrapping

**Issue: Nested test suites**
- JUnit XML spec allows nested `<testsuite>` elements
- Laminar ingest-junit handles nested suites automatically
- Suite hierarchy is flattened: `parent-suite/child-suite/test-name`

**Issue: Timestamps**
- JUnit XML `time` attribute is in seconds (decimal)
- Laminar converts to milliseconds for consistency
- Precision: JUnit supports microsecond precision, Laminar uses milliseconds

**Issue: Multiple XML files**
- Maven/Gradle generate one XML file per test class
- Use shell loops or globs to ingest all files
- Example: `find target/surefire-reports -name "TEST-*.xml" -exec lam ingest --junit {} \;`

**Issue: Duplicate test names**
- Ensure test names are unique within a suite
- Laminar uses `suite/testname` as the case ID
- Duplicate IDs will overwrite previous test data
```

**Generated Laminar Events:**
```jsonl
{"ts":1760290661027,"lvl":"info","case":"math-tests/addition works","phase":"setup","evt":"case.begin","payload":{"suite":"math-tests","classname":"math-tests","testName":"addition works"}}
{"ts":1760290661028,"lvl":"info","case":"math-tests/addition works","phase":"execution","evt":"test.run"}
{"ts":1760290661032,"lvl":"info","case":"math-tests/addition works","phase":"teardown","evt":"case.end","payload":{"duration":5,"status":"passed"}}
{"ts":1760290661042,"lvl":"info","case":"math-tests/division fails","phase":"setup","evt":"case.begin","payload":{"suite":"math-tests","classname":"math-tests","testName":"division fails"}}
{"ts":1760290661043,"lvl":"info","case":"math-tests/division fails","phase":"execution","evt":"test.run"}
{"ts":1760290661052,"lvl":"error","case":"math-tests/division fails","phase":"execution","evt":"test.error","payload":{"message":"Expected 2 but got 3","type":"AssertionError","stack":"AssertionError: Expected 2 but got 3\n    at tests/math.spec.js:45:5"}}
{"ts":1760290661054,"lvl":"error","case":"math-tests/division fails","phase":"teardown","evt":"case.end","payload":{"duration":12,"status":"failed"}}
```

### Go Test Adapter

Ingest Go test JSON output (see `lam ingest --go` above).

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

### MCP Cookbook: Practical Workflows

These cookbook examples demonstrate common patterns for using MCP tools in real-world scenarios.

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

Agent temporarily changes digest filters to focus on specific patterns without modifying persistent config.

```typescript
// Save current overlay state for restoration
const originalOverlay = await server.callTool('focus.overlay.get', {});

try {
  // Phase 1: Focus on worker lifecycle events only
  await server.callTool('focus.overlay.set', {
    rules: [
      { 
        match: { evt: ['worker.ready', 'worker.exit', 'worker.error'] }, 
        actions: [{ type: 'include' }],
        priority: 10
      }
    ]
  });
  
  await server.callTool('digest.generate', { 
    cases: ['worker.spec/lifecycle'] 
  });
  
  const workerDigest = await server.callTool('get_digest', { 
    caseName: 'worker.spec/lifecycle' 
  });
  
  console.log('Worker events:', workerDigest.digest.events.length);
  
  // Phase 2: Switch focus to error events with context
  await server.callTool('focus.overlay.set', {
    rules: [
      { 
        match: { lvl: 'error' }, 
        actions: [
          { type: 'include' },
          { type: 'slice', window: 10 },
          { type: 'codeframe', contextLines: 3 }
        ],
        priority: 10
      }
    ]
  });
  
  await server.callTool('digest.generate', { 
    cases: ['worker.spec/lifecycle'] 
  });
  
  const errorDigest = await server.callTool('get_digest', { 
    caseName: 'worker.spec/lifecycle' 
  });
  
  console.log('Error events with context:', errorDigest.digest.events.length);
  
} finally {
  // Restore original overlay state
  if (originalOverlay.rules.length > 0) {
    await server.callTool('focus.overlay.set', { 
      rules: originalOverlay.rules 
    });
  } else {
    await server.callTool('focus.overlay.clear', {});
  }
}
```

**Use Cases for Focus Overlays:**
- Debug worker lifecycle without permanent config changes
- Isolate specific event patterns for targeted analysis
- Compare digest outputs with different rule sets
- Agent-driven iterative debugging (errors → workers → assertions)

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

### JSON Contracts Quick Reference

| Tool | Input | Output | Key Fields |
|------|-------|--------|------------|
| `run` | `{ suite?, case?, flakeDetect?, flakeRuns? }` | `{ exitCode, message }` | exitCode: 0 = pass |
| `query` | `{ caseName?, level?, event?, limit? }` | `{ events[], totalCount }` | limit max: 1000 |
| `get_digest` | `{ caseName }` | `{ digest }` | digest.suspects, .events |
| `list_failures` | `{}` | `{ failures[] }` | failures[].artifactURI |
| `focus.overlay.set` | `{ rules[] }` | `{ success, message }` | Non-persistent |
| `focus.overlay.get` | `{}` | `{ rules[] }` | Returns current overlay |
| `focus.overlay.clear` | `{}` | `{ success, message }` | Clears overlay |
| `rules.get` | `{}` | `{ config }` | Persistent config |
| `rules.set` | `{ config }` | `{ success, message }` | Writes to disk |
| `digest.generate` | `{ cases? }` | `{ count, message }` | cases = all if omitted |
| `repro` | `{ caseName? }` | `{ commands[] }` | commands[].vitestCommand |
| `repro.bundle` | `{ caseName?, format? }` | `{ bundlePath, summary }` | format: json\|markdown |
| `diff.get` | `{ digest1Path, digest2Path, outputFormat? }` | `{ diff, formatted? }` | diff.addedEvents |
| `logs.case.get` | `{ caseName }` | `{ logs }` | Raw JSONL string |

**Common Patterns:**
- `caseName` format: `suite.spec/case_name` (underscores, no spaces)
- `level`: `'error' | 'warn' | 'info' | 'debug'`
- All tools throw `McpError` on validation failures
- Empty `{}` input = process all cases/use defaults

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

## Rule Packs

Rule packs are pre-configured digest rule templates optimized for specific test environments. Laminar provides three built-in packs via `lam init --template <pack>`.

### node-defaults (Default)

**Purpose:** Node.js/TypeScript test environments with Vitest or Jest.

**What it captures:**
- All error-level events with code frames
- Assertion failures (`assert.fail`) with ±10 event window and code frames
- Worker lifecycle events (ready/exit/error)

**Full configuration:**
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
        { "type": "codeframe", "contextLines": 2 }
      ],
      "priority": 9
    },
    {
      "match": { "evt": ["worker.ready", "worker.exit", "worker.error"] },
      "actions": [{ "type": "include" }],
      "priority": 7
    }
  ]
}
```

**Best for:** Node.js projects, concurrent test suites, systems using worker threads.

### go-defaults

**Purpose:** Go test environments using `lam ingest --go`.

**What it captures:**
- All error-level events with code frames
- Go test failures (`test.fail`) with ±10 event window and code frames
- Teardown and cleanup phase events

**Full configuration:**
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
      "actions": [
        { "type": "include" },
        { "type": "codeframe", "contextLines": 2 }
      ],
      "priority": 10
    },
    {
      "match": { "evt": "test.fail" },
      "actions": [
        { "type": "include" },
        { "type": "slice", "window": 10 },
        { "type": "codeframe", "contextLines": 2 }
      ],
      "priority": 9
    },
    {
      "match": { "phase": ["teardown", "cleanup"] },
      "actions": [{ "type": "include" }],
      "priority": 6
    }
  ]
}
```

**Best for:** Go projects, table-driven tests, Go subtests with cleanup functions.

### minimal

**Purpose:** Lightweight digest generation with minimal overhead.

**What it captures:**
- Error-level events only (no context, no code frames)

**Full configuration:**
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
    }
  ]
}
```

**Best for:** CI pipelines with tight token budgets, minimal debugging info, mass test runs.

### When to Use Each Pack

| Rule Pack | Use When | Avoid When |
|-----------|----------|------------|
| `node-defaults` | Node.js/TS tests, worker-based systems | Go tests, non-worker systems |
| `go-defaults` | Go test ingestion, Go-specific failures | Node.js tests, non-Go codebases |
| `minimal` | Strict token budgets, error-only debugging | Need context or code frames |

### Customizing Rule Packs

Start with a pack and modify:

```bash
# Initialize with node-defaults
lam init --template node-defaults

# Edit laminar.config.json to add custom rules
```

**Example: Add redaction to node-defaults**
```json
{
  "enabled": true,
  "budget": { "kb": 10, "lines": 200 },
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
      "match": { "evt": "topology.snapshot" },
      "actions": [
        { "type": "include" },
        { "type": "redact", "field": ["apiKey", "token", "secret"] }
      ],
      "priority": 8
    }
  ]
}
```

## Redaction

Redaction masks sensitive data in digest artifacts before they reach LLMs, logs, or human reviewers.

### How Redaction Works

The `redact` action replaces specified fields with `[REDACTED]` in matching events:

```typescript
// Before redaction
{
  "evt": "auth.token",
  "payload": {
    "token": "sk_live_abc123",
    "user": "alice"
  }
}

// After redaction (field: "payload")
{
  "evt": "auth.token",
  "payload": "[REDACTED]"
}
```

### Redaction Patterns

#### Entire Payload Redaction

Remove complete payload objects:

```json
{
  "match": { "evt": "auth.token" },
  "actions": [
    { "type": "include" },
    { "type": "redact", "field": "payload" }
  ],
  "priority": 10
}
```

**Output:**
```json
{ "evt": "auth.token", "payload": "[REDACTED]" }
```

#### Multiple Field Redaction

Redact multiple top-level fields:

```json
{
  "match": { "evt": "api.request" },
  "actions": [
    { "type": "include" },
    { "type": "redact", "field": ["apiKey", "token", "secret"] }
  ],
  "priority": 10
}
```

**Input:**
```json
{
  "evt": "api.request",
  "apiKey": "sk_abc123",
  "token": "Bearer xyz789",
  "method": "POST"
}
```

**Output:**
```json
{
  "evt": "api.request",
  "apiKey": "[REDACTED]",
  "token": "[REDACTED]",
  "method": "POST"
}
```

#### Conditional Redaction

Redact only when event matches specific criteria:

```json
{
  "match": { 
    "evt": "db.query",
    "phase": "execution"
  },
  "actions": [
    { "type": "include" },
    { "type": "redact", "field": "payload" }
  ],
  "priority": 9
}
```

### Redaction Limitations

**Current scope:** Redaction operates on top-level event fields only.

**Not supported:**
- Nested field redaction (e.g., `payload.user.email`)
- Pattern-based redaction (e.g., all fields matching `/token/i`)
- Content scanning within strings

**Workaround for nested fields:**
```json
{
  "match": { "evt": "user.profile" },
  "actions": [
    { "type": "include" },
    { "type": "redact", "field": "payload" }
  ]
}
```
This redacts the entire `payload` object, including nested `payload.user.email`.

### Common Redaction Use Cases

#### API Keys & Tokens
```json
{
  "match": { "evt": ["api.call", "auth.token", "oauth.refresh"] },
  "actions": [
    { "type": "include" },
    { "type": "redact", "field": ["apiKey", "token", "refreshToken", "secret"] }
  ],
  "priority": 10
}
```

#### Database Credentials
```json
{
  "match": { "evt": "db.connect" },
  "actions": [
    { "type": "include" },
    { "type": "redact", "field": ["password", "connectionString"] }
  ],
  "priority": 10
}
```

#### PII (Personally Identifiable Information)
```json
{
  "match": { "evt": ["user.create", "user.update", "profile.view"] },
  "actions": [
    { "type": "include" },
    { "type": "redact", "field": ["email", "ssn", "phoneNumber", "address"] }
  ],
  "priority": 10
}
```

#### Environment Variables
```json
{
  "match": { "evt": "config.load" },
  "actions": [
    { "type": "include" },
    { "type": "redact", "field": "payload" }
  ],
  "priority": 10
}
```

### Redaction Best Practices

1. **Redact at highest priority:** Security rules should have `priority: 10` to run first
2. **Include before redacting:** Always pair `{ "type": "include" }` with redaction
3. **Test redaction rules:** Verify sensitive data is masked in digest outputs
4. **Document redacted fields:** Comment in config which fields contain secrets
5. **Fail-safe defaults:** When uncertain, redact entire `payload` field

**Example config with best practices:**
```json
{
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
      "match": { "evt": ["auth.token", "api.key", "oauth.refresh"] },
      "actions": [
        { "type": "include" },
        { "type": "redact", "field": "payload" }
      ],
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

### Verifying Redaction

Check digest outputs to confirm redaction:

```bash
# Generate digest
lam digest --cases auth.spec/token_refresh

# Inspect digest for [REDACTED] markers
cat reports/auth.spec/token_refresh.digest.json | jq '.events[] | select(.evt == "auth.token")'
```

Expected output:
```json
{
  "evt": "auth.token",
  "lvl": "info",
  "payload": "[REDACTED]"
}
```

## Budget Behavior & Tuning

Digest budgets prevent token/cost overruns by limiting artifact size. Budgets apply to each test case digest independently.

### Budget Configuration

```json
{
  "budget": {
    "kb": 10,
    "lines": 200
  }
}
```

- `kb`: Maximum digest size in kilobytes (applies to final JSON output)
- `lines`: Maximum number of events included in digest

**Both limits enforced:** Digest generation stops when EITHER limit is reached.

### How Budgets Are Applied

**Event selection order:**
1. Rules sorted by priority (high → low)
2. Events matched and marked for inclusion
3. Events added to digest until budget exhausted
4. Remaining events discarded

**Budget consumption:**
- Each event: ~100-500 bytes (depends on payload size)
- Each code frame: ~200-500 bytes (depends on context lines)
- Total digest: Sum of all included events + metadata + code frames

**Code frame limits:**
- Max 5 code frames per digest (prevents budget exhaustion)
- Frames extracted from error events only
- Context lines configurable via `contextLines` parameter

### Budget Tuning Guidelines

#### Default Budget (10KB / 200 lines)
**Good for:**
- Standard unit tests
- Single assertion failures
- ~20-50 events with code frames
- ~2500 LLM tokens

**Increase if:**
- Complex integration tests with many events
- Need more code frame context
- Multi-step failures requiring full lifecycle

#### Small Budget (5KB / 100 lines)
```json
{
  "budget": { "kb": 5, "lines": 100 }
}
```

**Good for:**
- CI pipelines with strict token limits
- Simple error-only capture
- Mass test runs (hundreds of tests)
- ~1200 LLM tokens

#### Large Budget (20KB / 500 lines)
```json
{
  "budget": { "kb": 20, "lines": 500 }
}
```

**Good for:**
- E2E tests with long event sequences
- Distributed system failures
- Full worker lifecycle capture
- ~5000 LLM tokens

#### Unlimited Budget (for debugging)
```json
{
  "budget": { "kb": 1000, "lines": 10000 }
}
```

**Use sparingly:**
- Local debugging only
- Single test deep-dive
- Not recommended for CI/production

### Budget Exhaustion Behavior

When budget is exceeded:
1. Digest generation stops immediately
2. Already-included events are preserved
3. `summary.budgetUsed` shows bytes consumed
4. `summary.budgetLimit` shows configured limit
5. Digest marked as truncated (implicit)

**Example truncated digest:**
```json
{
  "summary": {
    "totalEvents": 1500,
    "includedEvents": 180,
    "budgetUsed": 10240,
    "budgetLimit": 10240
  }
}
```

This shows 180/1500 events included before hitting 10KB limit.

### Optimizing for Budget

**Reduce events:**
- Use higher-priority rules for critical events only
- Avoid `slice` windows on every rule
- Filter by `phase` or `lvl` to narrow scope

**Reduce code frames:**
- Decrease `contextLines` from 5 → 2 or 1
- Remove `codeframe` action from non-critical rules

**Increase selectivity:**
```json
{
  "match": { 
    "lvl": "error",
    "phase": "assert"
  },
  "actions": [{ "type": "include" }]
}
```

Instead of:
```json
{
  "match": { "lvl": "error" },
  "actions": [
    { "type": "include" },
    { "type": "slice", "window": 50 }
  ]
}
```

### Budget Monitoring

Check budget usage in digest summary:

```bash
# View budget metrics
cat reports/kernel.spec/connect_moves_data_1_1.digest.json | jq '.summary'
```

Output:
```json
{
  "totalEvents": 342,
  "includedEvents": 28,
  "redactedFields": 3,
  "budgetUsed": 8450,
  "budgetLimit": 10240
}
```

**Interpreting metrics:**
- `budgetUsed / budgetLimit`: Utilization ratio (8450/10240 = 82%)
- If equal: Budget exhausted, digest truncated
- If under: Budget sufficient, all matched events included

## Focus Overlays

Focus overlays provide ephemeral, in-memory digest rule management without modifying `laminar.config.json`.

### Key Characteristics

- **Non-persistent:** Overlay rules exist only in memory, cleared on server restart
- **Override behavior:** Overlay rules are applied AFTER persistent rules
- **Independent:** Changing overlay doesn't affect `laminar.config.json`
- **Atomic operations:** Set/clear/get are immediate, no file I/O

### Use Cases

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

## Triage Hints

Laminar can automatically detect common patterns in test failures and suggest next steps. Hints appear in digest outputs and help you quickly identify configuration issues, budget constraints, and test trends.

### Hints Configuration

Add hints configuration to your `laminar.config.json`:

```json
{
  "enabled": true,
  "budget": {
    "kb": 10,
    "lines": 200
  },
  "hints": {
    "enabled": false,
    "showTrends": true,
    "maxLines": 1
  },
  "rules": [
    // ... your rules
  ]
}
```

**Configuration Options:**

- `hints.enabled` (boolean): Enable/disable hint generation (default: `false`)
- `hints.showTrends` (boolean): Include trend hints from test history (default: `true`)
- `hints.maxLines` (number): Maximum number of hints to show per digest (default: `1`)

**CLI Flag Override:**

```bash
# Enable hints via CLI flag
npx lam summary --hints

# Works with or without environment variable (OR logic)
LAMINAR_HINTS=0 npx lam summary --hints  # Still shows hints (flag wins)
```

**Environment Variable Override:**

```bash
# Enable hints via environment variable
LAMINAR_HINTS=1 npx lam summary

# Works with or without CLI flag (OR logic)
LAMINAR_HINTS=1 npx lam summary  # Shows hints (env var wins)
```

**Gating Behavior:**

Hints are shown when **ANY** of the following is true:
1. `--hints` flag is passed to `lam summary`
2. `LAMINAR_HINTS=1` environment variable is set
3. Both can be set simultaneously (redundant but allowed)

The CLI flag and environment variable use **OR logic** - either one enables hints.

### Hint Detectors

Laminar includes four built-in hint detectors that analyze your digest output:

#### 1. Missing Include Detector (`missing-include`)

**What it detects:**
- Expected events are configured in rules but absent from the digest
- Occurs when budget constraints or filtering exclude important events

**Example scenario:**
```json
// Rule expects 'worker.ready' event
{
  "match": { "evt": "worker.ready" },
  "actions": [{ "type": "include" }]
}
```

If `worker.ready` never appears in the digest, you'll see:

```
## Hints
### missing-include
**Signal**: Expected events not in digest: worker.ready
**Suggested Commands**:
- npx laminar digest kernel.spec/connect_moves_data_1_1 --expand
- npx laminar tail kernel.spec/connect_moves_data_1_1 --evt "worker.ready"
```

**Why it matters:** You might be investigating the wrong time window or have budget constraints hiding critical events.

#### 2. Redaction Mismatch Detector (`redaction-mismatch`)

**What it detects:**
- Redaction rules are configured but no fields were actually redacted
- Indicates rules may not match the events in the digest

**Example scenario:**
```json
{
  "match": { "evt": "api.call" },
  "actions": [
    { "type": "include" },
    { "type": "redact", "field": ["apiKey", "token"] }
  ]
}
```

If the digest has 0 redacted fields despite the rule above:

```
## Hints
### redaction-mismatch
**Signal**: Redaction rules present (apiKey, token) but no fields redacted
**Suggested Commands**:
- npx laminar tail kernel.spec/connect_moves_data_1_1 --raw
- npx laminar config rules --show
```

**Why it matters:** Your security rules may not be working, or event names/field names don't match expectations.

#### 3. Budget Clipped Detector (`budget-clipped`)

**What it detects:**
- Budget is near exhaustion (>85% used)
- Large number of events were dropped (inclusion ratio <50%)
- Critical events may have been excluded

**Example scenario:**
```json
{
  "budget": {
    "kb": 10,
    "lines": 200
  }
}
```

If budget hits 10KB and only 20% of events are included:

```
## Hints
### budget-clipped
**Signal**: Budget at 95%, 450 events dropped
**Suggested Commands**:
- npx laminar config --budget-kb 20
- npx laminar tail kernel.spec/connect_moves_data_1_1 --before-fail 20
```

**Why it matters:** You may be missing context needed to diagnose the failure. Increase budget or make rules more selective.

#### 4. Trend Detector (`trend/new` or `trend/regression`)

**What it detects:**
- New test failure with no previous history
- Regression after recent passing runs (within last 5 runs)

**Requires:** Test history tracking (generated automatically when tests run)

**Example scenario (new failure):**

```
## Hints
### trend/new
**Signal**: New test failure - no history found
**Suggested Commands**:
- npx laminar compare --case kernel.spec/connect_moves_data_1_1
- git log -p --follow -- "tests/kernel.spec.ts:45"
```

**Example scenario (regression):**

```
## Hints
### trend/regression
**Signal**: Regression - passed 4/5 recent runs
**Suggested Commands**:
- npx laminar compare kernel.spec/connect_moves_data_1_1 --last-pass
- git log --oneline -10 -- "tests/kernel.spec.ts:45"
```

**Why it matters:** Helps prioritize triage. New failures may indicate test infrastructure issues. Regressions suggest recent code changes broke existing functionality.

### Hints in Digest Output

Hints appear at the bottom of both JSON and Markdown digests:

**JSON format (`*.digest.json`):**
```json
{
  "case": "kernel.spec/connect_moves_data_1_1",
  "summary": {
    "totalEvents": 500,
    "includedEvents": 25,
    "budgetUsed": 9800,
    "budgetLimit": 10240
  },
  "hints": [
    {
      "tag": "budget-clipped",
      "signal": "Budget at 96%, 475 events dropped",
      "suggestedCommands": [
        "npx laminar config --budget-kb 20",
        "npx laminar tail kernel.spec/connect_moves_data_1_1 --before-fail 20"
      ]
    }
  ]
}
```

**Markdown format (`*.digest.md`):**
```markdown
## Summary
- Total events: 500
- Included events: 25
- Budget used: 9800 / 10240 bytes

## Hints
### budget-clipped
**Signal**: Budget at 96%, 475 events dropped
**Suggested Commands**:
- npx laminar config --budget-kb 20
- npx laminar tail kernel.spec/connect_moves_data_1_1 --before-fail 20
```

### Configuring Hint Behavior

**Enable all hints:**
```json
{
  "hints": {
    "enabled": true,
    "showTrends": true,
    "maxLines": 3
  }
}
```

**Disable trend hints (only config/budget hints):**
```json
{
  "hints": {
    "enabled": true,
    "showTrends": false,
    "maxLines": 1
  }
}
```

**Disable hints entirely:**
```json
{
  "hints": {
    "enabled": false
  }
}
```

### Common Hint Workflows

**Workflow 1: Investigating budget-clipped**
```bash
# 1. See the hint in digest
npx lam digest --cases kernel.spec/connect_moves_data_1_1

# 2. Check budget utilization
cat reports/kernel.spec/connect_moves_data_1_1.digest.json | jq '.summary'

# 3. Increase budget temporarily
LAMINAR_BUDGET_KB=20 npx lam digest --cases kernel.spec/connect_moves_data_1_1

# 4. Update config permanently if needed
npx lam config --budget-kb 20
```

**Workflow 2: Investigating missing-include**
```bash
# 1. See hint about missing 'worker.ready'
npx lam digest --cases kernel.spec/worker_lifecycle

# 2. Search raw JSONL for the event
npx lam tail kernel.spec/worker_lifecycle --evt "worker.ready"

# 3. If found, expand digest window
npx lam digest --cases kernel.spec/worker_lifecycle --expand

# 4. If not found, check test source
cat tests/kernel.spec.ts | grep -A5 -B5 "worker.ready"
```

**Workflow 3: Following regression trend**
```bash
# 1. See trend/regression hint
npx lam digest --cases api.spec/auth_flow

# 2. Compare to last passing run
npx lam compare api.spec/auth_flow --last-pass

# 3. Check recent commits
git log --oneline -10 -- tests/api.spec.ts

# 4. View diff between passing and failing
npx lam diff api.spec/auth_flow --from last-pass --to latest
```

### Best Practices

1. **Start with hints disabled:** Enable once you're familiar with Laminar's output format
2. **Use `maxLines: 1` in CI:** Keeps digest output compact for automated workflows
3. **Use `maxLines: 3` locally:** See multiple hints when debugging interactively
4. **Enable `showTrends` with history:** Requires persistent test history tracking
5. **Override with `LAMINAR_HINTS=1`:** Temporarily enable hints without config changes
6. **Review suggested commands:** Hints include actionable next steps, not just diagnostics

## Secret Redaction

Laminar automatically redacts sensitive information from test artifacts to prevent accidental exposure of credentials.

### Supported Secret Types

The redaction system detects and redacts the following secret patterns:

1. **JWT Tokens** — Pattern: `eyJ...` (standard JWT format)
2. **AWS Access Keys** — Pattern: `AKIA[0-9A-Z]{16}`
3. **AWS Secret Keys** — Pattern: `aws_secret_access_key = ...`
4. **API Keys** — Pattern: `zz_live_*` or `zz_test_*` (16+ chars)
5. **URL Credentials** — Pattern: `scheme://user:pass@host`
6. **RSA Private Keys** — Pattern: `-----BEGIN RSA PRIVATE KEY-----`

### Redaction Behavior

**Deep Traversal:**
- Redaction recursively processes all nested objects, arrays, and mixed structures
- Works at any nesting depth (tested to 5+ levels)
- Handles objects in arrays, arrays in objects, and complex combinations

**Unicode Support:**
- Redaction works correctly with unicode characters in surrounding text
- Preserves unicode content while redacting secrets
- Example: `"用户认证失败 token=eyJ... 🔐"` → `"用户认证失败 token=[REDACTED:jwt] 🔐"`

**Edge Cases:**
- Handles `null` and `undefined` values without errors
- Preserves empty strings, arrays, and objects
- Works with long strings (~1KB+) containing secrets

**Replacement Format:**
- `[REDACTED:jwt]` — JWT tokens
- `[REDACTED:aws-key]` — AWS access keys
- `[REDACTED:aws-secret]` — AWS secret keys
- `[REDACTED:api-key]` — API keys
- `[REDACTED:url-creds]` — URL credentials (preserves scheme and host)
- `[REDACTED:private-key]` — Private keys

### Known Limitations

1. **API Key Minimum Length:** API keys must be at least 16 characters (pattern: `zz_{live|test}_[A-Za-z0-9]{16,}`)
2. **Performance Considerations:** Very large strings (>10KB) may slow redaction; keep test data reasonable
3. **Pattern-Based Only:** Redaction relies on regex patterns; custom secret formats require additional patterns
4. **No Contextual Analysis:** Cannot detect secrets based on context (e.g., field names like "password")
5. **URL Credential Format:** Only redacts credentials in standard URL format (`scheme://user:pass@host`)

### Configuration

**Enable/Disable Redaction:**
```json
{
  "redaction": {
    "enabled": true,
    "secrets": true
  }
}
```

**Opt-Out (disable all redaction):**
```json
{
  "redaction": {
    "optOut": true
  }
}
```

### Testing Redaction

See `tests/digest/redaction.spec.ts` and `tests/digest/redaction-edges.spec.ts` for comprehensive test coverage including:
- Deeply nested structures (5+ levels)
- Mixed nested structures (objects in arrays in objects)
- Long strings with embedded secrets
- Unicode text with secrets
- Arrays of secrets
- Null/undefined/empty edge cases
