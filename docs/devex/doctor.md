# mkctl Doctor — Diagnostic Guide

The `mkctl doctor` command helps you diagnose common issues with mkolbol topologies and configurations. This guide covers the most common problems and how to resolve them.

## Quick Diagnostics

```bash
# Run all diagnostics
mkctl doctor

# Focus on specific area
mkctl doctor --section config      # Configuration issues
mkctl doctor --section topology    # Running topologies
mkctl doctor --section health      # Health check problems
mkctl doctor --section permissions # File permissions
```

## Configuration Errors

### Problem: "Config file not found"

**Symptom:**
```
Error: Config file not found: examples/configs/my-topology.yml
```

**Cause:** File path is incorrect, relative path not found, or typo in filename.

**Fix:**
```bash
# Verify file exists
ls -la examples/configs/my-topology.yml

# Use absolute path
mkctl run --file /absolute/path/to/config.yml

# Or use pwd to construct path
mkctl run --file $(pwd)/examples/configs/basic.yml

# Check current directory
pwd
```

### Problem: "Failed to read config"

**Symptom:**
```
Error: Failed to read config: Could not parse YAML
```

**Cause:** YAML/JSON syntax error in configuration file.

**Fix:**
```bash
# Validate YAML syntax
python3 -m yaml examples/configs/my-topology.yml

# Or using yq
yq eval examples/configs/my-topology.yml

# Common YAML issues:
# - Inconsistent indentation (use 2 spaces, not tabs)
# - Missing colons after keys
# - Unquoted strings with special chars
# - Extra spaces or trailing colons
```

**Example: Invalid YAML**
```yaml
# ❌ WRONG - inconsistent indentation
nodes:
  - id: source
    module: TimerSource
      params:  # Too much indentation
        periodMs: 1000

# ✅ CORRECT
nodes:
  - id: source
    module: TimerSource
    params:
      periodMs: 1000
```

### Problem: "nodes must be an array"

**Symptom:**
```
Configuration validation failed: "nodes" must be an array
```

**Cause:** Missing `nodes` array or it's not formatted as an array.

**Fix:**
```yaml
# ❌ WRONG
nodes:
  source:
    module: TimerSource

# ✅ CORRECT
nodes:
  - id: source
    module: TimerSource
```

### Problem: "Duplicate node id"

**Symptom:**
```
Configuration validation failed: Duplicate node id 'source'
```

**Cause:** Two or more nodes have the same `id`.

**Fix:**
```yaml
# ❌ WRONG
nodes:
  - id: processor
    module: UppercaseTransform
  - id: processor  # Duplicate!
    module: ReverseTransform

# ✅ CORRECT
nodes:
  - id: uppercase
    module: UppercaseTransform
  - id: reverse
    module: ReverseTransform
```

### Problem: "Connection from 'X' to non-existent node 'Y'"

**Symptom:**
```
Connection from 'source' to non-existent node "transform" referenced in "to" does not exist
```

**Cause:** Connection references a node that doesn't exist in the nodes array.

**Fix:**
```yaml
# ❌ WRONG
nodes:
  - id: source
    module: TimerSource
  - id: sink
    module: ConsoleSink

connections:
  - from: source.output
    to: transform.input  # 'transform' doesn't exist!

# ✅ CORRECT
connections:
  - from: source.output
    to: sink.input
```

### Problem: "Unknown module 'SomeModule'"

**Symptom:**
```
Configuration validation failed: Unknown module 'SomeModule'
```

**Cause:** Module name is not registered or has a typo.

**Fix:**

Available built-in modules:
- **Sources**: `TimerSource`
- **Transforms**: `UppercaseTransform`, `PipeMeterTransform`, `RateLimiterTransform`, `TeeTransform`
- **Sinks**: `ConsoleSink`, `FilesystemSink`
- **External**: `ExternalProcess`

```yaml
# ❌ WRONG
nodes:
  - id: source
    module: TimerSourceModule  # Typo!

# ✅ CORRECT
nodes:
  - id: source
    module: TimerSource
```

---

## Runtime Errors

### Problem: "Command 'xyz' not found"

**Symptom:**
```
Failed to start topology: Command bash not found on PATH
```

**Cause:** External command doesn't exist or isn't in `$PATH`.

**Fix:**
```bash
# Use absolute paths for external commands
# ❌ WRONG
command: curl

# ✅ CORRECT (with absolute path)
command: /usr/bin/curl

# Or verify command is in PATH
which curl
echo $PATH

# Add to PATH if needed
export PATH="/usr/local/bin:$PATH"
```

### Problem: "Health check failed for node 'X'"

**Symptom:**
```
Health check failed for node 'server' after 3 retries
```

**Cause:** External process didn't respond to health check (command exit non-zero or HTTP non-2xx).

**Fix:**

**For command-based health checks:**
```yaml
healthCheck:
  type: command
  command: "curl -f http://localhost:3000/health"  # Must exit 0
  timeout: 5000
  retries: 3
```

**Debugging:**
```bash
# Test the health check command manually
curl -f http://localhost:3000/health
echo $?  # Should be 0

# Increase timeout if process is slow
timeout: 10000  # 10 seconds

# Increase retries for flaky services
retries: 5
```

**For HTTP-based health checks:**
```yaml
healthCheck:
  type: http
  url: "http://localhost:3000/health"
  timeout: 5000
  retries: 3
```

**Debugging:**
```bash
# Test HTTP endpoint directly
curl -i http://localhost:3000/health
# Must return 2xx status (200, 201, etc.)

# Check if server is actually running
curl -v http://localhost:3000/health 2>&1 | grep "Connection refused"

# If connection refused, server isn't listening yet
```

### Problem: "Topology runtime error: [message]"

**Symptom:**
```
Failed to start topology: Module instantiation failed: [error details]
```

**Cause:** Error during module initialization or topology execution.

**Fix:**

Verify:
1. All module names are correct (registered in ModuleRegistry)
2. All external commands are in `$PATH` or absolute paths
3. Parameters match module expectations
4. Ports aren't already in use (for ExternalProcess with servers)

```bash
# Check port availability
lsof -i :3000  # Check if port 3000 is in use

# Or for multiple ports
for port in 3000 3001 3002; do
  lsof -i :$port && echo "Port $port is in use"
done

# Kill existing process if needed
kill -9 $(lsof -t -i :3000)
```

---

## Health Check Troubleshooting

### Command-Based Health Checks Not Working

```yaml
# ❌ WRONG - health check never succeeds
healthCheck:
  type: command
  command: "echo 'checking...'"  # Always succeeds, but wrong check

# ✅ CORRECT - actually verify the service
healthCheck:
  type: command
  command: "curl -f http://localhost:3000/health"  # Fails if service down
```

### HTTP Health Checks Timing Out

```yaml
# Symptoms: "Health check timed out after 5000ms"

# ✅ Solution 1: Increase timeout
healthCheck:
  type: http
  url: "http://localhost:3000/health"
  timeout: 10000  # Give it more time

# ✅ Solution 2: Reduce initial startup time
# If service takes time to start, use longer timeout + retries
healthCheck:
  type: http
  url: "http://localhost:3000/health"
  timeout: 3000
  retries: 5  # More attempts

# ✅ Solution 3: Check service startup
# Make sure service outputs to console after binding
args:
  - -e
  - "require('http').createServer(...).listen(3000, () => console.log('Server ready'))"
```

---

## Dry-Run Validation

### Using `--dry-run` to Catch Errors Early

```bash
# Validate config without running topology
mkctl run --file my-config.yml --dry-run

# Useful in CI/CD before deployment
mkctl run --file production-config.yml --dry-run || exit 1

# Check all configs before deploying
for cfg in configs/*.yml; do
  mkctl run --file "$cfg" --dry-run || echo "FAIL: $cfg"
done
```

### What `--dry-run` Checks

✅ YAML/JSON syntax
✅ Required fields (nodes, connections)
✅ No duplicate node IDs
✅ Connections reference existing nodes
✅ Module names are registered
✅ Config structure is valid

❌ NOT checked:
- External command availability (checked at runtime)
- Port availability
- File permissions
- Health check endpoints

---

## File Permissions

### Problem: "Permission denied" when writing to file

**Symptom:**
```
Failed to write to logs/output.log: Permission denied
```

**Cause:** FilesystemSink lacks write permissions on directory or file.

**Fix:**
```bash
# Check current permissions
ls -la logs/

# Make directory writable
chmod 755 logs/

# Or make user the owner
chown $USER:$USER logs/

# Create directory if missing
mkdir -p logs
chmod 755 logs

# Verify write permissions
touch logs/test.txt && rm logs/test.txt && echo "OK"
```

### Problem: "Cannot create directory"

**Symptom:**
```
Failed to create logs/nested/output.log: EACCES: permission denied
```

**Cause:** Parent directory or ancestor lacks permission.

**Fix:**
```bash
# Check parent directory permissions
ls -la logs/
ls -la logs/nested/ 2>/dev/null || echo "nested doesn't exist"

# Fix: Use mkctl with proper directory
# mkolbol creates nested directories automatically if parent is writable
mkdir -p logs/
chmod 755 logs/

# Then FilesystemSink can create nested paths
```

---

## Debugging Tips

### Enable Verbose Logging

```bash
# mkctl doesn't have --verbose yet, but you can:
# 1. Check stdout for messages
mkctl run --file config.yml 2>&1 | grep -i error

# 2. Look at generated reports
cat reports/summary.jsonl | jq '.[]' | head -20
```

### Inspect Configuration

```bash
# Dry-run shows parsed config
mkctl run --file config.yml --dry-run

# For complex configs, validate step-by-step
mkctl run --file config.yml --dry-run && echo "✓ Config valid"
```

### Check Endpoints After Run

```bash
# After topology completes, inspect endpoints
mkctl endpoints

# View as JSON for scripting
mkctl endpoints --json | jq '.[] | {id, type, coordinates}'
```

### Monitor Running Topology

```bash
# In one terminal: run topology
mkctl run --file config.yml --duration 60

# In another: watch endpoints live
mkctl endpoints --watch

# Or filter by type
mkctl endpoints --filter type=external --watch
```

---

## Common Scenarios

### Scenario 1: "Port Already in Use"

```bash
# You see: "Failed to bind to port 3000"

# Find what's using the port
lsof -i :3000
# Result: node 12345 user 3u IPv4 0x... TCP 127.0.0.1:3000 (LISTEN)

# Option A: Kill existing process
kill -9 12345

# Option B: Use different port
# Modify your config to use a different port
ports:
  - 3001  # was 3000

# Option C: Wait for process to exit
sleep 5 && mkctl run --file config.yml
```

### Scenario 2: "External Server Crashes Immediately"

```bash
# Problem: ExternalProcess exits right away

# Check:
# 1. Is the command correct?
command: /usr/bin/python3
args: ["server.py"]

# 2. Does server.py exist?
ls -la server.py

# 3. Is it executable?
chmod +x server.py

# 4. Run it manually to see error
python3 server.py

# 5. Check restart limits
restart: on-failure
maxRestarts: 5
```

### Scenario 3: "Health Check Passes, Then Service Crashes"

```yaml
# Problem: Health check succeeds but service dies after

# Solution: Use more comprehensive health check
healthCheck:
  type: http
  url: "http://localhost:3000/ready"  # Endpoint that stays valid
  timeout: 2000
  retries: 5

# Or use command-based check that validates deeper
healthCheck:
  type: command
  command: "curl http://localhost:3000/health && test -f data/ready"
```

---

## Exit Codes Reference

| Code | Meaning | Fix |
|------|---------|-----|
| 0 | Success | No action needed |
| 64 | Usage error (bad arguments) | Check `mkctl run --help` |
| 65 | Config parse error | Validate YAML with `python3 -m yaml` |
| 66 | Config file not found | Check file path exists |
| 70 | Runtime error | Check external process, health checks, ports |
| 130 | Interrupted (Ctrl+C) | Normal - user stopped topology |

---

## When to Use Doctor

✅ **Use `mkctl doctor` when:**
- Configuration won't parse
- Topology fails to start
- Health checks are timing out
- You're not sure which module to use
- File permissions are preventing output
- Port conflicts are happening
- A service is crashing during startup

✅ **Common Next Steps:**
1. Run `mkctl doctor` for specific error
2. Check the fix section above
3. Validate config with `--dry-run`
4. Test manually (run command, check port, etc.)
5. Try again with updated config

---

## Getting Help

- **Config Syntax**: See [mkctl Cookbook](./mkctl-cookbook.md)
- **Health Checks**: See [Health Check Configuration](./mkctl-cookbook.md#health-checks-for-external-processes)
- **Examples**: See `examples/configs/` directory
- **Building Modules**: See [Authoring a Module](./authoring-a-module.md)
- **Testing**: See [Wiring and Tests](./wiring-and-tests.md)

