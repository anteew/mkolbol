# Laminar Development Workflow

**Self-service test observability for debugging failures with ROI-friendly logs**

## What is Laminar?

Laminar is a test observability tool that captures structured test execution events in JSONL format. It helps you:

- **Debug failures faster** - Structured logs with full context (stdout/stderr, assertions, errors)
- **Track trends** - Identify recurring failures and flakes across runs
- **Self-service** - No private npm publish required, install directly from GitHub
- **CI-ready** - Integrate without breaking builds on test flakes

Laminar transforms chaotic test output into queryable, analyzable artifacts that you can grep, slice, and share.

## Installation

### GitHub Dependency Install (No npm Publish Required)

Install Laminar directly from GitHub as a dev dependency:

```bash
# In your project directory
npm install --save-dev github:anteew/Laminar

# Or add to package.json devDependencies:
{
  "devDependencies": {
    "@agent_vega/laminar": "github:anteew/Laminar"
  }
}
```

**No private npm registry needed.** This approach works for:

- Local development
- CI/CD pipelines (GitHub Actions, GitLab CI, etc.)
- Team collaboration without publishing infrastructure

### Verify Installation

```bash
# Check that lam CLI is available
npx @agent_vega/laminar --help

# Or create an npm script alias (recommended)
# Add to package.json:
{
  "scripts": {
    "lam": "node node_modules/@agent_vega/laminar/dist/scripts/lam.js"
  }
}

# Then use:
npm run lam -- --help
```

## Local Development Workflow

### 1. Configure Vitest Reporter

Update your `vitest.config.ts` or test script to use Laminar's JSONL reporter:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: [
      'default', // Keep console output
      './node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js',
    ],
    // ... other config
  },
});
```

Or run directly via CLI:

```bash
npx vitest run \
  --reporter=default \
  --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js
```

### 2. Run Tests with Laminar

```bash
# Run all tests (generates reports/ artifacts)
npm test

# Or if you have a dedicated script:
npm run test:ci  # For thread-based tests
npm run test:pty # For fork-based tests (if applicable)
```

**What happens:**

- Tests execute normally with console output
- Laminar reporter writes structured events to `reports/` directory
- Each test case gets its own `.jsonl` file with full execution trace
- Summary written to `reports/summary.jsonl`

### 3. View Summary Output

After tests complete, view the summary:

```bash
npm run lam -- summary
```

**Example output:**

```
Test Summary (42 tests):
✓ 38 passed
✗ 3 failed
⊘ 1 skipped

Failed tests:
  kernel.spec/connect_moves_data_1_1 (124ms) - AssertionError: expected 5 to equal 6
  executor.spec/should_throw_on_invalid_config (89ms) - Error: Invalid config
  hostess.spec/evicts_after_missed_heartbeats (234ms) - Timeout exceeded
```

Save summary to file:

```bash
npm run lam -- summary > reports/LAMINAR_SUMMARY.txt
```

### 4. Analyze Trends

Identify recurring failures and top offenders:

```bash
# Show top 10 most frequent failure patterns
npm run lam -- trends --top 10
```

**Example output:**

```
Top Failure Trends (last 100 runs):

1. AssertionError: expected X to equal Y (12 occurrences)
   - kernel.spec/connect_moves_data_1_1 (8x)
   - pipes.spec/backpressure_handling (4x)

2. Timeout exceeded (5 occurrences)
   - hostess.spec/evicts_after_missed_heartbeats (5x)

3. Error: Invalid config (3 occurrences)
   - executor.spec/should_throw_on_invalid_config (3x)
```

Filter by date range:

```bash
npm run lam -- trends --top 10 --since 2025-10-01
```

Save trends to file:

```bash
npm run lam -- trends --top 10 > reports/LAMINAR_TRENDS.txt
```

### 5. Deep Dive into Failures

Show detailed logs for a specific test case:

```bash
# Show full event log for a failing test
npm run lam -- show --case kernel.spec/connect_moves_data_1_1

# Show context around assertion failures
npm run lam -- show --case kernel.spec/connect_moves_data_1_1 --around assert.fail --window 10

# Show all error-level events
npm run lam -- show --case kernel.spec/connect_moves_data_1_1 --filter level=error
```

Generate failure digest (structured analysis):

```bash
# Generate digests for all failures
npm run lam -- digest

# Generate digest for specific test
npm run lam -- digest --cases kernel.spec/connect_moves_data_1_1
```

Get reproduction commands:

```bash
# Show commands to reproduce failures
npm run lam -- repro

# Example output:
# To reproduce kernel.spec/connect_moves_data_1_1:
#   npx vitest run tests/kernel.spec.ts -t "connect moves data 1-1"
#   npm run logq -- case=kernel.spec/connect_moves_data_1_1 reports/kernel.spec/connect_moves_data_1_1.jsonl
```

## Understanding Artifacts

### Directory Structure

After running tests, Laminar creates:

```
reports/
├── summary.jsonl                 # Aggregate results for all tests
├── index.json                    # Manifest of all artifacts
├── kernel.spec/
│   ├── connect_moves_data_1_1.jsonl
│   ├── merge_combines_sources.jsonl
│   └── split_fans_out.jsonl
├── executor.spec/
│   ├── should_load_configuration.jsonl
│   └── should_throw_on_invalid_config.jsonl
└── hostess.spec/
    ├── registers_and_queries.jsonl
    └── evicts_after_missed_heartbeats.jsonl
```

### File Formats

#### 1. summary.jsonl

One-line JSON per test with status and metadata:

```jsonl
{"type":"environment","nodeVersion":"v20.11.0","platform":"linux","arch":"x64"}
{"status":"pass","duration":124,"location":"tests/kernel.spec.ts:42","artifactURI":"reports/kernel.spec/connect_moves_data_1_1.jsonl"}
{"status":"fail","duration":89,"location":"tests/executor.spec.ts:78","artifactURI":"reports/executor.spec/should_throw_on_invalid_config.jsonl","error":"Invalid config"}
```

Fields:

- `status`: "pass" | "fail" | "skip"
- `duration`: milliseconds
- `location`: file path and line number
- `artifactURI`: path to detailed `.jsonl` log
- `error`: error message (if failed)

#### 2. Per-Case .jsonl Files

Structured event stream for each test case:

```jsonl
{"ts":1697123456789,"lvl":"info","case":"kernel.spec/connect_moves_data_1_1","phase":"setup","evt":"case.begin","payload":{}}
{"ts":1697123456790,"lvl":"debug","case":"kernel.spec/connect_moves_data_1_1","phase":"run","evt":"kernel.create","payload":{"nodeId":"test-kernel"}}
{"ts":1697123456795,"lvl":"info","case":"kernel.spec/connect_moves_data_1_1","phase":"run","evt":"pipe.write","payload":{"data":"test message"}}
{"ts":1697123456800,"lvl":"error","case":"kernel.spec/connect_moves_data_1_1","phase":"run","evt":"assert.fail","payload":{"expected":6,"actual":5}}
{"ts":1697123456801,"lvl":"info","case":"kernel.spec/connect_moves_data_1_1","phase":"teardown","evt":"case.end","payload":{"status":"fail","duration":124}}
```

Fields:

- `ts`: timestamp (milliseconds since epoch)
- `lvl`: log level (debug, info, warn, error)
- `case`: test case identifier
- `phase`: setup | run | teardown
- `evt`: event type (case.begin, assert.fail, test.error, etc.)
- `payload`: event-specific data

#### 3. index.json

Manifest for all artifacts with deterministic ordering:

```json
{
  "summary": "reports/summary.jsonl",
  "cases": [
    {
      "caseName": "kernel.spec/connect_moves_data_1_1",
      "artifactPath": "reports/kernel.spec/connect_moves_data_1_1.jsonl",
      "status": "fail",
      "duration": 124
    },
    {
      "caseName": "executor.spec/should_load_configuration",
      "artifactPath": "reports/executor.spec/should_load_configuration.jsonl",
      "status": "pass",
      "duration": 56
    }
  ]
}
```

### Stdout/Stderr Capture

All console output is captured in event payloads:

```jsonl
{"ts":1697123456792,"lvl":"info","case":"kernel.spec/connect_moves_data_1_1","evt":"stdout","payload":{"text":"Creating kernel instance\n"}}
{"ts":1697123456793,"lvl":"warn","case":"kernel.spec/connect_moves_data_1_1","evt":"stderr","payload":{"text":"Warning: deprecated API\n"}}
```

Query stdout/stderr events:

```bash
npm run logq -- evt=stdout reports/kernel.spec/connect_moves_data_1_1.jsonl
npm run logq -- evt=stderr reports/kernel.spec/connect_moves_data_1_1.jsonl
```

## CI Integration

### Sample GitHub Actions Workflow

Add Laminar to your CI without breaking builds on flakes:

```yaml
name: Tests with Laminar

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests with Laminar reporter
        run: |
          mkdir -p reports
          npx vitest run \
            --reporter=default \
            --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js

      # Generate summary/trends (best-effort, don't fail build)
      - name: Generate Laminar summary and trends
        if: always()
        continue-on-error: true
        run: |
          npm run lam -- summary > reports/LAMINAR_SUMMARY.txt || true
          npm run lam -- trends --top 10 > reports/LAMINAR_TRENDS.txt || true

      # Upload artifacts for post-mortem analysis
      - name: Upload Laminar reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: laminar-reports
          path: reports/
          if-no-files-found: warn
```

**Key patterns:**

1. **`if: always()`** - Run summary/upload even if tests fail
2. **`continue-on-error: true`** - Don't fail build if summary generation fails
3. **`|| true`** - Shell-level failure isolation (belt-and-suspenders)
4. **Upload artifacts** - Preserve reports for download and analysis

### Extracting Laminar Data in CI

After CI run completes:

1. **Download artifacts** from GitHub Actions UI:
   - Go to Actions tab → Select workflow run → Scroll to Artifacts section
   - Download `laminar-reports.zip`

2. **Extract locally:**

   ```bash
   unzip laminar-reports.zip -d ci-reports/
   cd ci-reports/
   ```

3. **Analyze failures:**

   ```bash
   # View summary
   cat LAMINAR_SUMMARY.txt

   # View trends
   cat LAMINAR_TRENDS.txt

   # Query specific test
   npm run logq -- case=kernel.spec/connect_moves_data_1_1 kernel.spec/connect_moves_data_1_1.jsonl
   ```

### Sharing Results

**Option 1: CI Artifacts (Recommended)**

- GitHub Actions automatically retains artifacts for 90 days
- Team members download from Actions UI
- No external storage needed

**Option 2: Archive to Cloud Storage**

```yaml
- name: Archive reports to S3
  if: always()
  run: |
    aws s3 sync reports/ s3://my-bucket/test-reports/${{ github.run_id }}/
```

**Option 3: Attach to PR Comments**

```yaml
- name: Post summary to PR
  if: github.event_name == 'pull_request' && always()
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const summary = fs.readFileSync('reports/LAMINAR_SUMMARY.txt', 'utf8');
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `## Test Results\n\`\`\`\n${summary}\n\`\`\``
      });
```

## Troubleshooting

### Common Issues

#### 1. Command not found: lam

**Symptom:**

```
bash: lam: command not found
```

**Solution:**
Use `npx` or npm script:

```bash
# Option 1: npx
npx @agent_vega/laminar --help

# Option 2: npm script (recommended)
# Add to package.json:
{
  "scripts": {
    "lam": "node node_modules/@agent_vega/laminar/dist/scripts/lam.js"
  }
}
npm run lam -- --help
```

#### 2. No reports/ directory created

**Symptom:**
Tests run but no `reports/` directory appears.

**Causes & Solutions:**

1. **Reporter not configured**

   ```bash
   # Verify reporter is in vitest command:
   npx vitest run --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js
   ```

2. **Reporter path incorrect**

   ```bash
   # Check that Laminar is installed:
   ls node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js

   # If missing, reinstall:
   npm install --save-dev github:anteew/Laminar
   ```

3. **Directory permissions**
   ```bash
   # Ensure current directory is writable:
   mkdir -p reports
   ```

#### 3. Empty summary.jsonl

**Symptom:**
`reports/summary.jsonl` exists but is empty or missing test results.

**Solution:**

- Ensure tests actually ran (check console output)
- Verify reporter was active (look for "Laminar reporter" in output)
- Check for errors in test framework initialization

#### 4. Wrong project path in artifacts

**Symptom:**
Artifact paths reference different directory than expected.

**Solution:**
Laminar uses the directory where tests run. Ensure consistent working directory:

```bash
# In CI:
- name: Run tests
  working-directory: ./
  run: npm test
```

### Getting Help

1. **Check Laminar repository:**
   - GitHub: https://github.com/anteew/Laminar
   - Issues: https://github.com/anteew/Laminar/issues

2. **Review existing artifacts:**

   ```bash
   # Check index.json for manifest
   cat reports/index.json | jq .

   # Validate summary format
   cat reports/summary.jsonl | head -5
   ```

3. **Enable debug output:**

   ```bash
   DEBUG=laminar* npm test
   ```

4. **File an issue:**
   - Include `summary.jsonl` snippet
   - Include Laminar version: `npm list @agent_vega/laminar`
   - Include Node version: `node --version`
   - Include test framework: `npm list vitest`

## Next Steps

### Advanced Features

Once comfortable with basic workflow, explore:

1. **Custom digest rules** - Filter and slice logs with precision

   ```bash
   # Configure in laminar.config.json (if using standalone Laminar)
   npm run lam -- rules get
   npm run lam -- rules set --inline '{"budget":{"kb":2}}'
   ```

2. **Repro bundles** - Package failures for sharing

   ```bash
   npm run lam -- repro --bundle
   npm run lam -- repro --bundle --case kernel.spec/connect_moves_data_1_1
   ```

3. **Digest diffs** - Compare failures across runs

   ```bash
   npm run lam -- diff reports/run1.digest.json reports/run2.digest.json
   ```

4. **Flake detection** - Identify non-deterministic tests

   ```bash
   npm run lam -- run --flake-detect --flake-runs 5
   ```

5. **MCP Server integration** - Expose Laminar to AI agents
   ```bash
   npm run lam:mcp
   # Use with Claude Desktop or other MCP clients
   ```

### Redaction Policies

Protect sensitive data in logs:

```javascript
// In laminar.config.json (or equivalent)
{
  "redaction": {
    "secrets": true,  // Auto-redact API keys, tokens, passwords
    "patterns": [
      { "regex": "email=.*@.*\\.com", "replace": "email=REDACTED" },
      { "regex": "token=[A-Za-z0-9]+", "replace": "token=REDACTED" }
    ]
  }
}
```

Laminar includes built-in secret detection for:

- API keys (AWS, Stripe, etc.)
- JWT tokens
- Database connection strings
- Private keys (RSA, SSH)
- Password fields

### Adopter Integration

**For teams adopting mkolbol or similar projects:**

1. **Fork or clone** the repository
2. **Install Laminar** as shown above (no npm publish needed)
3. **Run tests** and review `reports/` artifacts
4. **Integrate into CI** using sample YAML above
5. **Iterate** on test failures with self-service logs

**ROI benefits:**

- Faster debugging (structured logs vs. raw console output)
- Historical trends (identify regressions early)
- Self-service (no need to ask maintainers for logs)
- CI-friendly (doesn't break builds, artifacts auto-upload)

---

**Next:** Explore [Testing Documentation](../testing/laminar.md) for complete API reference and advanced workflows.
