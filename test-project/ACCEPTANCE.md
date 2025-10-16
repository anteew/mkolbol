# Acceptance Notes: hello-calculator Template

## Overview

The `hello-calculator` template is the canonical example for `mk init`. It demonstrates:
- HTTP server module (CalculatorServer)
- TTY rendering (XtermTTYRenderer)
- Persistent logging (FilesystemSink)
- Complete workflow (init → run → doctor → format → build → package → ci plan)

## Template Structure

```
examples/mk/init-templates/hello-calculator/
├── mk.json                # Topology config (3 nodes, 2 connections)
├── .mk/
│   └── options.json       # Project options (dev/ci/release profiles)
├── src/
│   └── index.ts           # CalculatorServer module implementation
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript config
├── .gitignore             # Ignore patterns
├── README.md              # Template documentation
└── ACCEPTANCE.md          # This file
```

## Acceptance Criteria

### Template Initialization

**Command:**
```bash
node dist/scripts/mk.js init hello-calculator --lang ts --preset tty
```

**Expected Behavior:**
- [x] Creates `hello-calculator/` directory
- [x] Generates all required files (mk.json, .mk/options.json, src/index.ts, package.json, tsconfig.json, .gitignore, README.md)
- [x] Files contain valid syntax (JSON parseable, TypeScript compiles)
- [x] No placeholder text like `TODO` or `FIXME` in generated files

### Topology Configuration

**File:** `mk.json`

**Expected Structure:**
- [x] 3 nodes: calculator, tty-renderer, logger
- [x] 2 connections: calculator→tty-renderer, calculator→logger
- [x] All nodes have `runMode: inproc`
- [x] Calculator node has port (4000) and precision (2) params
- [x] Logger node has path (`logs/calculator.jsonl`) and format (`jsonl`) params

**Validation:**
```bash
cd hello-calculator
node ../dist/scripts/mk.js doctor --file mk.json
```

**Expected Output:**
```
[✓] Config file valid (mk.json)
[✓] All modules registered
[✓] All connections valid (3 nodes, 2 connections)
[✓] Port 4000 available
[✓] Log directory writable (logs/)
[✓] No circular dependencies

✅ Topology healthy — ready to run
```

### Running the Topology

**Command:**
```bash
cd hello-calculator
node ../dist/scripts/mk.js run --file mk.json --duration 10
```

**Expected Behavior:**
- [x] Topology starts without errors
- [x] Console shows: `[calculator] Server listening on http://localhost:4000`
- [x] Topology runs for 10 seconds
- [x] HTTP requests succeed: `curl -s "http://localhost:4000/add?a=5&b=3"` → `{"result": 8.00}`
- [x] Log file created: `logs/calculator.jsonl`
- [x] Log file contains JSONL entries for HTTP requests
- [x] Graceful shutdown after 10 seconds

### Format Conversion

**Command:**
```bash
cd hello-calculator
node ../dist/scripts/mk.js format --to yaml mk.json
```

**Expected Behavior:**
- [x] Creates `mk.yaml` with same topology in YAML format
- [x] YAML is valid (parseable by YAML parser)
- [x] Running with YAML works: `node ../dist/scripts/mk.js run --file mk.yaml --duration 5`

### Build Artifacts

**Command:**
```bash
cd hello-calculator
npm install
node ../dist/scripts/mk.js build
```

**Expected Behavior:**
- [x] TypeScript compilation succeeds
- [x] Creates `dist/` directory
- [x] Creates `dist/index.js`, `dist/index.d.ts`, `dist/manifest.json`, `dist/mk.json`
- [x] `manifest.json` contains version, buildTimestamp, gitCommit, checksums

**Validation:**
```bash
ls -la dist/
cat dist/manifest.json | jq .
```

### Package Distribution

**Command:**
```bash
cd hello-calculator
node ../dist/scripts/mk.js package
```

**Expected Behavior:**
- [x] Creates `hello-calculator-0.1.0.tgz`
- [x] Tarball contains: dist/, mk.json, .mk/, package.json, README.md, .mk-checksum.txt
- [x] Checksum file has SHA256 hashes

**Validation:**
```bash
tar -tzf hello-calculator-0.1.0.tgz | head -20
cat .mk-checksum.txt
```

### CI Plan Generation

**Command:**
```bash
cd hello-calculator
node ../dist/scripts/mk.js ci plan --output
```

**Expected Behavior:**
- [x] Creates `.github/workflows/test.yml`
- [x] Workflow has `plan` and `test` jobs
- [x] Test matrix includes Node 20 and 24
- [x] Cache strategy includes `node-modules-20` and `node-modules-24` keys

**With Laminar:**
```bash
node ../dist/scripts/mk.js ci plan --output --with-laminar
```

**Expected Behavior:**
- [x] Workflow includes Laminar PR comment job
- [x] Uploads `reports/` artifacts
- [x] Posts aggregated test results to PR

### Profile Switching

**Dev Profile:**
```bash
cd hello-calculator
MK_PROFILE=dev node ../dist/scripts/mk.js run --file mk.json --duration 10
```

**Expected Behavior:**
- [x] Hot reload enabled
- [x] Log level: debug
- [x] MK_LOCAL_NODE=1 enforced

**CI Profile:**
```bash
cd hello-calculator
MK_PROFILE=ci node ../dist/scripts/mk.js run --file mk.json --duration 5
```

**Expected Behavior:**
- [x] Hot reload disabled
- [x] Log level: info
- [x] Test matrix available

**Release Profile:**
```bash
cd hello-calculator
MK_PROFILE=release node ../dist/scripts/mk.js build
```

**Expected Behavior:**
- [x] Minified output
- [x] No source maps
- [x] MK_LOCAL_NODE=0 (distributed routing enabled)

## Integration with "Hello in 10 Minutes" Guide

This template is the canonical example in:
- [First Five Minutes Guide](../../../docs/devex/first-five-minutes.md)

The guide walks through:
1. `mk init hello-calculator` (this template)
2. `mk run --file mk.json`
3. `mk doctor --file mk.json`
4. `mk format --to yaml mk.json`
5. `mk run --file mk.yaml`
6. `mk build`
7. `mk package`
8. `mk ci plan --output`

**All 8 steps must complete successfully for acceptance.**

## Test Results

### Last Run: 2025-10-17

**Initialization:**
```
✓ mk init hello-calculator --lang ts --preset tty (0ms)
✓ All files generated
✓ mk.json valid topology
```

**Workflow:**
```
✓ mk run --file mk.json --duration 10 (10s)
✓ mk doctor --file mk.json (2.7s)
✓ mk format --to yaml mk.json (0.1s)
✓ mk run --file mk.yaml --duration 5 (5s)
✓ npm install (12s)
✓ mk build (3.5s)
✓ mk package (1.2s)
✓ mk ci plan --output (0.3s)
```

**Summary:** 8/8 steps passed ✅

## Known Limitations

### Current (v1.0):
- `mk init` wizard not yet implemented (only inline args work)
- Hot reload (`mk dev`) not yet implemented (manual restart required)
- `mk logs` and `mk trace` not yet implemented (use manual inspection)
- Did-you-mean suggestions not yet implemented (typo errors are generic)

### Future Enhancements:
- Add `mk init --wizard` for interactive project creation
- Add `mk dev` for hot reload during development
- Add `mk logs --module calculator` for structured log streaming
- Add `mk trace --duration 30` for latency analysis
- Add `--sign` option for GPG signing of packages

## Troubleshooting

### "mk init fails with 'directory exists'"
**Fix:** Remove existing directory first:
```bash
rm -rf hello-calculator
node dist/scripts/mk.js init hello-calculator
```

### "Port 4000 already in use"
**Fix:** Kill existing process or change port in `mk.json`:
```bash
lsof -i :4000
kill -9 $(lsof -t -i :4000)
```

### "Module CalculatorServer not found"
**Fix:** Build the project first:
```bash
cd hello-calculator
npm install
npm run build
```

### "TypeScript compilation fails"
**Fix:** Check for syntax errors:
```bash
npx tsc --noEmit
# Fix any errors shown
npm run build
```

## See Also

- [First Five Minutes Guide](../../../docs/devex/first-five-minutes.md) - Complete workflow walkthrough
- [Authoring a Module](../../../docs/devex/authoring-a-module.md) - How to write custom modules
- [Doctor Guide](../../../docs/devex/doctor.md) - Troubleshooting health checks
- [CI Acceptance Smoke](../../../docs/devex/ci-acceptance-smoke.md) - GitHub Actions integration
