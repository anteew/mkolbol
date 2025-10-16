# MK Dev Orchestrator — RFC v0

Version: 0.1
Date: 2025-10-16
Status: Draft (Request for Comments)
Owners: VEGA (architecture), DevEx (Vex), Core (Susan)

## Executive Summary

We propose “mk”, a developer‑first orchestrator that scaffolds, runs, tests, builds, and packages applications that use the mkolbol microkernel. The north star is developer joy: first success in under 60 seconds, fast feedback, obvious defaults, and trustworthy, reproducible results. The orchestrator centers on one manifest and one binary, with JSON as the canonical in‑memory format and seamless JSON⇄YAML translation for authoring. A per‑repo options file controls defaults, profiles, and UX affordances (including an optional shell prompt indicator) without hidden magic.

This RFC defines goals, UX, schemas, command surfaces, and implementation phases to deliver v0 for Local Node (single host) while setting a clean path to polyglot adapters and distribution (bundles, images, capsules).

## Goals (Developer Joy)

- First 60–120 seconds: `mk init` → `mk run` → live output; no edits required.
- Obvious defaults: zero flags for the golden path; safe fallbacks everywhere.
- Fast feedback: sub‑second edit→run loops; clear, actionable errors with suggested fixes.
- Reproducible: pinned toolchain, lockfiles, idempotent commands; deterministic artifacts.
- Discoverable: `mk help` and `mk doctor` with exact next steps; `did you mean…` hints.
- Seamless authoring: author in JSON by default or YAML with `--yaml`; round‑trip either way.

Non‑negotiables for v0:
- Single source of truth for topology validation (reuses kernel loader).
- Canonical JSON AST inside mk; format adapters perform JSON⇄YAML I/O only.
- Per‑repo `.mk/options.json` fully populated with defaults and inactive stubs.
- Optional shell prompt integration to surface active modes (e.g., `[mk:local yaml dry-run]`).

### Developer‑Joy Mantra (turning the knob to 11)

We optimize for knees‑go‑weak delight. Every interaction must be: fast, obvious, reversible, and helpful. If a developer pauses to think about the tool instead of their app, we consider that a bug.

DX commandments:
- 1. Zero‑to‑run in under 60 seconds, always.
- 2. If we can infer, we infer; if we guess, we show our work.
- 3. Every error teaches: code, cause, fix, and a copy‑paste rerun.
- 4. Nothing destructive without `--yes` or interactive confirmation.
- 5. All commands accept `--json` for scripting, with stable schemas.
- 6. Idempotent by default; re‑running never makes things worse.
- 7. Dry‑run is a first‑class path everywhere.
- 8. Output is quiet on success, rich on demand (`-v`, `--debug`).
- 9. Fast path beats cleverness; avoid magic state.
- 10. Docs mirror the CLI and vice‑versa; examples are runnable verbatim.

## Non‑Goals (v0)

- Cross‑host networking and remote registries (Local Node only).
- Full hermetic polyglot builds (future adapter work, not v0 scope).
- GUI front‑end; v0 is CLI‑first with excellent docs.

## Terminology

- Topology: Nodes and connections that the mkolbol runtime executes.
- Project Config (mk options): Orchestrator‑only settings in `.mk/options.json`.
- Profile: Named set of option overrides (e.g., `dev`, `ci`, `release`).
- Capsule: Portable, signed artifact (bundle + manifest + launcher contract).

## High‑Level Design

### Architecture Overview

```
            +-----------------------+
            |      mk (CLI)         |
            |  - commands           |
            |  - format adapters    |
            |  - project config     |
            |  - doctor/graph       |
            +-----------+-----------+
                        | JSON AST (canonical)
                        v
                 +------+------+
                 |  Topology   |  (shared kernel/server loader)
                 |  Loader     |  validate/normalize TopologyConfig
                 +------+------+
                        |
                        v
                 mkolbol runtime (Executor, Router, Modules)
```

Key points:
- mk owns developer ergonomics (format, defaults, profiles, UX) while deferring topology semantics and validation to the existing kernel loader. This avoids drift.
- All config is normalized to a canonical JSON AST. YAML/JSON adapters read/write only; comments/anchors are not preserved across translation (documented).

### Files & Locations

- Topology manifest: `mk.json` (default) or `mk.yaml` when `--yaml`/project preference is set.
- Project options: `.mk/options.json` (fully populated template, JSON only).
- Cache/state: `.mk/cache/`, `.mk/state/` (content‑addressed; safe to delete).
- Prompt helpers: printed by `mk prompt`; not written unless user opt‑in.

### Format Policy (JSON⇄YAML)

- Canonical in‑memory format is JSON.
- Adapters:
  - `yaml-in`: parse YAML → JSON AST.
  - `yaml-out`: serialize JSON AST → YAML.
- CLI precedence (highest→lowest):
  1) Flags (`--yaml`, `--yaml-in`, `--yaml-out`, `--format`) 
  2) Profile in `.mk/options.json`
  3) Environment variables (e.g., `MK_FORMAT=yaml`)
  4) File extension (mk.yaml → yaml-in default)
  5) Defaults (JSON for both in/out)
- Comment preservation: not guaranteed; `mk format --to yaml --dry-run` offers diffs.

### Project Options Schema (.mk/options.json)

JSON only; shipped as a fully populated example with inactive stubs. Users toggle fields by setting `enabled: true` for sections or by selecting a `profile`.

```json
{
  "$schema": "https://mkolbol.dev/schemas/mk-options.v0.json",
  "version": 0,
  "profiles": {
    "dev": { "format": { "in": "auto", "out": "auto" }, "gate": { "localNode": true }, "prompt": { "enabled": true } },
    "ci":  { "format": { "in": "json", "out": "json" }, "gate": { "localNode": true }, "prompt": { "enabled": false } },
    "release": { "format": { "in": "json", "out": "yaml" }, "packaging": { "capsule": { "enabled": true } } }
  },
  "activeProfile": "dev",
  "format": { "in": "auto", "out": "auto" },
  "gate": { "localNode": true },
  "prompt": { "enabled": false, "style": { "theme": "auto", "compact": true } },
  "packaging": {
    "bundle": { "enabled": true, "tool": "esbuild" },
    "image":  { "enabled": false, "base": "node:20-slim" },
    "capsule":{ "enabled": false, "sign": false }
  },
  "ci": { "laminar": { "prComment": true, "historyCache": true } },
  "doctor": { "checks": ["node-version", "permissions", "paths"] }
}
```

### CLI Surface (v0)

- `mk init [--lang js|py|rs|go] [--preset tty|filesink]` — scaffold a runnable sample topology and tests.
- `mk run [--file mk.(json|yaml)] [--watch] [--duration N] [--dry-run]` — run or validate.
- `mk test [--suite threads|process] [--report jsonl]` — run acceptance packs.
- `mk graph [--json|--yaml]` — print normalized topology and ASCII/JSON graph.
- `mk doctor [--section config|topology|health|permissions]` — preflight with remediations.
- `mk format --to json|yaml [--in-place|--dry-run]` — translate with diffs.
- `mk prompt [on|off|print]` — emit or toggle shell prompt snippet.
- `mk build [--target bundle|image|capsule]` — produce artifacts.
- `mk package [capsule|exe]` — package with provenance (exe path experimental).
- `mk ci plan` — emit CI matrix with Laminar and cache keys.

Flags affecting format I/O:
- `--yaml` (alias for `--yaml-in --yaml-out`)
- `--yaml-in`, `--yaml-out` (directional)
- `--format=auto|json|yaml` (supersedes the above when provided)

### Shell Prompt Integration (Optional)

`mk prompt print` emits a shell‑specific snippet that decorates the prompt with active mk modes, e.g. `[mk:local yaml dry-run]`. Users apply it explicitly:

```bash
# Bash/Zsh
eval "$(mk prompt print)"

# Fish
mk prompt print --shell fish | source

# PowerShell
mk prompt print --shell pwsh | Invoke-Expression
```

Design constraints:
- No implicit mutation of shell config files.
- `mk prompt off` prints a command to restore the previous prompt (tracked in `.mk/state/prompt.json`).
- Exposes environment (`MK_LOCAL_NODE`, `MK_FORMAT_IN`, `MK_FORMAT_OUT`, current profile) as readonly variables for other scripts.

### Output & Microcopy Style (Obsessive Edition)

Guarantees:
- Color by default on TTY with auto‑detect; no‑color fallback, `--no-color` respected.
- Always print a short, one‑line status first; then details.
- Include a remediation footer that links to a stable doc anchor.
- Error taxonomy maps 1:1 to machine‑readable JSON fields.

Examples (non‑TTY colors replaced with brackets):

```
[ERR] CONFIG_PARSE at mk.yaml:12:7 — invalid indent under "nodes".
Fix: run `mk format --to json --dry-run` to see a normalized form.
Docs: https://mkolbol.dev/docs/config#yaml-indentation
Code: CONFIG_PARSE  Rerun: mk run --file mk.yaml --dry-run
```

```
[OK ] Validated topology (7 nodes, 8 connections). Next: mk run
```

“Did you mean…” rules:
- Single edit distance on subcommands and flags.
- Suggest the top 1–2 matches; never auto‑correct without confirmation.

## UX Flows

### Golden Path (Hello in 60s)

1) `mk init --preset tty` → creates `mk.json`, `.mk/options.json`, tests, and `src/hello.ts`.
2) `mk run` → runs the preset topology; TTY output appears; `mk endpoints --watch` optional via mkctl.
3) `mk doctor` → passes or prints exact remediations with copy‑paste commands.

### “Hello Calculator” Tutorial

Minimal server (in‑proc) wired to TTYRenderer and optional FilesystemSink JSONL.

JSON authoring (default):

```json
{
  "topology": {
    "nodes": [
      { "id": "calc", "module": "CalculatorServer", "runMode": "inproc", "params": {} },
      { "id": "tty",  "module": "TTYRenderer", "runMode": "inproc", "params": { "target": "stdout" } },
      { "id": "logs", "module": "FilesystemSink", "runMode": "inproc", "params": { "path": "logs/out.jsonl", "format": "jsonl" } }
    ],
    "connections": [
      { "from": "calc.output", "to": "tty.input" },
      { "from": "calc.output", "to": "logs.input" }
    ]
  }
}
```

Switch to YAML authoring:

```bash
mk format --to yaml --in-place   # writes mk.yaml next to mk.json (or replaces per flag)
mk run --yaml                    # respect YAML both in/out for this session
```

### Format Translation Caveats

- YAML comments/anchors are not preserved on JSON→YAML→JSON round trips.
- `mk format --dry-run` shows unified diffs and warns before overwriting.

Accessibility:
- Provide `--no-ansi` for plain output; ensure ASCII graphs.
- Respect `$LANG` for number/date formatting (messages remain English v0).
- Avoid hard‑coded red/green pairs; ensure contrast.

## Validation & Error Taxonomy

mk delegates topology validation to the kernel loader and maps errors to friendly messages:

- `CONFIG_NOT_FOUND` — file not found; shows searched paths and a `mk init` hint.
- `CONFIG_PARSE` — invalid JSON/YAML; shows line/column and a minimal diff.
- `SCHEMA_INVALID` — kernel loader schema mismatch; highlights offending path.
- `RUNTIME_GATE` — rejected by Local Node gate; suggests allowed fields.
- `PERMISSION_DENIED` — doctor prints which permission flag to enable.

All errors include: short code, human message, remediation steps, and a copy‑paste rerun.

Scripting contract:
- `--json` adds a machine payload: `{ code, message, remediation, details, docs, hint }`.
- Exit codes are stable and documented; non‑zero on any failure.

Joy gates (quantitative):
- Time‑to‑first‑run (TTFR): ≤ 60s on a clean machine with Node installed.
- Time‑to‑recovery (TTR) from a common parse error: ≤ 30s following printed fix.
- CLI latency: `mk run --dry-run` returns in < 400 ms on the example repo.
- Docs hop count: ≤ 2 clicks from Quickstart to any mentioned flag’s reference.

## Implementation Plan (Phased)

### Phase A — Foundations (v0 scope, 1–2 sprints)

- CLI skeleton: `mk init/run/test/doctor/graph/format/prompt/build/package/ci plan` (stubs allowed where noted below).
- Project options: introduce `.mk/options.json`; load/merge precedence logic.
- Format adapters: ✅ **COMPLETED** — `src/mk/format.ts` with `yamlToJson()`, `jsonToYaml()`, `detectFormat()`.
- CLI flags: ✅ **COMPLETED** — `scripts/mk.ts` with `--yaml`, `--yaml-in`, `--yaml-out`, `--format json|yaml|auto`.
- Canonical JSON AST + stable serialization (deterministic key order).
- Prompt integration: print/off/print‑shell, state tracked under `.mk/state/`.
- Reuse kernel loader: normalize/validate topology; align error mapping.
- Docs: First Five Minutes for mk; Hello Calculator tutorial; format caveats.
- Microcopy: land `docs/devex/mk-dx-style.md` with examples and tests (snapshot the CLI help and 10 canonical errors).
- Checklist: add `docs/devex/mk-dx-checklist.md` and require it in PR template.

### Phase B — Packaging & Distribution (v0+)

- `mk build --target bundle` via esbuild; emit provenance metadata.
- `mk package capsule` (capsule v0 spec, unsigned); deterministic filename.
- Optional `mk image` (OCI manifest from mk.json) after v0.

### Phase C — Dev Ergonomics

- Hot reload with `mk dev` (in‑proc module restarts when files change).
- `mk logs` (structured tail with filters) and `mk trace` (sampled flow timings).
- Recipes: `mk recipes` lists copy‑paste idioms (tee->filesink jsonl, rate‑limit, etc.).

## Security & Policy

- Local Node gate enforced when `MK_LOCAL_NODE=1` or profile enables it; disallow network transports.
- Permissions modeled after Deno (fs/net/process); `mk doctor` surfaces required flags.
- Secrets via environment and provider adapters (doc only in v0; implementation later).

## Observability & CI

- Laminar: reuse existing reporters; `mk ci plan` emits GitHub Actions matrix and cache keys.
- Artifacts: graphs, normalized manifests, and history written to `reports/`.
- DX telemetry (local‑only, opt‑in via options.json): record TTFR/TTR locally to `reports/dx-metrics.jsonl`; never uploads.
- Style & checklist are normative: see `docs/devex/mk-dx-style.md` and `docs/devex/mk-dx-checklist.md`.

## Open Questions

1) Should `mk` subsume `mkctl` long‑term or remain complementary? (v0: complementary.)
2) Do we require signed capsules in v0, or defer to v1? (Proposal: defer.)
3) How opinionated should profiles be out of the box? (Proposal: dev/ci/release.)

## Risks & Mitigations

- Drift between mk and runtime validation → Mitigation: single loader for topology.
- YAML round‑trip surprises → Mitigation: default JSON, dry‑run with explicit diffs.
- Shell prompt fragility → Mitigation: print‑only, opt‑in, reversible, state tracked.
- Scope creep → Mitigation: keep v0 CLI minimal; push advanced features to later phases.

## Acceptance Criteria (v0)

- New developer completes: `mk init` → `mk run` → `mk doctor` → `mk format --to yaml` → `mk run --yaml` in under 10 minutes with zero prior knowledge.
- `.mk/options.json` exists, is fully populated, and correctly influences mk behavior.
- `mk format` reliably converts JSON⇄YAML with correct precedence rules and clear caveats.
- Prompt snippet displays active modes and is reversible without shell breakage.
- CI plan emitter works; Laminar summaries integrate as they do today.
- CLI help passes snapshot tests; error microcopy matches style guide.

## Appendix A — Minimal Schemas (informal)

TopologyConfig (delegated to kernel loader):

```ts
interface TopologyConfig {
  nodes: Array<{ id: string; module: string; runMode: 'inproc'|'worker'|'process'; params?: Record<string, unknown> }>;
  connections: Array<{ from: string; to: string }>;
}
```

ProjectOptions (this RFC): see JSON example above. Formal JSON Schema will be added in implementation.

## Appendix B — Example Commands

```bash
# JSON by default
mk init --preset tty
mk run

# Opt into YAML for both directions
mk format --to yaml --in-place
mk run --yaml

# Directional control
mk run --yaml-in            # read mk.yaml, write JSON artifacts
mk graph --yaml             # print graph in YAML

# Prompt
eval "$(mk prompt print)"
mk prompt off
```

## Appendix C — Format Adapter Implementation

### Module: src/mk/format.ts

Provides three core functions for JSON↔YAML conversion:

```typescript
yamlToJson(yaml: string): object
  - Parses YAML string to JSON object (canonical in-memory format)
  - Throws on parse errors or invalid structure
  - Uses yaml@2.3.4 package

jsonToYaml(json: object): string
  - Serializes JSON object to YAML string
  - Configures: 2-space indent, 100-char line width, plain keys/strings
  - Throws on serialization errors

detectFormat(content: string): 'json' | 'yaml'
  - Heuristically detects format from content
  - Checks for leading { or [ → attempts JSON parse
  - Fallback: assumes YAML
```

### CLI: scripts/mk.ts

Flag precedence (highest → lowest):
1. `--format json|yaml|auto` (supersedes all)
2. `--yaml` (alias for `--yaml-in --yaml-out`)
3. `--yaml-in` or `--yaml-out` (directional)
4. File extension (`.yaml`, `.yml` → yaml-in default)
5. Default: JSON

Commands implemented:
- `mk format --to json|yaml [--in-place] [--dry-run] [--file <path>]`
- `mk help`

Example usage:
```bash
mk format --to yaml --in-place           # mk.json → mk.yaml
mk format --to json --dry-run            # Preview conversion
mk format --yaml-in --file mk.yaml       # Read YAML, output JSON
```

