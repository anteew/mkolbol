# T9705: mk doctor Toolchain Checks Enhancement

## Summary

Added comprehensive toolchain and shim integrity checks to `mk doctor`, along with section filtering and JSON output support.

## New Features

### 1. Toolchain Checks
- **Toolchain PATH**: Verifies `mk`, `mkctl`, and `lam` binaries are in PATH
- **Shim Integrity**: Validates dist/scripts/*.js files exist and are executable
- **mk Version Consistency**: Compares package.json version with binary output
- **Binary Accessibility**: Tests actual execution of binaries via `node dist/scripts/*.js`

### 2. Section Filtering (`--section`)
- `--section all` (default): Run all checks
- `--section environment`: Run only environment checks (Node.js, npm, git, build, dependencies, TypeScript)
- `--section toolchain`: Run only toolchain checks

### 3. JSON Output (`--json`)
Structured JSON output with:
```json
{
  "summary": {
    "total": 10,
    "passed": 8,
    "warnings": 2,
    "failed": 0
  },
  "checks": [
    {
      "name": "Toolchain PATH",
      "status": "warn",
      "message": "Found: lam. Missing: mk, mkctl",
      "remediation": "Run: npm install -g . or mk self-install"
    }
  ]
}
```

## Files Modified

### Core Implementation
- **src/mk/doctor.ts**
  - Added `CheckSection` type: `'all' | 'toolchain' | 'environment'`
  - Updated `runDoctorChecks()` to accept section parameter
  - Added 4 new check functions for toolchain validation
  - Updated `formatCheckResults()` to support JSON output
  - Total checks increased from 6 to 10

### CLI Handler
- **scripts/mk.ts**
  - Updated `doctor` command handler to parse `--section` and `--json` flags
  - Added validation for section parameter
  - Updated usage string

### Tests
- **tests/cli/mkDoctor.spec.ts**
  - Added test suite for `--section` flag (4 tests)
  - Added test suite for `--json` flag (3 tests)
  - Total tests: 24 passing

### Documentation
- **docs/devex/doctor.md**
  - Updated usage section with new flags
  - Added "Check Sections" organization
  - Added toolchain checks documentation (checks 7-10)
  - Added example outputs for text, JSON, and section-specific runs

## Check List

### Environment Checks (6)
1. ✓ Node.js version (>= 20)
2. ✓ Package manager (npm/pnpm)
3. ✓ Git repository
4. ✓ Build status (dist/ directory)
5. ✓ Dependencies (node_modules/)
6. ✓ TypeScript compilation

### Toolchain Checks (4)
7. ✓ Toolchain PATH detection
8. ✓ Shim integrity
9. ✓ mk version consistency
10. ✓ Binary accessibility

## JSON Output Format

### Structure
```typescript
{
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    remediation?: string;
  }>;
}
```

### Usage Examples

```bash
# All checks in text format (default)
mk doctor

# Only toolchain checks in text format
mk doctor --section toolchain

# All checks in JSON format
mk doctor --json

# Toolchain checks in JSON format
mk doctor --section toolchain --json

# Parse JSON with jq
mk doctor --json | jq '.summary'
mk doctor --json | jq '.checks[] | select(.status == "fail")'
```

## Test Results

All 24 tests passing:
- ✅ Basic doctor functionality (12 tests)
- ✅ Shim installation checks (3 tests)
- ✅ Check result formatting (2 tests)
- ✅ --section flag (4 tests)
- ✅ --json flag (3 tests)

## Verification Command

```bash
npm run build && node dist/scripts/mk.js doctor --section toolchain --json
```

Expected output:
```json
{
  "summary": {
    "total": 4,
    "passed": 2-4,
    "warnings": 0-2,
    "failed": 0-2
  },
  "checks": [
    { "name": "Toolchain PATH", ... },
    { "name": "Shim integrity", ... },
    { "name": "mk version consistency", ... },
    { "name": "Binary accessibility", ... }
  ]
}
```

## Exit Codes

- `0`: All checks passed or only warnings
- `1`: One or more checks failed
- `64`: Invalid usage (bad --section value)

## Benefits

1. **Comprehensive Diagnostics**: Now covers toolchain installation and integrity
2. **Automation Friendly**: JSON output enables CI/CD integration
3. **Targeted Testing**: Section filtering allows focused troubleshooting
4. **Developer Experience**: Clear remediation guidance for each failure
5. **Extensible Design**: Easy to add more check sections in the future

## Future Enhancements

Potential additions:
- `--section network`: Network connectivity checks
- `--section resources`: Memory/CPU availability
- `--section docker`: Docker environment checks
- `--fix` flag: Automatic remediation attempts
- `--export <file>`: Save JSON report to file
