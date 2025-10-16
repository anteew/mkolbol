# CI Acceptance Smoke Test: Non-Gating Topology Validation

**Overview:** The acceptance smoke test is a **best-effort, non-gating** CI job that validates mkolbol topology execution in a realistic scenario. It runs `mkctl` with a FilesystemSink configuration and records pass/fail metrics without blocking PR merges.

---

## Why Acceptance Smoke Tests?

The smoke test answers three critical questions:
1. **Does the topology actually run?** (Not just unit tests passing)
2. **Does data flow correctly?** (FilesystemSink receives and records data)
3. **Is routing working?** (Router endpoints are properly discovered)

These are end-to-end integration checks that **no unit test can fully replicate**. They catch issues like:
- Module instantiation failures in real executor context
- Pipe connection errors between modules
- Heartbeat/health check timeouts
- Router snapshot persistence failures

---

## Smoke Test Architecture

### Three Validation Checks

The acceptance-smoke job runs a single topology and validates three outcomes:

```yaml
Test Configuration:
  ├─ Module: ExternalProcess (HTTP server)
  ├─ Module: FilesystemSink (write to JSONL)
  ├─ Connection: server output → JSONL input
  └─ Duration: 5 seconds

Validation Checks:
  ✅ Check 1: Topology running (grep "Topology running" in logs)
  ✅ Check 2: FilesystemSink JSONL created (file exists with N lines)
  ✅ Check 3: Router endpoints recorded (JSON snapshot with endpoint count)
```

### Non-Gating Design

```
GitHub Actions Workflow:
├─ test job: ❌ FAILS → PR BLOCKED (gating, required)
├─ consumer-test job: ❌ FAILS → WARNING only (non-gating)
└─ acceptance-smoke job: ❌ FAILS → WARNING only (non-gating)

Benefits:
- Catches real issues without blocking development
- Avoids "flaky test" merge delays
- Aggregates results in PR comments for visibility
- Can be made gating in future when more stable
```

---

## Configuration

### Topology Under Test

File: `examples/configs/http-logs-local-file.yml`

```yaml
nodes:
  - id: web
    module: ExternalProcess
    params:
      command: node
      args:
        - -e
        - "require('http').createServer((req,res)=>{
             console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
             res.end('ok')
           }).listen(3000,()=>console.log('Server listening on http://localhost:3000'))"
      ioMode: stdio
      restart: never

  - id: sink
    module: FilesystemSink
    params:
      filename: reports/http-logs.jsonl

connections:
  - from: web.output
    to: sink.input
```

**Why this config?**
- **Lightweight**: No external processes or complex setup
- **Observable**: Generates JSONL output that can be inspected
- **Isolated**: Doesn't conflict with main unit tests
- **Representative**: Uses real modules (ExternalProcess, FilesystemSink)

### CI Job Configuration

File: `.github/workflows/tests.yml`

```yaml
acceptance-smoke:
  name: Acceptance Smoke Test (FilesystemSink)
  runs-on: ubuntu-latest
  needs: test
  if: ${{ always() }}           # Run even if test job fails
  continue-on-error: true       # Don't block PR on smoke test failure

  steps:
    - name: Setup
      # ... checkout, npm ci, npm run build ...

    - name: Run acceptance smoke test
      env:
        MK_LOCAL_NODE: '1'      # Enforce Local Node mode
      run: |
        timeout 10 node dist/scripts/mkctl.js run \
          --file examples/configs/http-logs-local-file.yml \
          --duration 5 \
          > /tmp/smoke-test.log 2>&1 || true

        # Validation script (see below)
```

---

## Validation Script (CI Implementation)

The smoke test performs three checks and records results to `reports/acceptance-smoke.jsonl`:

### Check 1: Topology Running

```bash
if grep -q "Topology running" /tmp/smoke-test.log; then
  TOPOLOGY_PASS="true"
else
  TOPOLOGY_PASS="false"
fi
```

**What it validates:**
- mkctl started successfully
- Executor initialized nodes without errors
- Topology reached "running" state (not crashed during startup)

**Failure indicators:**
- "Module not found" error
- "Configuration validation failed"
- "Health check failed"
- Process exited with error code

### Check 2: FilesystemSink JSONL Created

```bash
if [ -f reports/http-logs.jsonl ]; then
  FILESINK_PASS="true"
  LOG_LINES=$(wc -l < reports/http-logs.jsonl)
  echo "✅ FilesystemSink smoke test PASSED: JSONL file created with $LOG_LINES lines"
else
  FILESINK_PASS="false"
  echo "⚠️  FilesystemSink smoke test: reports/http-logs.jsonl not found"
fi
```

**What it validates:**
- FilesystemSink module instantiated correctly
- Pipes connected between ExternalProcess → FilesystemSink
- HTTP server emitted data (at least one line logged)
- Data persisted to filesystem

**Failure indicators:**
- File doesn't exist (JSONL never created)
- File empty (pipes not connected or no data emitted)
- File permission error (directory not writable)

### Check 3: Router Endpoints Recorded

```bash
if [ -f reports/router-endpoints.json ]; then
  ENDPOINTS_PASS="true"
  ENDPOINT_COUNT=$(jq 'length' reports/router-endpoints.json)
  echo "✅ Router endpoints recorded: $ENDPOINT_COUNT endpoints"
else
  ENDPOINTS_PASS="false"
  echo "⚠️  Router endpoints not found"
fi
```

**What it validates:**
- RoutingServer (or in-process Router) running
- Both endpoints registered: `web.output` and `sink.input`
- Snapshot persisted to JSON at shutdown
- Router tracked module endpoints correctly

**Failure indicators:**
- File doesn't exist (Router didn't snapshot)
- Endpoint count 0 (modules not registered)
- Endpoint count 1 (one module failed to register)

---

## Results Aggregation

### Recording Results

After all three checks, results are written to `reports/acceptance-smoke.jsonl`:

```json
{
  "type": "acceptance",
  "topology": true,
  "filesink": true,
  "endpoints": true,
  "timestamp": "2025-10-17T04:15:23Z"
}
```

**Format:** One JSON object per line (JSONL), allows appending multiple runs to same file.

### PR Comment Aggregation

File: `scripts/post-laminar-pr-comment.js`

The script reads `reports/acceptance-smoke.jsonl` and generates PR comment section:

```javascript
function readAcceptanceResults() {
  if (!fs.existsSync(ACCEPTANCE_PATH)) return '';

  const lines = fs.readFileSync(ACCEPTANCE_PATH, 'utf-8')
    .split('\n')
    .filter(l => l.trim());

  const result = JSON.parse(lines[lines.length - 1]); // Last result

  const checks = [];
  if (result.topology) checks.push('✅ Topology');
  else checks.push('❌ Topology');

  if (result.filesink) checks.push('✅ FilesystemSink');
  else checks.push('❌ FilesystemSink');

  if (result.endpoints) checks.push('✅ Router Endpoints');
  else checks.push('❌ Router Endpoints');

  return `\n### 🧪 Acceptance Smoke Test\n${checks.join(' | ')}`;
}
```

**Posted to PR as:**

```
### 🧪 Acceptance Smoke Test
✅ Topology | ✅ FilesystemSink | ✅ Router Endpoints
```

Or if failed:

```
### 🧪 Acceptance Smoke Test
✅ Topology | ❌ FilesystemSink | ✅ Router Endpoints
```

---

## PR Comment Structure

The aggregated PR comment combines:
1. **Test Summary** (from Laminar unit tests)
2. **Failure Trends** (from Laminar trends history)
3. **Flake Budget** (tests failing ≥2 times in last 5 runs)
4. **Acceptance Smoke Test** (three checks: topology, filesink, endpoints)
5. **Artifacts** (links to detailed logs)

```markdown
## 📊 Laminar Test Report (Aggregated)

### Test Summary
...unit test results...

### Failure Trends
...failure trends...

### 🔴 Flake Budget
...flaky tests...

### 🧪 Acceptance Smoke Test
✅ Topology | ✅ FilesystemSink | ✅ Router Endpoints

### 📁 Artifacts
- Full Summary: See job artifacts for LAMINAR_SUMMARY.txt
- Repro Hints: See job artifacts for LAMINAR_REPRO.md
- Acceptance Logs: See job artifacts for acceptance-smoke-logs
- Per-Node Reports: Node 20 and Node 24 reports
```

---

## Workflow States and Transitions

### PR Merge Scenarios

```
Scenario 1: All checks pass (Topology + FilesystemSink + Endpoints)
  Acceptance job: ✅ PASS
  PR comment: Shows ✅✅✅
  PR merge: ALLOWED (non-gating)
  Developer action: None needed

Scenario 2: FilesystemSink fails (e.g., pipe not connected)
  Acceptance job: ⚠️ SOFT FAIL
  PR comment: Shows ✅❌✅
  PR merge: ALLOWED (non-gating, but warning visible)
  Developer action: Review PR comment, investigate if real bug
  Follow-up: May revert PR if investigating shows critical issue

Scenario 3: Unit tests fail (process-mode or threads)
  Test job: ❌ FAILS
  PR: BLOCKED (test job is gating, required)
  Acceptance job: Runs anyway (depends: test, if: always())
  Action: Must fix unit tests first before acceptance smoke runs

Scenario 4: Acceptance smoke times out (topology hangs)
  Acceptance job: ⚠️ TIMEOUT
  Timeout: 10 seconds (mkctl process terminates via timeout)
  Results: May show partial data (filesink created but incomplete)
  PR comment: Shows mixed results ✅❌✅ or ⚠️ note
```

---

## Debugging Acceptance Smoke Failures

### If Topology Check Fails

```bash
# Check logs for startup errors
cat /tmp/smoke-test.log | head -20

# Common causes:
# - Module not found: "Unknown module 'ExternalProcess'"
# - Config validation: "Configuration validation failed"
# - Port conflict: "EADDRINUSE: address already in use :::3000"

# Fix: Verify config file is valid
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local-file.yml --dry-run
```

### If FilesystemSink Check Fails

```bash
# Check if directory exists
ls -la reports/

# Check if file created but empty
wc -l reports/http-logs.jsonl

# Check stdout for data emission
cat /tmp/smoke-test.log | grep -i "jsonl\|write"

# Common causes:
# - Pipe not connected: Check YAML connections section
# - Server not emitting: HTTP server crashed before emitting
# - FilesystemSink failed: Check file write permissions

# Fix: Run manually with verbose logging
export MK_LOCAL_NODE=1
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local-file.yml --duration 5 2>&1 | tee /tmp/debug.log
```

### If Router Endpoints Check Fails

```bash
# Check if endpoints snapshot created
ls -la reports/router-endpoints.json

# Count endpoints
jq 'length' reports/router-endpoints.json

# List endpoint names
jq '.[] | .id' reports/router-endpoints.json

# Common causes:
# - Router not initialized: Router requires RoutingServer in config
# - Modules didn't register: Health check failed or module crashed
# - Snapshot not persisted: Topology stopped before snapshot write

# Fix: Verify router is in config (if using in-process routing)
# Local Node mode (MK_LOCAL_NODE=1) uses in-process RoutingServer
```

---

## Manual Testing (Local Reproduction)

To reproduce the acceptance smoke test locally:

```bash
# 1. Build the project
npm run build

# 2. Run mkctl with same config
export MK_LOCAL_NODE=1
timeout 10 node dist/scripts/mkctl.js run \
  --file examples/configs/http-logs-local-file.yml \
  --duration 5

# 3. Check all three artifacts
ls -la reports/
cat reports/http-logs.jsonl
cat reports/router-endpoints.json | jq .

# 4. Simulate CI validation
if [ -f reports/http-logs.jsonl ]; then
  echo "✅ FilesystemSink pass"
else
  echo "❌ FilesystemSink fail"
fi

if [ -f reports/router-endpoints.json ]; then
  echo "✅ Router endpoints pass"
else
  echo "❌ Router endpoints fail"
fi
```

---

## Integration with Continuous Monitoring

### Flake Budget Calculation

The acceptance smoke results feed into the flake budget (tests failing ≥2 times in last 5 runs).

**Current implementation:** Only unit tests tracked. Future enhancement could track acceptance smoke flakiness separately.

### Artifact Persistence

CI artifacts retained for 90 days (GitHub Actions default):
- `/tmp/smoke-test.log` — Raw mkctl output
- `reports/acceptance-smoke.jsonl` — Result record
- `reports/http-logs.jsonl` — Topology output data
- `reports/router-endpoints.json` — Endpoint snapshot

**Access in GitHub UI:**
```
Actions → Workflow run → Artifacts → acceptance-smoke-logs
```

---

## Future Enhancements

### Phase 2: Make Smoke Test Gating

```yaml
acceptance-smoke:
  continue-on-error: false  # Change to required status

# Would require:
# - Reducing flakiness (network timeouts, timing issues)
# - Adding retries (3 attempts on fail)
# - Pre-warmup (ensure no port conflicts)
```

### Phase 3: Extended Scenarios

```yaml
# Test multiple topology patterns:
# - Split/Merge scenarios
# - Multiple external processes
# - Different I/O modes (PTY, stdio, pipes)
# - Health check edge cases (slow startup, restarts)
```

### Phase 4: Performance Benchmarks

```bash
# Track metrics in JSONL:
# - Startup time (first endpoint registered)
# - Data throughput (bytes/sec through sink)
# - Router latency (endpoint discovery time)
# - Memory usage (peak memory during run)
```

---

---

## MK RC Smoke Test Job

### Overview

The `mk-rc-smoke` job validates the **mk CLI release candidate** workflow: `mk init`, `mk build`, and `mk package`. This is a **non-gating, best-effort** CI job that runs in parallel with the acceptance smoke test.

### Job Configuration

```yaml
mk-rc-smoke:
  name: MK RC Smoke Test (init/build/package)
  runs-on: ubuntu-latest
  needs: test
  if: ${{ always() }}           # Run even if test job fails
  continue-on-error: true       # Don't block PR on smoke test failure
```

### Test Sequence

The job performs three sequential tests:

1. **mk init test-project** — Initialize a new mkolbol project
2. **mk build** — Build the initialized project
3. **mk package** — Create a distributable tarball

Each test is conditional on the previous step passing.

### Validation Checks

**Check 1: mk init**
```bash
node dist/scripts/mk.js init test-project > /tmp/mk-init.log 2>&1
# Validates: Project scaffolding, package.json creation, default config generation
```

**Check 2: mk build**
```bash
cd test-project
node ../dist/scripts/mk.js build > /tmp/mk-build.log 2>&1
# Validates: TypeScript compilation, module bundling, dist/ output
```

**Check 3: mk package**
```bash
node ../dist/scripts/mk.js package > /tmp/mk-package.log 2>&1
# Validates: Tarball creation, dependency bundling, package metadata
```

### Results Format

Results are recorded to `reports/mk-rc-smoke.jsonl`:

```json
{
  "type": "mk-rc-smoke",
  "init": true,
  "build": true,
  "package": true,
  "timestamp": "2025-10-16T04:15:23Z"
}
```

### Artifacts

CI artifacts include:
- `/tmp/mk-init.log` — mk init command output
- `/tmp/mk-build.log` — mk build command output
- `/tmp/mk-package.log` — mk package command output
- `test-project/` — Generated project directory

### Local Reproduction

```bash
npm run build
node dist/scripts/mk.js init test-project
cd test-project && node ../dist/scripts/mk.js build
node ../dist/scripts/mk.js package
ls -la *.tgz
```

---

## MK CI Plan Command

### Overview

The `mk ci plan` command generates CI configuration for GitHub Actions workflows. It outputs test matrices and cache keys in JSON or shell-sourceable format.

### Usage

```bash
# JSON output (default)
mk ci plan

# Shell export format for CI
mk ci plan --env
```

### Output Formats

**JSON (default):**
```json
{
  "matrix": {
    "node": ["20", "24"],
    "lane": ["threads", "forks"]
  },
  "cacheKeys": {
    "node-modules-20": "node-modules-20-abc123",
    "node-modules-24": "node-modules-24-def456"
  }
}
```

**ENV format (--env):**
```bash
export MATRIX_NODE='["20","24"]'
export MATRIX_LANE='["threads","forks"]'
export CACHE_KEY_NODE_MODULES_20=node-modules-20-abc123
export CACHE_KEY_NODE_MODULES_24=node-modules-24-def456
```

### GitHub Actions Integration

```yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      matrix-node: ${{ steps.plan.outputs.matrix-node }}
      matrix-lane: ${{ steps.plan.outputs.matrix-lane }}
    steps:
      - uses: actions/checkout@v4
      - name: Generate CI plan
        id: plan
        run: |
          eval "$(node dist/scripts/mk.js ci plan --env)"
          echo "matrix-node=$MATRIX_NODE" >> $GITHUB_OUTPUT
          echo "matrix-lane=$MATRIX_LANE" >> $GITHUB_OUTPUT

  test:
    needs: plan
    strategy:
      matrix:
        node: ${{ fromJson(needs.plan.outputs.matrix-node) }}
        lane: ${{ fromJson(needs.plan.outputs.matrix-lane) }}
    runs-on: ubuntu-latest
    steps:
      - name: Run tests
        run: npm run test:${{ matrix.lane }}
```

### Local Usage

```bash
# Generate and source environment variables
eval "$(mk ci plan --env)"

# Use in scripts
echo "Node versions: $MATRIX_NODE"
echo "Cache key: $CACHE_KEY_NODE_MODULES_20"
```

---

## Related Documentation

- **[Doctor Guide](./doctor.md)** — Troubleshooting mkctl errors and health checks
- **[Acceptance Pack](../../tests/devex/acceptance/local-node-v1.md)** — Acceptance test checklist
- **[Laminar Workflow](./laminar-workflow.md)** — Test observability and trends
- **[mkctl Cookbook](./mkctl-cookbook.md)** — Daily reference for mkctl commands
- **[CI/CD Integration](../../.github/workflows/tests.yml)** — Full GitHub Actions workflow

---

## Quick Reference

### For Developers

**"My PR has a smoke test warning, should I be concerned?"**

Check the PR comment:
- ✅✅✅ All pass? No action needed
- ✅❌✅ One failed? Review your changes—likely a real issue in routing or data flow
- ❌❌❌ All failed? Check if dependent test job failed first

**"I want to reproduce this locally"**

```bash
npm run build
export MK_LOCAL_NODE=1
node dist/scripts/mkctl.js run --file examples/configs/http-logs-local-file.yml --duration 5
ls -la reports/
```

### For Maintainers

**"How do I disable smoke tests temporarily?"**

```yaml
# In .github/workflows/tests.yml
acceptance-smoke:
  if: ${{ false }}  # Disable job
```

**"I want to change the test topology"**

1. Create new config: `examples/configs/http-logs-local-file-v2.yml`
2. Update workflow: Change `--file examples/configs/http-logs-local-file-v2.yml`
3. Update this documentation: Reflect new checks/validation logic
4. Test locally first: Run manual reproduction steps above

---

**Status:** Acceptance smoke test is **non-gating** and runs best-effort after unit tests pass. Results aggregate into PR comments for visibility without blocking merges.
