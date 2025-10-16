# MK Dev Orchestrator — DX Style Guide (v0)

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

## “Did You Mean”
- Levenshtein distance 1 for commands/flags.
- Suggest at most 2 candidates. Never auto‑correct without confirmation.

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

## Accessibility
- Support `--no-ansi`; ensure high‑contrast tokens.
- ASCII graphs for non‑TTY; avoid red/green only.
- Respect `$LANG` for numbers/dates (messages remain English in v0).

## Prompt Snippet
- Format: `[mk:<profile> <in/out format> <gates>]` (e.g., `[mk:dev yaml local]`).
- Never write to shell rc files; `print` only; reversible.

## Snapshot Targets (v0)
- Help text (`mk --help`): stable sections and examples.
- 10 canonical error messages: exact 3‑line structure.
- JSON error payload shape: fields present and typed.

## Copywriting Rules
- Use imperative voice. Avoid jargon. Prefer verbs: “Run”, “Fix”, “Open”.
- Link to stable anchors. Avoid 404 risk.
- Keep primary lines ≤ 80 columns.

## Acceptance Gates
- TTFR ≤ 60s; TTR (parse error) ≤ 30s with provided fix.
- `mk run --dry-run` latency < 400ms on example.
- Help and error outputs pass snapshot tests.

