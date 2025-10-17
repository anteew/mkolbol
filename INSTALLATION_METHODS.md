# mk Self-Install Implementation

## Installation Methods

### 1. `mk self install`

Installs mk shim to a specified bin directory.

**Options:**

- `--bin-dir <path>`: Target directory (default: ~/.local/bin)
- `--from repo|global`: Install from repo or global npm package (default: repo)
- `--copy`: Copy files instead of creating wrapper shims (default: false)
- `--verbose`: Show detailed installation output

**Examples:**

```bash
# Install from repository to custom directory
node dist/scripts/mk.js self install --bin-dir ./.mk/bin --from repo

# Install with verbose output
mk self install --bin-dir ~/.local/bin --verbose

# Copy mode
mk self install --copy
```

### 2. `mk self uninstall`

Removes mk shims from bin directory.

**Options:**

- `--bin-dir <path>`: Target directory (default: ~/.local/bin)

**Example:**

```bash
mk self uninstall --bin-dir ~/.local/bin
```

### 3. `mk self where`

Shows all mk installations found in PATH.

**Example:**

```bash
mk self where
```

### 4. `mk self switch`

Switches to a different version by installing from npm.

**Options:**

- `<version>`: Version to switch to (e.g., "0.2.0", "latest")

**Example:**

```bash
mk self switch latest
```

## Shim Structure

### Unix Shim (bash wrapper)

```bash
#!/usr/bin/env bash
exec node "/path/to/mkolbol/dist/scripts/mk.js" "$@"
```

### Windows Shim (.cmd file)

```cmd
@echo off
node "/path/to/mkolbol/dist/scripts/mk.js" %*
```

## Doctor Integration

The `mk doctor` command now includes toolchain checks:

- **Toolchain PATH**: Verifies mk, mkctl, and lam are in PATH
- **Shim integrity**: Validates shim files are valid
- **Version consistency**: Checks mk version can be executed
- **Binary accessibility**: Tests mk command accessibility

**Example output:**

```
🏥 mk doctor — Environment Diagnostics

✓ Node.js version: v24.9.0 (>= 20)
✓ Package manager: Found: npm
✓ Build status: dist/ directory exists with compiled files
⚠ Toolchain PATH: No mkolbol binaries found in PATH (warning)
  → Run: mk self install --bin-dir ~/.local/bin and add to PATH
```

## Implementation Files

- **src/mk/selfInstall.ts**: Core installation logic
- **src/mk/doctor.ts**: Enhanced with toolchain checks
- **scripts/mk.ts**: Added `self` command with subcommands
- **tests/cli/mkSelf.spec.ts**: Comprehensive test coverage
- **tests/cli/mkDoctor.spec.ts**: Doctor command tests

## Key Features

1. **Cross-platform support**: Creates both Unix and Windows shims
2. **Flexible installation**: Supports repo and global installation sources
3. **Copy or wrapper mode**: Choose between file copying or wrapper scripts
4. **PATH detection**: Finds existing mk installations
5. **Version switching**: Easy version management via npm
6. **Doctor integration**: Installation verification built-in

## Verification

```bash
# Build the project
npm run build

# Test installation
node dist/scripts/mk.js self install --bin-dir ./.mk/bin --from repo

# Verify with doctor
node dist/scripts/mk.js doctor

# Run tests
npm test -- tests/cli/mkSelf.spec.ts
npm test -- tests/cli/mkDoctor.spec.ts
```

All tests passing: ✅

- mkSelf.spec.ts: 17/17 tests pass
- mkDoctor.spec.ts: 17/17 tests pass
