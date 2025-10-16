# Troubleshooting Guide

Running into issues? This guide maps common errors to solutions.

## Installation & Setup

### `npm install` fails with build errors

**Symptom**: Install hangs or reports missing `node-pty` bindings

**Cause**: Native dependencies not built for your platform

**Fix**:
```bash
# 1. Ensure build tools are installed
# macOS:
xcode-select --install

# Linux (Debian/Ubuntu):
sudo apt-get install build-essential python3

# RHEL/CentOS:
sudo yum install gcc-c++ make python3

# 2. Clean and retry
rm -rf node_modules package-lock.json
npm install
```

### "Cannot find module 'mkolbol'"

**Symptom**: `require()` or import fails with "Cannot find module"

**Cause**: Package not installed or wrong directory

**Fix**:
```bash
# Install locally in your project
npm install mkolbol

# Or install globally
npm install -g mkolbol

# Then use with npx
npx lam init
```

---

## Running Topologies

### `mkctl run` command not found

**Symptom**: `mkctl run --file config.yml` → "command not found"

**Cause**: The `mkctl` script is in `dist/scripts/`

**Fix**:
```bash
# Use the full path
node dist/scripts/mkctl.js run --file examples/configs/basic.yml

# Or build, then use lam
npm run build
```

### "No such file or directory" (config not found)

**Symptom**: `mkctl run --file examples/configs/missing.yml` → ENOENT

**Cause**: Config file path is wrong or relative path is off

**Fix**:
```bash
# Check the file exists
ls examples/configs/

# Use absolute path or check you're in the right directory
node dist/scripts/mkctl.js run --file $(pwd)/examples/configs/basic.yml

# List available configs
ls -la examples/configs/
```

### YAML parsing error

**Symptom**: "Invalid YAML" or "Cannot parse"

**Cause**: YAML syntax error (indentation, colons, quotes)

**Fix**:
```yaml
# ✗ Wrong
nodes:
- id: my-node
module: TimerSource

# ✓ Correct (indentation matters)
nodes:
  - id: my-node
    module: TimerSource
    params:
      periodMs: 1000
```

Validate your YAML before running:
```bash
# Use an online validator: https://www.yamllint.com/
# Or pipe to Python validator:
python3 -m yaml examples/configs/my-topology.yml
```

### "command not found" at runtime

**Symptom**: External process fails: `command not found /bin/my-tool`

**Cause**: Command path doesn't exist or isn't in PATH

**Fix**:
```yaml
# ✗ Wrong
nodes:
  - id: filter
    module: ExternalProcess
    params:
      command: jq  # Relies on PATH
      ioMode: stdio

# ✓ Better (absolute path)
nodes:
  - id: filter
    module: ExternalProcess
    params:
      command: /usr/bin/jq  # Explicit path
      ioMode: stdio
```

Verify the command exists:
```bash
which jq        # Find path
/usr/bin/jq --version  # Test it
```

---

## PTY & Terminal Issues

### "spawn EACCES" or "permission denied"

**Symptom**: PTY demo fails with "Permission denied" creating PTY

**Cause**: Insufficient terminal permissions

**macOS Fix**:
```
System Preferences → Security & Privacy → Privacy → Developer Tools
→ Add Terminal.app (or your terminal emulator)
```

**Linux Fix**:
```bash
# Check if user is in tty group
groups | grep tty

# If not, add user to tty group
sudo usermod -a -G tty $USER

# Log out and log back in for changes to take effect
```

### "command not found: lam" (Laminar tests)

**Symptom**: `lam init` or `lam run` → command not found

**Cause**: `lam` not in PATH or not installed

**Fix**:
```bash
# Install locally (recommended)
npm install mkolbol

# Use with npx
npx lam init
npx lam run --lane auto

# Or install globally
npm install -g mkolbol
lam init
```

### Terminal corrupted after demo

**Symptom**: Screen is garbled or stuck in alternate buffer after Ctrl+C

**Cause**: Terminal state not reset properly after PTY exit

**Fix**:
```bash
# Reset terminal to clean state
reset

# Or manually exit alternate screen buffer
echo -e "\033[?1049l"

# If still stuck, use:
stty sane
```

---

## Node Version Issues

### "Unsupported Node version"

**Symptom**: Tests fail or run with: "Node version must be 20+ or 24+"

**Cause**: Running on Node 18 or earlier

**Fix**:
```bash
# Check your version
node --version

# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node 20 or 24
nvm install 20
nvm use 20

# Verify
node --version  # Should be v20.x.x or v24.x.x
```

### Weird behavior with specific Node version

**Symptom**: Tests pass on Node 20 but fail on Node 24 (or vice versa)

**Cause**: version-specific behavior differences

**Fix**:
```bash
# Test on both supported versions
nvm use 20
npm test

nvm use 24
npm test

# If specific version needed, use .nvmrc
echo "20" > .nvmrc
nvm use
```

---

## External Process Issues

### "Process not spawning" or "command timed out"

**Symptom**: External process config loads but process doesn't start

**Cause**: Command path wrong, or process exiting immediately

**Fix**:
```yaml
# Verify command and args
nodes:
  - id: my-process
    module: ExternalProcess
    params:
      command: /bin/bash  # Use absolute path
      args: ["-c", "cat"]  # Test: /bin/bash -c "cat"
      cwd: /tmp
      ioMode: stdio
```

Test the command manually:
```bash
# Test command directly
/bin/bash -c "cat"

# If that works, check config is correct
node dist/scripts/mkctl.js run --file examples/configs/external-stdio.yaml --duration 5
```

### stdio vs pty confusion

**Symptom**: "Process expects PTY" error or "interactive command not working"

**Cause**: Wrong ioMode for the process

**Fix**:
```yaml
# ✗ Wrong: interactive shell on stdio
nodes:
  - id: shell
    module: ExternalProcess
    params:
      command: /bin/bash
      ioMode: stdio  # ← Won't work for interactive

# ✓ Correct: interactive shell on pty
nodes:
  - id: shell
    module: ExternalProcess
    params:
      command: /bin/bash
      ioMode: pty  # ← Needed for terminal interaction
```

**Quick guide**:
- **stdio**: For filters, data processing, non-interactive programs
- **pty**: For shells, TUI apps, anything needing terminal features

See **[I/O Modes Guide](./wiring-and-tests.md#i-o-modes)** for more details.

---

## Testing Issues

### "Test hangs indefinitely"

**Symptom**: Test starts but never completes

**Cause**: Missing `.end()` call or process not terminating

**Fix**:
```typescript
// ✗ Hangs
wrapper.inputPipe.write('data\n');
// Missing: wrapper.inputPipe.end();

// ✓ Works
wrapper.inputPipe.write('data\n');
wrapper.inputPipe.end();  // ← Signal EOF
```

### "Tests fail locally but pass in CI"

**Symptom**: Flaky tests that timeout on slow machines

**Cause**: Fixed timeouts too short for your hardware

**Fix**: Use event-driven waiting instead of timers:
```typescript
// ✗ Bad (fixed timeout)
await new Promise(resolve => setTimeout(resolve, 500));

// ✓ Good (event-driven)
await new Promise<void>((resolve) => {
  wrapper.outputPipe.once('data', resolve);
});
```

### "MK_DEVEX_EXECUTOR tests not running"

**Symptom**: Executor integration tests skipped

**Cause**: Flag not set or tests gated

**Fix**:
```bash
# Enable executor integration tests
MK_DEVEX_EXECUTOR=1 npm run test:pty

# With Laminar for structured logs
MK_DEVEX_EXECUTOR=1 npm run test:pty:lam
```

---

## Wiring & Connection Issues

### "No endpoints registered"

**Symptom**: `mkctl endpoints` shows no endpoints

**Cause**: Topology never ran or Hostess didn't register

**Fix**:
```bash
# 1. Run a topology first
node dist/scripts/mkctl.js run --file examples/configs/basic.yml --duration 5

# 2. Check endpoints immediately after (before process exits)
node dist/scripts/mkctl.js endpoints

# 3. If still empty, check the topology loaded correctly
# Look for "Loading config" log messages
```

### "Connection refused" errors

**Symptom**: Process trying to connect to unavailable endpoint

**Cause**: Wire (connection) defined but target module not running

**Fix**:
```yaml
# ✓ Check your connections match node IDs exactly
nodes:
  - id: source1
    module: TimerSource
  - id: filter1
    module: ExternalProcess

connections:
  - from: source1.output
    to: filter1.input  # ← Must match node ID "filter1"
```

---

## Performance & Resource Issues

### "Out of memory" or "process killed"

**Symptom**: Topology runs fine locally, crashes on small server

**Cause**: Backpressure not handled, buffer bloat

**Fix**:
```yaml
# Add restart policy to shed load
nodes:
  - id: heavy-process
    module: ExternalProcess
    params:
      command: /bin/cat
      ioMode: stdio
      restart: on-failure  # ← Restart on crash
      maxRestarts: 3
      restartDelay: 5000
```

### High CPU or slow response

**Symptom**: Process using 100% CPU or feels sluggish

**Cause**: Wrong ioMode (overhead), or tight loop

**Fix**:
```yaml
# Use stdio instead of pty if terminal features not needed
params:
  ioMode: stdio  # ~100μs latency
  # vs
  ioMode: pty    # ~500μs latency + terminal state overhead
```

---

## Getting Help

**Still stuck?**

1. **Check the logs:**
   ```bash
   npx lam summary     # Test results
   npx lam digest      # Failure details
   npx lam show --case <test-name> --around assert.fail --window 10
   ```

2. **See the quick decision tree:**
   - **[First Five Minutes](./first-five-minutes.md)** - Pick your path
   - **[Early Adopter Guide](./early-adopter-guide.md)** - Understand concepts

3. **Report an issue:**
   - **[Contributing Guide](../../../CONTRIBUTING-DEVEX.md)** - How to share minimal repros
   - **[GitHub Issues](https://github.com/anteew/mkolbol/issues)** - Submit bug reports

---

**Pro tip**: Most "failed to run" issues come down to:
1. **Wrong command path** → Use absolute paths
2. **Wrong ioMode** → Use stdio for filters, pty for shells
3. **Missing .end()** → Always signal EOF when done writing

Happy troubleshooting! 🚀
