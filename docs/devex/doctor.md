# Doctor Guide: Troubleshooting mkolbol & mkctl

This guide helps diagnose and fix common issues with mkolbol development, mkctl commands, and mkolbol topologies.

---

## Quick Fixes for Common Issues

| Issue | Quick Fix |
|-------|-----------|
| **mk: command not found** | Add to PATH: `export PATH="/path/to/mkolbol/dist/scripts:$PATH"` |
| **Permission denied** | Make executable: `chmod +x /path/to/mkolbol/dist/scripts/*.js` |
| **Config file not found** | Use absolute path: `mk run --file $(pwd)/mk.json` |
| **Port already in use** | Kill process: `lsof -i :4000 && kill -9 $(lsof -t -i :4000)` |
| **Module not registered** | Check spelling: `mk doctor --file mk.json --verbose` |
| **Node version < 20** | Upgrade: `nvm install 20 && nvm use 20` |

---

## Toolchain Installation & PATH Setup

### Issue: mk, mkctl, or lam not found

**Symptom:**
```bash
$ mk --help
bash: mk: command not found
```

**Root cause:**
- mk binaries not in PATH
- mkolbol not built
- Wrong directory

**Fix (Linux/macOS):**

**Option 1: Add to PATH (Recommended)**
```bash
# 1. Find absolute path to mkolbol
cd /path/to/mkolbol
pwd
# Copy this path

# 2. Add to shell config
# For bash (~/.bashrc):
echo 'export PATH="/path/to/mkolbol/dist/scripts:$PATH"' >> ~/.bashrc
source ~/.bashrc

# For zsh (~/.zshrc):
echo 'export PATH="/path/to/mkolbol/dist/scripts:$PATH"' >> ~/.zshrc
source ~/.zshrc

# For fish (~/.config/fish/config.fish):
set -Ux fish_user_paths /path/to/mkolbol/dist/scripts $fish_user_paths

# 3. Verify
which mk        # → /path/to/mkolbol/dist/scripts/mk.js
mk --help       # → Shows mk help
```

**Option 2: Symlink to /usr/local/bin**
```bash
# Create symlinks (requires sudo)
cd /path/to/mkolbol
sudo ln -s "$(pwd)/dist/scripts/mk.js" /usr/local/bin/mk
sudo ln -s "$(pwd)/dist/scripts/mkctl.js" /usr/local/bin/mkctl
sudo ln -s "$(pwd)/dist/scripts/lam.js" /usr/local/bin/lam

# Make executable
sudo chmod +x /usr/local/bin/{mk,mkctl,lam}

# Verify
which mk        # → /usr/local/bin/mk
mk --help       # → Shows mk help
```

**Option 3: Wrapper Script**
```bash
# Create ~/bin/mk wrapper
mkdir -p ~/bin
cat > ~/bin/mk << 'EOF'
#!/usr/bin/env bash
exec node /path/to/mkolbol/dist/scripts/mk.js "$@"
EOF

chmod +x ~/bin/mk

# Add ~/bin to PATH if not already
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
which mk        # → /home/user/bin/mk
mk --help       # → Shows mk help
```

**Fix (Windows):**

**Option 1: Add to PATH via System Properties**
```powershell
# 1. Find mkolbol path
cd C:\path\to\mkolbol
pwd
# Copy: C:\path\to\mkolbol\dist\scripts

# 2. Open Environment Variables
# Win + X → System → Advanced system settings → Environment Variables

# 3. Edit Path variable
# - Select "Path" under User or System variables
# - Click "Edit..."
# - Click "New"
# - Paste: C:\path\to\mkolbol\dist\scripts
# - Click OK to save

# 4. Restart terminal and verify
# Open new PowerShell window
where.exe mk    # → C:\path\to\mkolbol\dist\scripts\mk.js
mk --help       # → Shows mk help
```

**Option 2: Create .cmd Shims**
```powershell
# Create mk.cmd in PATH directory
@"
@echo off
node "C:\path\to\mkolbol\dist\scripts\mk.js" %*
"@ | Out-File -FilePath C:\Windows\System32\mk.cmd -Encoding ASCII

# Repeat for mkctl and lam
@"
@echo off
node "C:\path\to\mkolbol\dist\scripts\mkctl.js" %*
"@ | Out-File -FilePath C:\Windows\System32\mkctl.cmd -Encoding ASCII

@"
@echo off
node "C:\path\to\mkolbol\dist\scripts\lam.js" %*
"@ | Out-File -FilePath C:\Windows\System32\lam.cmd -Encoding ASCII

# Verify
where.exe mk     # → C:\Windows\System32\mk.cmd
mk --help        # → Shows mk help
```

**Note:** Creating .cmd files in System32 requires Administrator privileges.

---

### Issue: Shims Broken After Moving mkolbol

**Symptom:**
```bash
$ mk --help
/usr/local/bin/mk: No such file or directory
```

**Root cause:**
- mkolbol directory moved
- Absolute symlinks point to old location

**Fix:**
```bash
# Remove old symlinks
sudo rm /usr/local/bin/{mk,mkctl,lam}

# Create new symlinks
cd /new/path/to/mkolbol
sudo ln -s "$(pwd)/dist/scripts/mk.js" /usr/local/bin/mk
sudo ln -s "$(pwd)/dist/scripts/mkctl.js" /usr/local/bin/mkctl
sudo ln -s "$(pwd)/dist/scripts/lam.js" /usr/local/bin/lam

# Make executable
sudo chmod +x /usr/local/bin/{mk,mkctl,lam}

# Verify
which mk        # → /usr/local/bin/mk (symlink to new path)
mk --help       # → Shows mk help
```

---

### Issue: Multiple mk Versions in PATH

**Symptom:**
```bash
$ mk --help
# Wrong version executing
```

**Root cause:**
- Multiple mk installations
- PATH order prioritizes wrong version

**Fix (Linux/macOS):**
```bash
# Find all mk installations
which -a mk
# Output shows all matches in PATH order

# Check PATH order
echo $PATH | tr ':' '\n' | nl

# Reorder PATH to prioritize correct installation
export PATH="/correct/path/to/mkolbol/dist/scripts:$PATH"

# Make permanent by adding to ~/.bashrc or ~/.zshrc
echo 'export PATH="/correct/path/to/mkolbol/dist/scripts:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
which mk        # → Should show correct path first
mk --version    # → Should show correct version
```

**Fix (Windows):**
```powershell
# Find all mk installations
where.exe mk
# Output shows all matches in PATH order

# Edit PATH to remove duplicates or reorder
# System Properties → Environment Variables → Path
# - Remove duplicate entries
# - Move correct path to top of list
# - Click OK to save

# Restart terminal and verify
where.exe mk
mk --version
```

---

### Issue: Permission Denied on mk Scripts

**Symptom:**
```bash
$ mk --help
bash: /path/to/mkolbol/dist/scripts/mk.js: Permission denied
```

**Root cause:**
- Scripts not executable
- File permissions too restrictive

**Fix (Linux/macOS):**
```bash
# Make scripts executable
chmod +x /path/to/mkolbol/dist/scripts/*.js

# Verify permissions
ls -la /path/to/mkolbol/dist/scripts/
# Should show: -rwxr-xr-x (executable)

# Verify execution
/path/to/mkolbol/dist/scripts/mk.js --help
# Should work without "Permission denied"
```

**Fix (Windows):**
Windows doesn't require executable bit. Ensure you're running with `node`:
```powershell
# Test direct execution
node C:\path\to\mkolbol\dist\scripts\mk.js --help

# If .cmd shim fails, recreate it
# See "Create .cmd Shims" section above
```

---

### Issue: Node.js Not Found

**Symptom:**
```bash
$ mk --help
/usr/bin/env: 'node': No such file or directory
```

**Root cause:**
- Node.js not installed
- Node.js not in PATH

**Fix:**

**Linux (Ubuntu/Debian):**
```bash
# Install Node 20+ via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # → v20.x.x
npm --version   # → 10.x.x
```

**macOS:**
```bash
# Install Node 20+ via Homebrew
brew install node@20

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
node --version  # → v20.x.x
```

**Windows:**
```powershell
# Download installer from https://nodejs.org/
# Run installer (includes Node.js and npm)
# Restart terminal

# Verify
node --version
npm --version
```

**Using nvm (Cross-platform):**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version  # → v20.x.x
```

---

## mk doctor — Environment Diagnostics

The `mk doctor` command performs comprehensive environment diagnostics to ensure your mkolbol development environment is correctly configured.

### Usage

```bash
mk doctor [--verbose] [--section all|toolchain|environment] [--json]
```

### Options

- `--verbose` — Show detailed output (future enhancement)
- `--section <type>` — Run specific check section: `all` (default), `toolchain`, or `environment`
- `--json` — Output results in JSON format for programmatic consumption

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

## Check Sections

### Environment Checks

#### 1. Node.js Version
**Requirement**: Node.js 20 or later

**Remediation**: If check fails:
```bash
# Using nvm
nvm install 20
nvm use 20

# Or download from https://nodejs.org/
```

#### 2. Package Manager
**Requirement**: npm or pnpm installed

**Remediation**: If check fails:
```bash
# pnpm (recommended)
npm install -g pnpm

# npm comes bundled with Node.js
```

#### 3. Git Repository
**Requirement**: Working in a Git repository (warning only)

**Remediation**: If not detected:
```bash
git init
```

#### 4. Build Status
**Requirement**: `dist/` directory with compiled files

**Remediation**: If check fails:
```bash
npm run build
```

#### 5. Dependencies Installed
**Requirement**: `node_modules/` directory exists

**Remediation**: If check fails:
```bash
npm install
# or
pnpm install
```

#### 6. TypeScript Compilation
**Requirement**: No TypeScript type errors

**Remediation**: If check fails:
```bash
# See detailed errors
npx tsc --noEmit

# Fix type errors in your code
# Then rebuild
npm run build
```

### Toolchain Checks

#### 7. Toolchain PATH Detection
**Requirement**: `mk`, `mkctl`, and `lam` binaries available in PATH

**Remediation**: If check fails:
```bash
# Global install
npm install -g .

# Or install PATH wrappers
mk self-install --wrapper-only
export PATH="$PATH:~/.local/bin"
```

#### 8. Shim Integrity
**Requirement**: All binary shims exist and are executable in `dist/scripts/`

**What it checks**:
- `dist/scripts/mk.js` exists and is executable
- `dist/scripts/mkctl.js` exists and is executable
- `dist/scripts/lam.js` exists and is executable

**Remediation**: If check fails:
```bash
npm run build
```

#### 9. mk Version Consistency
**Requirement**: Binary version matches `package.json` version

**What it checks**:
- Reads version from `package.json`
- Runs `mk --version` and compares output
- Detects version mismatches from stale builds

**Remediation**: If check fails:
```bash
npm run build
```

#### 10. Binary Accessibility
**Requirement**: All binaries can be executed via `node dist/scripts/*.js`

**What it checks**:
- Tests actual execution of each binary
- Verifies `--version` flag works
- Detects runtime errors

**Remediation**: If check fails:
```bash
npm run build
npm install
```

## Output Format

The command outputs a checklist with status indicators:

- `✓` — Check passed
- `⚠` — Warning (non-critical issue)
- `✗` — Check failed

Each failed or warned check includes a remediation hint.

## Example Output

### Text Format (default)

```
🏥 mk doctor — Environment Diagnostics

✓ Node.js version: v20.12.2 (>= 20)
✓ Package manager: Found: npm, pnpm
✓ Git repository: Detected
✓ Build status: dist/ directory exists with compiled files
✓ Dependencies: node_modules/ directory exists
✓ TypeScript compilation: No type errors
✓ Toolchain PATH: All binaries found: mk, mkctl, lam
✓ Shim integrity: All 3 shims OK
✓ mk version consistency: v0.2.0-rfc
✓ Binary accessibility: All binaries executable

────────────────────────────────────────────────────────────
Summary: 10 passed, 0 warnings, 0 failed
✓ All checks passed!
```

### JSON Format (`--json`)

```json
{
  "summary": {
    "total": 10,
    "passed": 10,
    "warnings": 0,
    "failed": 0
  },
  "checks": [
    {
      "name": "Node.js version",
      "status": "pass",
      "message": "v20.12.2 (>= 20)"
    },
    {
      "name": "Toolchain PATH",
      "status": "pass",
      "message": "All binaries found: mk, mkctl, lam"
    }
  ]
}
```

### Section-Specific Output (`--section toolchain`)

```
🏥 mk doctor — Environment Diagnostics

✓ Toolchain PATH: All binaries found: mk, mkctl, lam
✓ Shim integrity: All 3 shims OK
✓ mk version consistency: v0.2.0-rfc
✓ Binary accessibility: All binaries executable

────────────────────────────────────────────────────────────
Summary: 4 passed, 0 warnings, 0 failed
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
