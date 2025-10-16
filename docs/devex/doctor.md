# Doctor Guide: Troubleshooting mkolbol & mkctl

This guide helps diagnose and fix common issues with mkolbol development, mkctl commands, and mkolbol topologies.

## mk doctor — Environment Diagnostics

The `mk doctor` command performs comprehensive environment diagnostics to ensure your mkolbol development environment is correctly configured.

### Usage

```bash
mk doctor [--verbose]
```

### Options

- `--verbose` — Show detailed output (future enhancement)

---

## Common mkctl Errors & Fixes

### Error: "Config file not found"

**Exit code**: `66`

**Symptom**: `Configuration validation failed: Error reading file...`

**Root causes**:
- File path is incorrect or relative
- File doesn't exist at the specified location
- Directory path invalid

**Fix**:
```bash
# Use absolute path
mkctl run --file $(pwd)/examples/configs/http-logs-local.yml --duration 10

# Or verify file exists
ls -la examples/configs/http-logs-local.yml

# Check current directory
pwd
```

---

### Error: "Configuration validation failed"

**Exit code**: `65`

**Symptoms**:
- `"nodes" must be an array`
- `Duplicate node id 'xyz'`
- `Connection from 'X' to non-existent node 'Y'`
- `Unknown module 'XYZ'`

**Root causes**:
- YAML syntax error (indentation, colons, quotes)
- Missing required fields
- Invalid module names
- Duplicate node IDs
- Broken connections

**Fix**:
```bash
# 1. Validate YAML syntax
python3 -m yaml examples/configs/http-logs-local.yml

# 2. Check for common issues
grep -n "^  - id:" examples/configs/http-logs-local.yml  # Count nodes
grep "nodes:\|connections:" examples/configs/http-logs-local.yml

# 3. Test with known-good config
mkctl run --file examples/configs/external-stdio.yaml --dry-run

# 4. Use --dry-run to validate without running
mkctl run --file my-topology.yml --dry-run
```

---

### Error: "Health check failed"

**Exit code**: `70`

**Symptom**: `Health check failed for node 'X' after 3 attempts`

**Root causes**:
- External process doesn't start
- Process doesn't listen on configured port
- Health check URL/command wrong
- Process startup is too slow
- Port already in use

**Fix**:
```bash
# 1. Test process manually
node server.js &  # Start process
curl http://localhost:3000/health  # Test endpoint
jobs  # See background jobs
kill %1  # Kill the job

# 2. Check if port is available
lsof -i :3000  # See what's on port 3000
kill -9 $(lsof -t -i :3000)  # Kill it

# 3. Increase health check timeouts
healthCheck:
  type: http
  url: 'http://localhost:3000/health'
  timeout: 10000  # Increase from 5000ms to 10s
  retries: 5      # Increase retries

# 4. Debug the process startup
# Add logging to your service:
console.log('[startup] Server starting...');
setTimeout(() => console.log('[startup] Ready'), 1000);
```

---

### Error: "Port already in use"

**Exit code**: `70`

**Symptom**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Root causes**:
- Previous topology still running
- Different service using port
- Port not released from previous crash

**Fix**:
```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 $(lsof -t -i :3000)

# Or use a different port in config:
params:
  port: 3001  # Change from 3000
```

---

### Error: "Module not found / Unknown module"

**Exit code**: `65`

**Symptom**: `Unknown module 'MyCustomModule'`

**Root causes**:
- Module not registered in registry
- Typo in module name
- Module not imported/exported
- Case mismatch (MyModule vs myModule)

**Fix**:
```bash
# 1. Verify built-in modules available
mkctl run --file examples/configs/basic.yml --dry-run

# 2. Check your custom module is exported
// In src/my-module.ts
export class MyCustomModule { ... }

// In config:
module: MyCustomModule  # Must match exactly

# 3. Verify TypeScript compiled
npm run build
ls dist/src/my-module.js  # Should exist

# 4. Test with simple config
nodes:
  - id: test
    module: TimerSource  # Use known good module first
```

---

## dry-run Validation Mode

Use `--dry-run` to validate config WITHOUT running the topology:

```bash
mkctl run --file config.yml --dry-run
```

**What it checks**:
- ✓ Config file exists and is readable
- ✓ YAML/JSON syntax is valid
- ✓ All required fields present
- ✓ No duplicate node IDs
- ✓ All connections reference existing nodes
- ✓ All modules are registered
- ✗ Does NOT check external processes or connectivity

**Use cases**:
- Pre-deployment validation
- CI/CD pipeline checks
- Config development iteration
- Syntax verification before running

**Exit codes**:
- `0` — Config is valid
- `65` — Config validation failed
- `66` — Config file not found

---

## Health Check Debugging

### Testing HTTP Health Checks

```bash
# 1. Start your service
node server.js &
SERVER_PID=$!

# 2. Test the health endpoint
curl -v http://localhost:3000/health

# Expected: HTTP 200 with response body
# curl exit code 0

# 3. Check timing
time curl http://localhost:3000/health

# 4. Stop service
kill $SERVER_PID
```

### Testing Command Health Checks

```bash
# Test the command that will be run
/usr/bin/curl -f http://localhost:3000/health

# Check exit code
echo $?  # Should be 0 for success

# Test in a loop (simulate retries)
for i in {1..5}; do
  echo "Attempt $i:"
  /usr/bin/curl -f http://localhost:3000/health && break
  sleep 1
done
```

---

## File Permissions Issues

### Error: "Permission denied"

**Symptoms**:
- Can't read config file
- Can't write to logs/ directory
- Can't execute external process

**Fix**:
```bash
# Check file ownership and permissions
ls -la config/topology.yml
ls -la logs/

# Make config readable
chmod 644 config/topology.yml

# Make directory writable
chmod 755 logs/

# Make external script executable
chmod +x scripts/my-processor.sh

# Fix ownership (if needed)
chown $USER:$USER config/ logs/
```

---

## MK_LOCAL_NODE Environment Variable

### Issue: Network features not disabled

**Symptoms**:
- Want to ensure only local mode is used
- mkctl doesn't print "Running in Local Node mode"

**Fix**:
```bash
# Set environment variable before running
export MK_LOCAL_NODE=1

# Verify it's set
echo $MK_LOCAL_NODE  # Should print "1"

# Now run mkctl
mkctl run --file config.yml

# Should see: [mkctl] Running in Local Node mode...
```

### Issue: "Network features not available in local mode"

**Symptoms**:
- Config references `type=network` or `address` fields
- Error: "Network addressing not allowed in Local Node mode"

**Fix**:
```bash
# Remove network config from topology
# Replace:
nodes:
  - id: remote
    type: network          # ❌ Not allowed in LOCAL_NODE=1
    address: 192.168.1.5

# With:
nodes:
  - id: local
    module: ExternalProcess  # ✓ Local module OK
    params:
      command: node
      args: ['server.js']
```

---

## Checks Performed

### 1. Node.js Version
**Requirement**: Node.js 20 or later

**Remediation**: If check fails:
```bash
# Using nvm
nvm install 20
nvm use 20

# Or download from https://nodejs.org/
```

### 2. Package Manager
**Requirement**: npm or pnpm installed

**Remediation**: If check fails:
```bash
# pnpm (recommended)
npm install -g pnpm

# npm comes bundled with Node.js
```

### 3. Git Repository
**Requirement**: Working in a Git repository (warning only)

**Remediation**: If not detected:
```bash
git init
```

### 4. Build Status
**Requirement**: `dist/` directory with compiled files

**Remediation**: If check fails:
```bash
npm run build
```

### 5. Dependencies Installed
**Requirement**: `node_modules/` directory exists

**Remediation**: If check fails:
```bash
npm install
# or
pnpm install
```

### 6. TypeScript Compilation
**Requirement**: No TypeScript type errors

**Remediation**: If check fails:
```bash
# See detailed errors
npx tsc --noEmit

# Fix type errors in your code
# Then rebuild
npm run build
```

## Output Format

The command outputs a checklist with status indicators:

- `✓` — Check passed
- `⚠` — Warning (non-critical issue)
- `✗` — Check failed

Each failed or warned check includes a remediation hint.

## Example Output

```
🏥 mk doctor — Environment Diagnostics

✓ Node.js version: v20.12.2 (>= 20)
✓ Package manager: Found: npm, pnpm
✓ Git repository: Detected
✓ Build status: dist/ directory exists with compiled files
✓ Dependencies: node_modules/ directory exists
✓ TypeScript compilation: No type errors

────────────────────────────────────────────────────────────
Summary: 6 passed, 0 warnings, 0 failed
✓ All checks passed!
```

## Exit Codes

- `0` — All checks passed or only warnings
- `1` — One or more checks failed

## Integration with CI/CD

Use `mk doctor` in CI pipelines to validate environment:

```yaml
# .github/workflows/ci.yml
- name: Environment check
  run: npm run build && node dist/scripts/mk.js doctor
```

## Related Commands

- `mk init` — Initialize a new mkolbol project
- `mk run` — Run mkolbol topologies
- `mk graph` — Visualize topology graphs

## Troubleshooting

### "dist/ directory not found"
Run `npm run build` to compile TypeScript sources.

### "node_modules/ not found"
Run `npm install` to install dependencies.

### "Node.js version v18.x (< 20)"
Upgrade to Node.js 20+ using nvm or download from nodejs.org.

### TypeScript compilation warnings
Run `npx tsc --noEmit` to see detailed type errors, then fix them in your code.

## Future Enhancements

Planned checks for future versions:
- Port availability for services
- Memory/CPU resources
- External tool dependencies (git, docker)
- Environment variables validation
- Configuration file syntax
- Network connectivity
