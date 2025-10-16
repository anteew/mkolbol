# Hello in 10 Minutes: Complete mk Workflow

**From zero to packaged topology in 10 minutes.**

Welcome to mkolbol! This guide shows you the complete developer workflow from project initialization to CI-ready distribution. Follow along step-by-step to see the full mk orchestrator lifecycle.

⏱️ **Total time: 10 minutes**

---

## What You'll Build

By the end of this guide, you'll have:
- ✅ A working mkolbol project (hello-calculator topology)
- ✅ Validated configuration with `mk doctor`
- ✅ Both JSON and YAML workflow experience
- ✅ Distributable `.tgz` package with provenance
- ✅ Production-ready GitHub Actions CI config

**The mk workflow chain:**
```
mk init → mk run → mk doctor → mk format → mk run --yaml → mk build → mk package → mk ci plan
```

---

## Prerequisites (30 seconds)

```bash
# Clone and build mkolbol
git clone https://github.com/anteew/mkolbol.git
cd mkolbol
npm install
npm run build

# Set Local Node mode
export MK_LOCAL_NODE=1
```

---

## 1. Initialize Project (1 minute)

Create a new mkolbol project with the hello-calculator template:

```bash
# Interactive mode (wizard asks 3 questions)
node dist/scripts/mk.js init

# Or specify everything inline
node dist/scripts/mk.js init hello-calculator --lang ts --preset tty
```

**What happens:**
1. Creates `hello-calculator/` directory
2. Generates `mk.json` with 3-node topology (CalculatorServer → XtermTTYRenderer → FilesystemSink)
3. Creates `.mk/options.json` with dev/ci/release profiles
4. Scaffolds `src/index.ts` with module stubs
5. Adds `package.json`, `.gitignore`, `README.md`

**Verify it worked:**
```bash
cd hello-calculator
ls -la
# You should see: mk.json, .mk/, src/, package.json, README.md
```

---

## 2. Run the Topology (1 minute)

Test the default topology to verify everything works:

```bash
# Run for 10 seconds
node ../dist/scripts/mk.js run --file mk.json --duration 10
```

**Expected output:**
```
[mk] Running in Local Node mode (MK_LOCAL_NODE=1): network features disabled.
[mk] Loading config from: mk.json
[mk] Bringing topology up...
[mk] Topology running for 10 seconds...

[calculator] Server listening on http://localhost:4000
[calculator] GET /add?a=5&b=3 → 8.00
```

**What's happening:**
1. CalculatorServer starts on port 4000
2. XtermTTYRenderer displays live output
3. FilesystemSink logs to `logs/calculator.jsonl`

**Test it:**
```bash
# In another terminal
curl -s "http://localhost:4000/add?a=5&b=3"
# → {"result": 8.00}
```

---

## 3. Validate with Doctor (1 minute)

Run health checks to catch common issues before deployment:

```bash
node ../dist/scripts/mk.js doctor --file mk.json
```

**Expected output:**
```
[✓] Config file valid (mk.json)
[✓] All modules registered (CalculatorServer, XtermTTYRenderer, FilesystemSink)
[✓] All connections valid (3 nodes, 2 connections)
[✓] Port 4000 available
[✓] Log directory writable (logs/)
[✓] No circular dependencies
[✓] Memory limits reasonable (<512MB per node)

✅ Topology healthy — ready to run
```

**What doctor checks:**
- Config syntax and schema validation
- Module existence in registry
- Port conflicts
- File permissions (log directories, config writes)
- Circular dependency detection
- Resource limits

**If you see errors:**
```bash
# Dry-run to see what would happen
node ../dist/scripts/mk.js doctor --file mk.json --dry-run

# Check specific module
node ../dist/scripts/mk.js doctor --file mk.json --module calculator
```

See [Doctor Guide](./doctor.md) for complete troubleshooting.

---

## 4. Convert to YAML (1 minute)

Switch to YAML authoring for more readable configs:

```bash
node ../dist/scripts/mk.js format --to yaml mk.json
```

**Creates `mk.yaml`:**
```yaml
nodes:
  - id: calculator
    module: CalculatorServer
    runMode: inproc
    params:
      port: 4000
      precision: 2

  - id: tty-renderer
    module: XtermTTYRenderer
    runMode: inproc

  - id: logger
    module: FilesystemSink
    runMode: inproc
    params:
      path: logs/calculator.jsonl
      format: jsonl

connections:
  - from: calculator.output
    to: tty-renderer.input
  - from: calculator.output
    to: logger.input
```

**Run with YAML:**
```bash
node ../dist/scripts/mk.js run --file mk.yaml --duration 10
```

**Why YAML?**
- More concise (no quotes on most values)
- Comments supported (`# This is a comment`)
- Multi-line strings easier
- Industry standard for config

**Switch back anytime:**
```bash
node ../dist/scripts/mk.js format --to json mk.yaml
```

---

## 5. Build Artifacts (1 minute)

Compile TypeScript modules and prepare for distribution:

```bash
node ../dist/scripts/mk.js build
```

**What happens:**
1. Compiles `src/index.ts` → `dist/index.js`
2. Bundles dependencies (if configured)
3. Generates `dist/manifest.json` with provenance:
   ```json
   {
     "version": "0.1.0",
     "buildTimestamp": "2025-10-17T04:15:23.456Z",
     "gitCommit": "abc1234",
     "gitBranch": "main",
     "modules": ["CalculatorServer"],
     "checksums": { "dist/index.js": "sha256:..." }
   }
   ```
4. Creates `dist/mk.json` (normalized config)

**Verify:**
```bash
ls -la dist/
# dist/index.js, dist/manifest.json, dist/mk.json
```

**Build targets:**
```bash
# Production build (minified)
node ../dist/scripts/mk.js build --target production

# Development build (source maps)
node ../dist/scripts/mk.js build --target development
```

---

## 6. Package for Distribution (1 minute)

Create a distributable tarball with checksums and signatures:

```bash
node ../dist/scripts/mk.js package
```

**Output: `hello-calculator-0.1.0.tgz`**

**What's included:**
```
hello-calculator-0.1.0.tgz
├── dist/                 # Compiled artifacts
├── mk.json              # Topology config
├── .mk/                 # Project options
├── package.json         # Dependencies
├── README.md            # Documentation
└── .mk-checksum.txt     # SHA256 checksums
```

**Install the package elsewhere:**
```bash
# Copy to another machine
scp hello-calculator-0.1.0.tgz remote:/tmp/

# Install and run
cd /tmp
tar -xzf hello-calculator-0.1.0.tgz
cd hello-calculator
npm install
node ../dist/scripts/mk.js run --file mk.json
```

**Package options:**
```bash
# Sign with GPG
node ../dist/scripts/mk.js package --sign

# Include source maps
node ../dist/scripts/mk.js package --with-sourcemaps
```

---

## 7. Generate CI Config (1 minute)

Create production-ready GitHub Actions workflow:

```bash
node ../dist/scripts/mk.js ci plan --output
```

**Creates `.github/workflows/test.yml`:**
```yaml
name: Tests

on: [push, pull_request]

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
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: ${{ fromJson(needs.plan.outputs.matrix-node) }}
        lane: ${{ fromJson(needs.plan.outputs.matrix-lane) }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}

      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: node_modules
          key: node-modules-${{ matrix.node }}-${{ hashFiles('package-lock.json') }}

      - run: npm ci
      - run: npm run build
      - run: npm run test:${{ matrix.lane }}
```

**With Laminar integration:**
```bash
node ../dist/scripts/mk.js ci plan --output --with-laminar
```

Adds Laminar test observability (see [CI Acceptance Smoke](./ci-acceptance-smoke.md#mk-ci-plan-command)).

**Test locally:**
```bash
# Generate plan JSON
node ../dist/scripts/mk.js ci plan

# Source as environment variables
eval "$(node ../dist/scripts/mk.js ci plan --env)"
echo $MATRIX_NODE  # ["20", "24"]
```

---

## 8. What's Next? (2 min)

**You just completed the full mk workflow!** Here's where to go from here:

### Immediate Next Steps

| If you want to... | Go here... |
|-------------------|-----------|
| **Iterate faster with hot reload** | [mk dev, logs, trace Guide](./mk-dev-logs-trace.md) - Development ergonomics |
| **Write custom modules** | [Authoring a Module](./authoring-a-module.md) - Complete guide with test patterns |
| **Understand architecture** | [Early Adopter Guide](./early-adopter-guide.md) - Core concepts and mental models |
| **Use curated patterns** | [Recipes](./recipes.md) - 9 copy-paste topologies for common use cases |
| **Troubleshoot issues** | [Doctor Guide](./doctor.md) - Common errors and fixes |

### Production Workflows

- **[CI Acceptance Smoke](./ci-acceptance-smoke.md)** - GitHub Actions integration with Laminar
- **[Distribution Matrix](./distribution.md)** - Install paths (tarball, git tag, vendor)
- **[Wiring and Testing Guide](./wiring-and-tests.md)** - Configure custom topologies, I/O modes
- **[Laminar Workflow](./laminar-workflow.md)** - Test observability and debugging

### Architecture Deep Dives

- **[Stream Kernel RFC](../rfcs/stream-kernel/00-index.md)** - Complete architecture documentation
- **[RoutingServer RFC](../rfcs/stream-kernel/05-router.md)** - Endpoint discovery and routing

---

## 9. Troubleshooting (1 min)

### Common Issues

| Error | Cause | Fix |
|-------|-------|-----|
| **mk: command not found** | Script not built or wrong path | Run: `npm run build` from mkolbol repo root |
| **Config file not found** | Wrong relative path | Use `../dist/scripts/mk.js` from project directory |
| **Port already in use** | Another process on port 4000 | Check: `lsof -i :4000` and kill process |
| **Module not registered** | Module name typo in mk.json | Run: `node ../dist/scripts/mk.js doctor --file mk.json` |
| **Permission denied (logs/)** | Log directory not writable | Run: `mkdir -p logs && chmod 755 logs` |

### Quick Fixes

**"mk init fails"**
```bash
# Check if directory already exists
ls -la hello-calculator/

# Remove and retry
rm -rf hello-calculator
node dist/scripts/mk.js init hello-calculator
```

**"mk build fails"**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Install missing dependencies
npm install

# Try verbose mode
node ../dist/scripts/mk.js build --verbose
```

**"mk package fails"**
```bash
# Build first
node ../dist/scripts/mk.js build

# Check dist/ exists
ls -la dist/

# Retry package
node ../dist/scripts/mk.js package
```

### Get Help

- **[Doctor Guide](./doctor.md)** - Complete troubleshooting reference
- **[GitHub Issues](https://github.com/anteew/mkolbol/issues)** - Report bugs
- **[GitHub Discussions](https://github.com/anteew/mkolbol/discussions)** - Ask questions

---

## Quick Reference Card

**Complete workflow (from mkolbol repo):**
```bash
# Initialize project
node dist/scripts/mk.js init hello-calculator --lang ts --preset tty
cd hello-calculator

# Run topology
node ../dist/scripts/mk.js run --file mk.json --duration 10

# Validate health
node ../dist/scripts/mk.js doctor --file mk.json

# Convert to YAML
node ../dist/scripts/mk.js format --to yaml mk.json

# Run with YAML
node ../dist/scripts/mk.js run --file mk.yaml --duration 10

# Build artifacts
node ../dist/scripts/mk.js build

# Package for distribution
node ../dist/scripts/mk.js package

# Generate CI config
node ../dist/scripts/mk.js ci plan --output
```

**Common flags:**
```bash
--file <path>          # Config file (mk.json or mk.yaml)
--duration <seconds>   # How long to run topology
--dry-run              # Validate without executing
--verbose              # Show detailed output
--json                 # Machine-readable output
```

---

**That's it!** You've completed the full mk orchestrator workflow from zero to CI-ready package.

**Time spent:** 10 minutes ⏱️

**What you learned:**
- ✅ Initialize mkolbol projects with `mk init`
- ✅ Run and validate topologies with `mk run` and `mk doctor`
- ✅ Convert configs between JSON and YAML with `mk format`
- ✅ Build distributable artifacts with `mk build` and `mk package`
- ✅ Generate production-ready CI config with `mk ci plan`
- ✅ Complete end-to-end workflow for deployment

**Ready to iterate faster?** Head to the [mk dev, logs, trace Guide](./mk-dev-logs-trace.md) for hot reload and debugging tools.
