# Installation Guide: mk Anywhere

**Complete guide for installing mkolbol and making mk/mkctl available from anywhere.**

---

## Overview

mkolbol provides two primary CLI tools:

- **mk** - Developer orchestrator (init, run, doctor, build, package, ci plan)
- **mkctl** - Microkernel control (run topologies, inspect endpoints)

This guide shows you how to:

1. Install mkolbol using tarball, git tag, or vendor paths (no npm registry)
2. Configure your system for "mk anywhere" usage
3. Troubleshoot common installation issues

**Note:** mkolbol is not published to npm. Use the distribution methods below.

---

## Distribution Methods

📋 See **[Distribution Matrix](./distribution.md)** for detailed comparison of all methods.

### Method 1: Tarball (Recommended)

**Use case:** Production deployments, CI pipelines, version pinning

```bash
# Download tarball from GitHub Releases
curl -L -o mkolbol-0.2.0.tgz https://github.com/anteew/mkolbol/releases/download/v0.2.0/mkolbol-0.2.0.tgz

# Install in your project
npm install ./mkolbol-0.2.0.tgz

# Or extract globally
tar -xzf mkolbol-0.2.0.tgz -C /opt/mkolbol
```

**Verify:**

```bash
ls -la node_modules/mkolbol/dist/scripts/
# Should see mk.js and mkctl.js
```

### Method 2: Git Tag

**Use case:** Development, testing specific versions, contributing

```bash
# Clone specific version
git clone --depth 1 --branch v0.2.0 https://github.com/anteew/mkolbol.git
cd mkolbol

# Build
npm install
npm run build

# Verify
ls -la dist/scripts/
# Should see mk.js and mkctl.js
```

### Method 3: Git Main (Latest)

**Use case:** Living on the edge, dogfooding, contributor workflow

```bash
# Clone main branch
git clone https://github.com/anteew/mkolbol.git
cd mkolbol

# Build
npm install
npm run build

# Set Local Node mode (required for development)
export MK_LOCAL_NODE=1

# Verify
npm test
```

### Method 4: Vendor (Monorepo)

**Use case:** Vendored dependencies, offline builds, monorepo integration

```bash
# Copy mkolbol into your repo
cp -r /path/to/mkolbol ./vendor/mkolbol

# Reference from package.json
{
  "dependencies": {
    "mkolbol": "file:./vendor/mkolbol"
  }
}

# Install
npm install
```

---

## Self-Install: Add mk to PATH

After installing mkolbol using any method above, follow the platform-specific instructions to add `mk` and `mkctl` to your PATH.

### POSIX (Linux/macOS)

#### Option 1: PATH Export (Recommended)

```bash
# Find absolute path to mkolbol
cd /path/to/mkolbol
MKOLBOL_PATH=$(pwd)

# Add to shell config (~/.bashrc, ~/.zshrc, or ~/.profile)
echo "export PATH=\"$MKOLBOL_PATH/dist/scripts:\$PATH\"" >> ~/.bashrc

# Reload shell
source ~/.bashrc

# Verify
which mk        # → /path/to/mkolbol/dist/scripts/mk.js
mk --help       # → Shows mk help
mkctl --help    # → Shows mkctl help
```

**For zsh users:**

```bash
echo "export PATH=\"$MKOLBOL_PATH/dist/scripts:\$PATH\"" >> ~/.zshrc
source ~/.zshrc
```

**For fish users:**

```fish
set -Ux fish_user_paths /path/to/mkolbol/dist/scripts $fish_user_paths
```

#### Option 2: Symlink to /usr/local/bin

```bash
# Create symlinks (requires sudo)
cd /path/to/mkolbol
sudo ln -s "$(pwd)/dist/scripts/mk.js" /usr/local/bin/mk
sudo ln -s "$(pwd)/dist/scripts/mkctl.js" /usr/local/bin/mkctl

# Make executable
sudo chmod +x /usr/local/bin/mk /usr/local/bin/mkctl

# Verify
which mk        # → /usr/local/bin/mk
mk --help       # → Shows mk help
```

**Pros:**

- No shell config changes needed
- Works for all users on the system
- Clean separation of system binaries

**Cons:**

- Requires sudo/root access
- Manual updates when mkolbol moves

#### Option 3: Wrapper Script

```bash
# Create ~/bin/mk wrapper
mkdir -p ~/bin
cat > ~/bin/mk << 'EOF'
#!/usr/bin/env bash
exec node /path/to/mkolbol/dist/scripts/mk.js "$@"
EOF

cat > ~/bin/mkctl << 'EOF'
#!/usr/bin/env bash
exec node /path/to/mkolbol/dist/scripts/mkctl.js "$@"
EOF

chmod +x ~/bin/mk ~/bin/mkctl

# Add ~/bin to PATH if not already
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
which mk        # → /home/user/bin/mk
mk --help       # → Shows mk help
```

---

### Windows

#### Option 1: Add to PATH via System Properties (GUI)

1. **Find mkolbol path:**

   ```powershell
   cd C:\path\to\mkolbol
   pwd
   # Copy: C:\path\to\mkolbol\dist\scripts
   ```

2. **Open Environment Variables:**
   - Press `Win + X` → System → Advanced system settings
   - Click "Environment Variables..."
   - Under "User variables" or "System variables", select "Path"
   - Click "Edit..."

3. **Add mkolbol scripts directory:**
   - Click "New"
   - Paste: `C:\path\to\mkolbol\dist\scripts`
   - Click "OK" to save
   - Click "OK" to close all dialogs

4. **Restart terminal and verify:**
   ```powershell
   # Open new PowerShell/CMD window
   where.exe mk    # → C:\path\to\mkolbol\dist\scripts\mk.js
   mk --help       # → Shows mk help
   mkctl --help    # → Shows mkctl help
   ```

#### Option 2: Add to PATH via PowerShell

```powershell
# Get current Path
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Add mkolbol scripts directory
$mkolbolPath = "C:\path\to\mkolbol\dist\scripts"
$newPath = "$mkolbolPath;$currentPath"

# Update Path (user level)
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")

# Restart terminal and verify
# Open new PowerShell window
where.exe mk
mk --help
```

#### Option 3: Create .cmd Shims

```powershell
# Create mk.cmd in a directory already in PATH
# (e.g., C:\Windows\System32 or %USERPROFILE%\bin)

# Create mk.cmd
@"
@echo off
node "C:\path\to\mkolbol\dist\scripts\mk.js" %*
"@ | Out-File -FilePath C:\Windows\System32\mk.cmd -Encoding ASCII

# Create mkctl.cmd
@"
@echo off
node "C:\path\to\mkolbol\dist\scripts\mkctl.js" %*
"@ | Out-File -FilePath C:\Windows\System32\mkctl.cmd -Encoding ASCII

# Verify
where.exe mk     # → C:\Windows\System32\mk.cmd
mk --help        # → Shows mk help
```

**Note:** Creating .cmd files in System32 requires Administrator privileges.

#### Option 4: PowerShell Profile Alias

```powershell
# Edit PowerShell profile
notepad $PROFILE

# Add aliases
function mk { node C:\path\to\mkolbol\dist\scripts\mk.js $args }
function mkctl { node C:\path\to\mkolbol\dist\scripts\mkctl.js $args }

# Save and reload
. $PROFILE

# Verify
mk --help
```

---

## Verification

After installation, verify everything works:

```bash
# Check mk is in PATH
which mk          # POSIX
where.exe mk      # Windows

# Check version (not yet implemented, will show help)
mk --help

# Check mkctl
mkctl --help

# Test mk commands
mk init test-project --lang ts --preset tty
cd test-project
mk doctor --file mk.json

# Clean up
cd ..
rm -rf test-project
```

---

## Troubleshooting

### mk: command not found

**Cause:** PATH not updated or shell not reloaded

**Fix (Linux/macOS):**

```bash
# Check if PATH includes mkolbol
echo $PATH | grep mkolbol

# If not, add to shell config
export PATH="/path/to/mkolbol/dist/scripts:$PATH"

# Reload shell
source ~/.bashrc  # or source ~/.zshrc
```

**Fix (Windows):**

```powershell
# Check if PATH includes mkolbol
$env:Path -split ';' | Select-String mkolbol

# If not, add via System Properties or PowerShell
[Environment]::GetEnvironmentVariable("Path", "User")

# Restart terminal
exit
# Open new PowerShell/CMD window
```

### Permission denied

**Cause:** Script not executable (Linux/macOS only)

**Fix:**

```bash
chmod +x /path/to/mkolbol/dist/scripts/*.js
```

### Wrong version executing

**Cause:** Multiple mk installations in PATH

**Fix (Linux/macOS):**

```bash
# Find all mk installations
which -a mk

# Check PATH order
echo $PATH

# Reorder PATH to prioritize correct installation
export PATH="/correct/path/to/mkolbol/dist/scripts:$PATH"
```

**Fix (Windows):**

```powershell
# Find all mk installations
where.exe mk

# Edit PATH to remove duplicates or reorder
# System Properties → Environment Variables → Path
```

### Node.js not found

**Cause:** Node not installed or not in PATH

**Fix:**

```bash
# Install Node 20+ (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Node 20+ (macOS via Homebrew)
brew install node@20

# Install Node 20+ (Windows via installer)
# Download from https://nodejs.org/en/download/
```

**Verify:**

```bash
node --version  # Should be v20.x or v24.x
npm --version
```

### Scripts not found after build

**Cause:** Build failed or incomplete

**Fix:**

```bash
cd /path/to/mkolbol

# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build

# Verify dist/scripts exists
ls -la dist/scripts/
# Should see mk.js and mkctl.js
```

### Symlink broken after moving mkolbol

**Cause:** Absolute symlinks point to old location

**Fix:**

```bash
# Remove old symlinks
sudo rm /usr/local/bin/mk /usr/local/bin/mkctl

# Create new symlinks
cd /new/path/to/mkolbol
sudo ln -s "$(pwd)/dist/scripts/mk.js" /usr/local/bin/mk
sudo ln -s "$(pwd)/dist/scripts/mkctl.js" /usr/local/bin/mkctl
```

### .cmd shim fails on Windows

**Cause:** Node path not absolute or spaces in path

**Fix:**

```powershell
# Get Node path
where.exe node  # → C:\Program Files\nodejs\node.exe

# Update .cmd shim to use absolute path
@"
@echo off
"C:\Program Files\nodejs\node.exe" "C:\path\to\mkolbol\dist\scripts\mk.js" %*
"@ | Out-File -FilePath C:\Windows\System32\mk.cmd -Encoding ASCII
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Install mkolbol via tarball
      - name: Install mkolbol
        run: |
          curl -L -o mkolbol.tgz https://github.com/anteew/mkolbol/releases/download/v0.2.0/mkolbol-0.2.0.tgz
          tar -xzf mkolbol.tgz -C /opt/mkolbol
          echo "/opt/mkolbol/dist/scripts" >> $GITHUB_PATH

      - name: Verify mk
        run: |
          which mk
          mk --help

      - name: Run topology
        run: mk run --file examples/mk/hello-calculator/mk.json --duration 10
```

### GitLab CI

```yaml
# .gitlab-ci.yml
test:
  image: node:20
  before_script:
    - curl -L -o mkolbol.tgz https://github.com/anteew/mkolbol/releases/download/v0.2.0/mkolbol-0.2.0.tgz
    - tar -xzf mkolbol.tgz -C /opt/mkolbol
    - export PATH="/opt/mkolbol/dist/scripts:$PATH"
  script:
    - mk --help
    - mk run --file examples/mk/hello-calculator/mk.json --duration 10
```

### Docker

```dockerfile
# Dockerfile
FROM node:20-slim

# Install mkolbol via tarball
RUN curl -L -o mkolbol.tgz https://github.com/anteew/mkolbol/releases/download/v0.2.0/mkolbol-0.2.0.tgz \
    && tar -xzf mkolbol.tgz -C /opt/mkolbol \
    && rm mkolbol.tgz

# Add to PATH
ENV PATH="/opt/mkolbol/dist/scripts:$PATH"

# Verify
RUN mk --help && mkctl --help

WORKDIR /app
COPY . .
CMD ["mk", "run", "--file", "mk.json"]
```

---

## Advanced Scenarios

### Multiple mkolbol Versions

**Use case:** Testing against multiple versions

```bash
# Install v0.2.0
tar -xzf mkolbol-0.2.0.tgz -C ~/mkolbol/v0.2.0

# Install v0.3.0
tar -xzf mkolbol-0.3.0.tgz -C ~/mkolbol/v0.3.0

# Create version-specific aliases
alias mk-0.2="node ~/mkolbol/v0.2.0/dist/scripts/mk.js"
alias mk-0.3="node ~/mkolbol/v0.3.0/dist/scripts/mk.js"

# Use specific version
mk-0.2 run --file mk.json
mk-0.3 run --file mk.json
```

### Workspace-Local Install

**Use case:** Project-specific mk version without global install

```bash
# Install mkolbol in project
cd my-project
npm install ../mkolbol-0.2.0.tgz

# Use via npx (no PATH changes needed)
npx mk init hello-calculator
npx mk run --file mk.json

# Or add to package.json scripts
{
  "scripts": {
    "mk": "mk",
    "mkctl": "mkctl"
  }
}

# Use via npm run
npm run mk -- init hello-calculator
```

### Shared Team Installation (Network Drive)

**Use case:** Centralized mkolbol for entire team

```bash
# Extract to network drive
tar -xzf mkolbol-0.2.0.tgz -C /mnt/shared/tools/mkolbol

# Each team member adds to PATH
# Linux/macOS
echo 'export PATH="/mnt/shared/tools/mkolbol/dist/scripts:$PATH"' >> ~/.bashrc

# Windows (via System Properties)
# Add: \\network\shared\tools\mkolbol\dist\scripts to PATH
```

---

## Next Steps

After successful installation:

1. **[First Five Minutes](./first-five-minutes.md)** - Quick workflow introduction
2. **[Distribution Matrix](./distribution.md)** - Compare all installation methods
3. **[Troubleshooting Guide](./troubleshooting.md)** - Complete issue reference

**Ready to build?** Run `mk init hello-calculator` to create your first project.
