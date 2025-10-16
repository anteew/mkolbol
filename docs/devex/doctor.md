# mk doctor — Environment Diagnostics

The `mk doctor` command performs comprehensive environment diagnostics to ensure your mkolbol development environment is correctly configured.

## Usage

```bash
mk doctor [--verbose]
```

### Options

- `--verbose` — Show detailed output (future enhancement)

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
