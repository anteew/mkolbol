# MK Dev Orchestrator — DX Style Guide (v1.0)

**Status**: Finalized | **Last Updated**: 2025-10-17 | **Phase**: Local Node v1.0

Purpose: Encode developer‑joy into our CLI microcopy, output structure, and error semantics so every interaction is fast, obvious, reversible, and helpful.

## Principles
- Short first, details on demand.
- Every error teaches (code, cause, fix, rerun).
- Deterministic output; machine‑readable with `--json`.
- No hidden state; show inferred defaults.
- Quiet on success, rich with `-v/--debug`.

## Status Line Conventions
- Prefix tokens (TTY): `[OK ]`, `[ERR]`, `[WARN]`, `[INFO]`.
- Non‑TTY: same tokens without color. Provide `--no-color`.
- One short line first; follow with bullet details.

Examples:
```
[ERR] CONFIG_PARSE at mk.yaml:12:7 — invalid indent under "nodes".
Fix: run `mk format --to json --dry-run` to see a normalized form.
Docs: https://mkolbol.dev/docs/config#yaml-indentation
Code: CONFIG_PARSE  Rerun: mk run --file mk.yaml --dry-run
```

```
[OK ] Validated topology (7 nodes, 8 connections). Next: mk run
```

## "Did You Mean" Pattern
- **Algorithm**: Levenshtein distance ≤ 2 for commands/flags
- **Limit**: Suggest at most 2 candidates
- **Format**: `Unknown command "losg". Did you mean: logs, trace?`
- **No Auto-Correct**: Never auto-run without user confirmation
- **Scope**: Apply to both commands (`mk rnu`) and flags (`--flie`)

### Implementation Rules
1. Calculate edit distance for all known commands/flags
2. Filter candidates with distance ≤ 2
3. Sort by distance (ascending), then alphabetically
4. Show first 2 matches
5. If no matches found, show generic "Unknown command" error

### Examples
```
$ mk rnu
[ERR] UNKNOWN_COMMAND — Unknown command "rnu"
Did you mean: run?
Fix: Run: mk --help
```

```
$ mk run --flie mk.json
[ERR] INVALID_ARGUMENT — Unknown flag "--flie"
Did you mean: --file?
Fix: Run: mk run --help
```

```
$ mk losg
[ERR] UNKNOWN_COMMAND — Unknown command "losg"
Did you mean: logs?
Fix: Run: mk --help
```

## Error Taxonomy (Human)
- CONFIG_NOT_FOUND — show searched paths; suggest `mk init`.
- CONFIG_PARSE — include line:col; suggest `mk format --dry-run`.
- SCHEMA_INVALID — show JSONPath to field; suggest fix snippet.
- RUNTIME_GATE — print rejected fields + allowed alternatives.
- PERMISSION_DENIED — show exact flag to enable.

## Error Payload (Machine, with `--json`)
```json
{
  "code": "CONFIG_PARSE",
  "message": "invalid indent under 'nodes'",
  "remediation": "mk format --to json --dry-run",
  "details": { "file": "mk.yaml", "line": 12, "column": 7 },
  "docs": "https://mkolbol.dev/docs/config#yaml-indentation",
  "hint": "use --yaml to author in YAML end‑to‑end"
}
```

## Help Text Conventions

### Structure
All help text follows consistent sections:
1. **Header**: Command name + one-line description
2. **Usage**: Command syntax with brackets for optional args
3. **Description**: 1-2 sentences explaining what the command does
4. **Options**: Flag reference with defaults and types
5. **Examples**: Copy-paste runnable scenarios (4-6 examples)
6. **Environment**: Relevant env vars (if applicable)
7. **Output**: Sample output format (if applicable)
8. **Learn More**: Links to full docs and RFCs

### Formatting Rules
- Use UPPERCASE for section headers
- Indent options with 2 spaces
- Keep primary lines ≤ 80 columns
- Use — (em dash) for separation, not - or --
- Show defaults explicitly: `Default: mk.json`
- Group related flags together

### Example Pattern
```
mk <command> — Short description

USAGE
  mk <command> [--flag <value>] [--optional]

DESCRIPTION
  One or two sentences explaining the command purpose and key behavior.
  Focus on what, not how.

OPTIONS
  --flag <value>             Description with type. Default: value
  --optional                 Boolean flag description

EXAMPLES
  # Comment explaining scenario
  mk <command> --flag value

  # Another scenario
  mk <command> --optional

LEARN MORE
  Full guide: https://mkolbol.dev/docs/<command>
```

### Stability Requirements
- **No timestamps or dates** in help text
- **No dynamic version numbers** that change per build
- **Deterministic output**: Running `mk --help` twice produces identical output
- **No runtime state**: Help text is static, not dependent on system state

## Error Message Style Guide

### Format
```
[ERR] ERROR_CODE at <location> — brief description
Fix: <actionable remediation>
Docs: <stable URL>
Code: ERROR_CODE  Rerun: <exact command to retry>
```

### Writing Rules
1. **Be specific**: "Configuration file not found at ./mk.json" > "File not found"
2. **Show location**: Include file:line:col when available
3. **Provide fix**: Every error includes actionable remediation
4. **Link to docs**: Use stable anchors, avoid 404 risk
5. **Use imperative voice**: "Run", "Fix", "Check" (not "You should run")
6. **Avoid jargon**: Prefer plain language over technical terms
7. **Include rerun command**: Show exact command to retry after fix

### Examples

**Good**:
```
[ERR] CONFIG_NOT_FOUND — Configuration file not found at ./mk.json
Fix: Run: mk init --preset tty
Docs: https://mkolbol.dev/docs/config#locations
Code: CONFIG_NOT_FOUND
```

**Bad**:
```
Error: couldn't find the config
Try creating one
```

## Accessibility
- Support `--no-ansi`; ensure high‑contrast tokens.
- ASCII graphs for non‑TTY; avoid red/green only.
- Respect `$LANG` for numbers/dates (messages remain English in v0).

## Prompt Snippet
- Format: `[mk:<profile> <in/out format> <gates>]` (e.g., `[mk:dev yaml local]`).
- Never write to shell rc files; `print` only; reversible.

## Snapshot Targets (v0)
- Help text (`mk --help`, `mk dev --help`, `mk logs --help`, `mk trace --help`): stable sections and examples.
- 10 canonical error messages: exact 3‑line structure.
- JSON error payload shape: fields present and typed.
- **Phase C Additions** (P11): `mk dev`, `mk logs`, `mk trace` help snapshots (see fixtures below).

## Copywriting Rules
- Use imperative voice. Avoid jargon. Prefer verbs: "Run", "Fix", "Open".
- Link to stable anchors. Avoid 404 risk.
- Keep primary lines ≤ 80 columns.

## Acceptance Gates
- TTFR ≤ 60s; TTR (parse error) ≤ 30s with provided fix.
- `mk run --dry-run` latency < 400ms on example.
- Help and error outputs pass snapshot tests.

## Snapshot Testing Scaffolds

To enforce DX consistency, we maintain snapshot tests for critical CLI surfaces:

### Help Text Snapshot (`tests/cli/mkdxHelp.spec.ts`)
- **Purpose**: Detect unintended help output changes
- **Scope**: `mk --help` sections, command order, examples
- **Structure**: Organized sections (Usage, Commands, Options, Examples)
- **Stability**: Help must be reviewed when modified; snapshot blocks accidental regressions
- **Status**: Active with 27 tests covering all commands and fixtures

### Test Coverage
The help test suite includes:
1. **Main help**: `mk --help` and `mk -h` flags
2. **Command help**: All 8 core commands (`init`, `run`, `doctor`, `validate`, `graph`, `dev`, `logs`, `trace`)
3. **Stability**: Deterministic output (no timestamps, no dynamic versions)
4. **Did-you-mean**: Typo suggestions for commands and flags (Levenshtein distance ≤ 2)
5. **Fixture validation**: Structure verification for `mk dev`, `mk logs`, `mk trace` fixtures

### Error Output Snapshot (`tests/cli/mkdxErrors.spec.ts`)
- **Purpose**: Enforce error format consistency across all error codes
- **Scope**: 15 core error codes (CONFIG_*, HEALTH_CHECK_*, SCHEMA_*, MODULE_*, RUNTIME_*, etc.)
- **Format**: MkError class with code/message/remediation/details/docs/hint
- **Coverage**: Text format (human-readable), JSON format (machine-parseable)
- **Validation**: All errors include non-empty message and remediation
- **Status**: Active; tests ERROR_CATALOG and formatError() function

### How to Update Snapshots
```bash
# Review and accept snapshot changes
npm run test:ci -- --update

# Or for specific suite
npx vitest tests/cli/mkdxHelp.spec.ts --update
npx vitest tests/cli/mkdxErrors.spec.ts --update
```

### Adding New Error Codes
1. Add to `ERROR_CATALOG` in error definitions
2. Include code, message, remediation, docs link
3. Run tests to verify scaffold coverage
4. Update snapshot if intentional

---

## Phase C Help Snapshots (P11 Sprint)

Added help text snapshots for new developer ergonomics commands:

### Files Added
- `tests/fixtures/mkdx/mk-dev.help.txt` — Help for `mk dev` (hot reload)
- `tests/fixtures/mkdx/mk-logs.help.txt` — Help for `mk logs` (structured logging)
- `tests/fixtures/mkdx/mk-trace.help.txt` — Help for `mk trace` (flow analysis)

### Usage Pattern

These fixtures define the exact format and structure expected for CLI help output once these commands are implemented. Each follows the style guide:

1. **Header**: Command name + short description
2. **Usage**: Command line syntax
3. **Description**: What the command does (1–2 sentences)
4. **Options**: Flag reference with defaults
5. **Examples**: Copy-paste runnable scenarios
6. **Environment**: Relevant env vars
7. **Output**: Sample actual output
8. **Learn More**: Links to full docs and RFC

### Validation

When `scripts/mk.ts` implements these commands, run:

```bash
# Verify help output matches fixtures
npm run test:ci -- tests/cli/mkdxHelp.spec.ts

# Update snapshots if intentional changes
npm run test:ci -- tests/cli/mkdxHelp.spec.ts --update
```

---

## Implementation Checklist for Future MK CLI Phases

**Phase A (v0):**
- [x] mkdxHelp.spec.ts — Activated with 27 comprehensive help tests
- [x] mkdxErrors.spec.ts — Extended ERROR_CATALOG for all error scenarios
- [ ] Implement mk --help with sections matching snapshot expectations
- [ ] Implement mk --json for machine-readable output
- [ ] Create mk init/validate/run subcommands following error format
- [ ] Run full test suite: `npm run test:ci -- tests/cli/mkdx*`

**Phase C (P11+):**
- [x] Add mk dev/logs/trace help text snapshots (fixtures created)
- [x] Add comprehensive did-you-mean tests
- [x] Document help text conventions and error message style guide
- [ ] Implement mk dev subcommand with hot reload
- [ ] Implement mk logs subcommand with filtering
- [ ] Implement mk trace subcommand with latency analysis
- [ ] Verify help snapshots pass: `npm run test:ci -- tests/cli/mkdxHelp.spec.ts`
- [ ] Test error messages for these commands match mk-dx-style
- [ ] Update snapshots if UX changes: `--update` flag
