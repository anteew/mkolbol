# Consumer Acceptance: Running the Fixture App Locally

This guide explains how to run the mkolbol consumer acceptance test fixture on your machine. It's the best way to verify that mkolbol works end-to-end after installation.

## What is the Fixture App?

The **fixture app** is a minimal mkolbol topology that:
- Loads from a YAML configuration
- Runs a `TimerSource` module (emits messages every 500ms)
- Writes output to `FilesystemSink` in JSONL format
- Completes successfully if output file is created

**Use this to verify:**
- mkolbol installed correctly
- Modules are loadable and executable
- File I/O works as expected
- Basic topology lifecycle functions

---

## Quick Start: 5 Minutes

### 1. Navigate to fixture directory

```bash
cd tests/consumer/fixture-app
```

### 2. Install dependencies

```bash
npm install
```

This installs mkolbol using the tarball reference in `package.json`.

### 3. Run the test

```bash
npm test
```

**Expected output:**
```
[Consumer Test] Starting topology test...
[Consumer Test] Loading topology...
[Consumer Test] Starting topology...
[Consumer Test] Running topology for 2 seconds...
[Consumer Test] ✅ SUCCESS: Generated 4 events
[Consumer Test] Sample event: {"ts":"2025-10-16T12:34:56.789Z","data":"tick"}...
[Consumer Test] Test completed successfully
```

**Exit code:** `0` (success)

### 4. Verify output

```bash
cat test-output.jsonl | jq '.'
```

**Expected output (JSON objects, one per line):**
```json
{"ts":"2025-10-16T12:34:56.789Z","data":"tick"}
{"ts":"2025-10-16T12:34:57.289Z","data":"tick"}
{"ts":"2025-10-16T12:34:57.789Z","data":"tick"}
{"ts":"2025-10-16T12:34:58.289Z","data":"tick"}
```

---

## Understanding the Test

### File Structure

```
tests/consumer/fixture-app/
├── package.json        # Project config with mkolbol tarball reference
├── topology.yml        # YAML topology definition
├── test-run.js         # Test runner script (CLI entry point)
└── test-output.jsonl   # Output file (created during test)
```

### The Topology (topology.yml)

```yaml
nodes:
  - id: timer
    module: TimerSource
    params:
      periodMs: 500

  - id: filesink
    module: FilesystemSink
    params:
      path: test-output.jsonl
      format: jsonl
      mode: append

connections:
  - from: timer.output
    to: filesink.input
```

**What it does:**
1. `TimerSource` emits "tick" every 500ms (configurable)
2. Data flows to `FilesystemSink`
3. Output written as JSONL (JSON Lines format with timestamps)

### The Test Script (test-run.js)

```javascript
// Simplified flow:
1. Clean up previous output file
2. Load topology.yml from disk
3. Create Executor instance
4. Parse YAML and start topology
5. Wait 2 seconds for events
6. Check if output file exists and has content
7. Print results and exit with appropriate code
```

---

## Installation Variations

The fixture app uses different installation methods to demonstrate each path.

### Current Method: Tarball (via package.json)

**package.json:**
```json
{
  "dependencies": {
    "mkolbol": "file:../../../mkolbol-0.2.0-rfc.tgz"
  }
}
```

**Run:**
```bash
npm install
npm test
```

### Alternative: Git Tag

Edit `package.json` to pin a git tag:

```json
{
  "dependencies": {
    "mkolbol": "github:anteew/Laminar#v0.2.0"
  }
}
```

Then:
```bash
npm install
npm test
```

### Alternative: Vendor/Monorepo

Edit `package.json` to reference a monorepo workspace:

```json
{
  "dependencies": {
    "mkolbol": "file:../../../"
  }
}
```

Or with workspaces:
```json
{
  "dependencies": {
    "mkolbol": "workspace:*"
  }
}
```

Then:
```bash
npm install
npm test
```

---

## Troubleshooting

### "npm ERR! Cannot find module 'mkolbol'"

**Problem:** Dependency not installed or tarball path wrong.

**Solution:**
```bash
# Verify tarball exists
ls -la ../../../mkolbol-*.tgz

# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Error: Cannot find module 'mkolbol'"

**Problem:** mkolbol installed but can't be imported.

**Solution:**
```bash
# Check installation
ls node_modules/mkolbol/

# If missing, rebuild
npm run build --prefix ../../..
npm install
```

### "FAIL: Output file was not created"

**Problem:** Topology ran but didn't write output.

**Diagnosis:**
```bash
# Check FilesystemSink module exists
node -e "import('mkolbol').then(m => console.log(Object.keys(m)))"

# Manually run topology with logging
node test-run.js 2>&1 | grep -i error
```

**Solution:**
```bash
# Verify topology.yml syntax
python3 -m yaml topology.yml

# Check file permissions in current directory
ls -la .

# Ensure FilesystemSink module is exported
npm test -- --verbose
```

### "FAIL: Output file is empty"

**Problem:** Topology ran but generated no events.

**Solution:**
```bash
# Increase test duration (in test-run.js, line 35)
await new Promise(resolve => setTimeout(resolve, 5000));  // was 2000

# Check timer period in topology.yml
# Increase periodMs if events are sparse

# Verify TimerSource module
node -e "import('mkolbol').then(m => console.log(m.TimerSource))"
```

### Build fails: "Module not found: tsc"

**Problem:** TypeScript not built or dist directory missing.

**Solution:**
```bash
# Build mkolbol first
cd ../../..
npm install
npm run build

# Then return and reinstall
cd tests/consumer/fixture-app
npm install
npm test
```

---

## Manual Test Flow (Debugging)

If `npm test` fails, try running steps manually:

```bash
# Step 1: Check Node version
node --version  # Should be v18+

# Step 2: Verify mkolbol installation
ls node_modules/mkolbol/dist/src/index.js

# Step 3: Load mkolbol
node -e "import('mkolbol').then(m => console.log('✓ mkolbol loaded'))"

# Step 4: Load test script
node test-run.js

# Step 5: Check output
cat test-output.jsonl | head -5
```

---

## Verifying Successful Installation

After running the test, confirm:

| Check | Command | Expected |
|-------|---------|----------|
| Test exit code | `npm test; echo $?` | `0` |
| Output file exists | `ls test-output.jsonl` | File listed |
| Output is valid JSON | `cat test-output.jsonl \| jq .` | Pretty-printed JSON |
| Event count | `cat test-output.jsonl \| wc -l` | `>= 3` |
| Has timestamps | `cat test-output.jsonl \| jq -r '.ts'` | ISO 8601 dates |
| Has data field | `cat test-output.jsonl \| jq '.data'` | "tick" strings |

---

## Next Steps After Success

✅ **Consumer acceptance passed!** Your mkolbol installation is working.

- **Try the Hello Calculator:** [docs/devex/hello-calculator.md](../../docs/devex/hello-calculator.md)
- **Learn mkctl commands:** [docs/devex/mkctl-cookbook.md](../../docs/devex/mkctl-cookbook.md)
- **Explore distribution methods:** [docs/devex/distribution.md](../../docs/devex/distribution.md)
- **Build custom modules:** [docs/devex/authoring-a-module.md](../../docs/devex/authoring-a-module.md)

---

## Test Artifact Files

After running the test, you'll see:

```
tests/consumer/fixture-app/
├── node_modules/          # Installed dependencies (including mkolbol)
├── package-lock.json      # Locked dependency versions
└── test-output.jsonl      # Generated test output (JSONL format)
```

**Cleaning up:**
```bash
npm test              # Test auto-cleans output before each run
rm -rf node_modules   # Clean dependencies if needed
```

---

## CI/CD Integration

This fixture app can be used in CI/CD pipelines:

```bash
#!/bin/bash
set -e

cd tests/consumer/fixture-app
npm install
npm test

echo "Consumer acceptance passed ✅"
```

**GitHub Actions example:**
```yaml
- name: Consumer acceptance test
  run: |
    cd tests/consumer/fixture-app
    npm install
    npm test
```

**Exit codes:**
- `0` - Test passed
- `1` - Test failed

---

## Advanced: Custom Topology Testing

To test a different topology, modify `topology.yml`:

```yaml
# Example: Add a transform
nodes:
  - id: timer
    module: TimerSource
    params:
      periodMs: 500

  - id: uppercase
    module: UppercaseTransform

  - id: filesink
    module: FilesystemSink
    params:
      path: test-output.jsonl
      format: jsonl

connections:
  - from: timer.output
    to: uppercase.input
  - from: uppercase.output
    to: filesink.input
```

Then run:
```bash
npm test
```

The test script will use the new topology automatically.

---

## Further Reading

- **[mkctl Cookbook](../../docs/devex/mkctl-cookbook.md)** - Common commands and patterns
- **[Hello Calculator Tutorial](../../docs/devex/hello-calculator.md)** - Build your first app
- **[Distribution Matrix](../../docs/devex/distribution.md)** - Compare installation methods
- **[Using mkolbol in Your Repo](../../docs/devex/using-mkolbol-in-your-repo.md)** - Integration guide
