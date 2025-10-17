# MK Dev Orchestrator — RFC v1: Distribution, Bootstrap, and “mk Anywhere”

Version: 1.0 (Draft)
Date: 2025-10-16
Status: Draft (Request for Comments)
Owners: VEGA (architecture), DevEx (Vex), Core (Susan)
Related: MK Dev Orchestrator — RFC v0 (CLI & UX)

## Executive Summary

We want developers (and naive agents) to use `mk` from anywhere, without publishing to npm. This RFC describes a simple, robust distribution and bootstrap model that makes `mk` feel like a Go‑style single command while staying Node‑native under the hood.

We propose:

- A tiny, cross‑platform shim installer (`mk self install`) that places `mk` on PATH.
- A one‑liner installer script for fresh machines (curl | bash, PowerShell variant).
- `mk bootstrap <app-dir>` to scaffold an out‑of‑tree app and install mkolbol as a dependency (tarball/file/git tag).
- Versioned toolchains cached under `~/.mk/toolchains/` with `mk fetch` and `mk self switch`.
- Optional later: true single‑exe builds for `mk` (no native deps), keeping runtime modules outside the CLI binary.

This delivers a “binary‑like” experience today (via shims) and a clean path to true single executables later if we want them.

## Goals

- “mk anywhere” with zero global npm publish.
- First success for naive users in under 60 seconds on a clean machine.
- Clean, auditable installs; no surprise mutations (no PATH edits without user consent).
- Versioned, reproducible toolchains and offline re‑use.
- Cross‑platform support (Linux/macOS/Windows PowerShell).

## Non‑Goals (for v1)

- Shipping native single‑exe for modules with native deps (e.g., node‑pty). We keep that for a later phase.
- Automatic system‑wide PATH edits. We print exact instructions; users opt‑in.

## Problem Statement

Developers cloning the repo can run `node dist/scripts/mk.js …`, but building apps outside the repo requires installing mkolbol. We do not publish to npm by design. We need a frictionless way to:

- “Install” `mk` once and call it anywhere.
- Bootstrap an out‑of‑tree app that depends on mkolbol without manual wiring.
- Switch toolchain versions, fetch releases, and stay reproducible.

## Design Overview

### Toolchain Cache

- Root: `~/.mk/toolchains/`
- Layout:
  - `~/.mk/toolchains/<tag>/` — unpacked toolchain (dist/, scripts/, tarball, manifest.json)
  - `~/.mk/toolchains/local-<commit>/` — local build captured from a repo checkout
- Tarball file (optional): `mkolbol-<version>.tgz` inside each toolchain
- Checksums: `checksums.json` (SHA‑256 of relevant files)

### Shim Install (mk self install)

- POSIX shim at `~/.local/bin/mk`:
  ```sh
  #!/usr/bin/env bash
  exec node "/ABS/PATH/TO/TOOLCHAIN/dist/scripts/mk.js" "$@"
  ```
- `mkctl` shim similarly points at `dist/scripts/mkctl.js`.
- Windows: `mk.cmd` + `mk.ps1` in `%USERPROFILE%\bin` or `%USERPROFILE%\AppData\Local\mkolbol\bin`.
- `mk self where` shows the active toolchain & shim paths; `mk self uninstall` removes them.
- PATH changes are never automated; we print instructions to add `~/.local/bin` (POSIX) or the chosen bin directory (Windows) to PATH.

### Sources for mk self install

- `--from repo` (default): uses the current repo’s `dist/` (build if missing). Optionally copies into `~/.mk/toolchains/local-<commit>/` to make the shim independent of repo moves.
- `--from tag <vX>`: fetches release tarball into `~/.mk/toolchains/<tag>/` (see `mk fetch`).
- `--from path <dir>`: points to an existing built toolchain (advanced).

### One‑Liner Installer (scripts/mk-install.sh)

- Usage:
  ```sh
  curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/main/scripts/mk-install.sh | bash -s -- --from repo --repo /path/to/mkolbol
  curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/main/scripts/mk-install.sh | bash -s -- --tag v0.2.0
  ```
- Performs: Node ≥20 check → optional clone/pull → `npm ci && npm run build` → create shim(s) → prints PATH instructions.
- PowerShell variant for Windows.

### Bootstrapping Out‑of‑Tree Apps (mk bootstrap)

```
mk bootstrap <app-dir> [--from tarball|git|local] [--tag vX] [--tar <path>] [--yes]
```

- Creates `<app-dir>` with:
  - `package.json` containing a dependency on mkolbol (tarball/file/git URL)
  - `src/` and a minimal starter
  - `mk.json` (topology) and `.mk/options.json`
  - npm scripts: `{ "mk": "node node_modules/mkolbol/dist/scripts/mk.js" }`
- Runs `npm install` and `mk run mk.json --dry-run` to verify.
- Defaults:
  - If `~/.mk/toolchains/<tag>/mkolbol-<tag>.tgz` exists, uses `file:` tarball for speed/offline.
  - Else, if repo tarball available: uses that path.
  - Else, `--from git` with a specific tag (deterministic).

### Fetching Toolchains (mk fetch, mk self switch)

- `mk fetch <tag>`: downloads release tarball + manifest into cache; verifies SHA‑256.
- `mk self switch <tag|local-<commit>>`: repoints the shim to another cached toolchain.
- `mk self update`: convenience for “fetch latest stable and switch”.

### Single‑Exe Plan (Later)

- Optional experiment: bun compile / nexe for `mk` only (CLI, no native deps).
- Keep external process/PTY features in the runtime, not inside the CLI binary.
- Deliver per‑platform binaries under releases with the same toolchain semantics.

## Security & Trust

- No implicit PATH mutation. We echo explicit export/setx commands with the target directory and verify write perms before creating shims.
- Release tarballs are checksum‑verified (`checksums.json`).
- `mk doctor` extended with `paths.bin`, `toolchain.integrity`, `shim.target` checks.
- Source trust surfaces:
  - `--from repo`: local machine build (trusted by the user)
  - `--from tag`: GitHub release (TLS + public checksums)
  - `--from path`: explicit user‑provided directory

## Cross‑Platform Matrix

- POSIX: `~/.local/bin` default (create if missing). Shebang + `exec node …`.
- macOS (Homebrew users): we still default to `~/.local/bin`; doc a brew‑style path if desired.
- Windows: emit `mk.cmd` and `mk.ps1`; prefer `%USERPROFILE%\bin` (document adding to PATH).

## User Stories

- “I cloned the repo, I want `mk` everywhere”: `mk self install` → add `~/.local/bin` to PATH → `mk --help` works in any folder.
- “I want to start a new project outside the repo”: `mk bootstrap ~/apps/myapp` creates an out‑of‑tree app; `npm run mk -- run mk.json --dry-run` is green.
- “I need a specific version”: `mk fetch v0.2.0 && mk self switch v0.2.0`.
- “Air‑gapped/offline”: copy a tarball to `~/.mk/toolchains/` and bootstrap via `file:`.

## CLI Additions (v1 scope)

```
mk self install [--from repo|tag|path] [--tag vX] [--bin-dir <dir>] [--copy]
mk self uninstall
mk self where
mk self switch <tag|local-commit>
mk fetch <tag> [--url <override>] [--checksum <sha256>]
mk bootstrap <app-dir> [--from tarball|git|local] [--tag vX] [--tar <path>] [--yes]
```

Notes:

- `--copy`: copy the current repo toolchain into `~/.mk/toolchains/local-<commit>/` and point the shim there (stable even if repo moves).
- `mkctl` handled automatically: `mk self install` also creates a `mkctl` shim.

## Implementation Plan

Phase A — Shims & Self Install (POSIX + Windows)

- Add `mk self install/uninstall/where/switch`.
- Create POSIX/Windows shims in user bin dir; PATH instructions printed.
- Add `mk doctor` checks for shim/toolchain.

Phase B — Bootstrap

- Add `mk bootstrap <app-dir>` with dependency source selection.
- Scaffold template; set `package.json` scripts to `node node_modules/mkolbol/dist/scripts/mk.js`.

Phase C — Toolchain Fetch & Switch

- Add `mk fetch <tag>`; verify checksums and cache artifacts.
- Add `mk self switch`.

Phase D — One‑Liner Installer

- Add `scripts/mk-install.sh` and Windows PowerShell variant.
- Docs: top‑level README + DevEx guides.

Phase E — (Optional) Single‑Exe Experiment

- Explore bun compile/nexe for CLI only; document caveats.

## Acceptance Criteria

- Fresh machine → one‑liner installer → `mk --help` works anywhere after PATH step.
- `mk self install --from repo` works from a repo clone; `mk self where` shows absolute paths.
- `mk bootstrap ~/work/calc` creates an out‑of‑tree app; `npm run mk -- run mk.json --dry-run` passes.
- `mk fetch vX && mk self switch vX` flips between versions; `mk doctor` shows consistent state.
- Docs: top README has Quickstart; DevEx pages updated; examples runnable.

## Alternatives Considered

- Publish to npm: fast discovery but raises scope/visibility concerns; deferred by design.
- Global symlink into repo `dist/`: breaks if repo path changes; `--copy` addresses this by freezing a local toolchain into cache.
- Single‑exe only: attractive UX but more moving parts; keep as optional Phase E.

## Appendix A — Shim Templates

POSIX `mk`:

```sh
#!/usr/bin/env bash
set -euo pipefail
MK_TOOLCHAIN_DIR="${MK_TOOLCHAIN_DIR:-$HOME/.mk/toolchains/current}"
exec node "$MK_TOOLCHAIN_DIR/dist/scripts/mk.js" "$@"
```

Windows `mk.cmd`:

```bat
@echo off
setlocal
set MK_TOOLCHAIN_DIR=%USERPROFILE%\AppData\Local\mkolbol\toolchains\current
node "%MK_TOOLCHAIN_DIR%\dist\scripts\mk.js" %*
```

Windows PowerShell `mk.ps1`:

```powershell
$toolchain = "$env:USERPROFILE\AppData\Local\mkolbol\toolchains\current"
node "$toolchain\dist\scripts\mk.js" $args
```

(Install commands write a concrete target instead of `current`, or maintain a `current` symlink that `mk self switch` updates.)

---

End of RFC.
