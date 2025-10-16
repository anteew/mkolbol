# Sprint P10 Workflow & Process Documentation

**Date**: 2025-10-17
**Sprint**: SB-DEVEX-LAMINAR-VISIBILITY-P10 + SB-MK-CONFIG-PROCESS-P1 (shared branch: `mkolbol-devex-p7`)
**Role**: Vex (Claude Code) — DevEx + Laminar Infrastructure Architect
**Shared Branch**: `mkolbol-devex-p7` (contains work from both Vex and Susan)

---

## Sprint Workflow Overview

### 1. Git & Branch Management

**Key Pattern**: All development happens on shared sprint branch, NOT on main
- Current branch: `mkolbol-devex-p7` (pre-created by architect)
- Main branch: `main` (read-only during sprint; PR raised by architect at end)
- Role split:
  - **Me (Vex)**: Commit to `mkolbol-devex-p7`, push to remote
  - **Susan**: Commit to `mkolbol-devex-p7`, push to remote
  - **Architect (VEGA)**: Raises PR from `mkolbol-devex-p7` → `main`, merges, pulls on main, branches for next sprint

**No PRs from individual agents**: Only architect creates PRs

### 2. Commit Process

**Standard flow**:
1. Stage files: `git add <files>`
2. Commit with comprehensive message (include task IDs, accomplishments, files changed)
3. Push with `-u` flag first time: `git push -u origin mkolbol-devex-p7`
4. Subsequent pushes: `git push`

**Commit message format**:
```
[TASK_ID_PATTERN] Short summary — accomplishments

## Wave Context (if applicable)
- LAM-1001: Feature description
- LAM-1002: Feature description

## Files Modified/Created
- new: scripts/file.js
- modified: .github/workflows/tests.yml
- modified: package.json
- modified: docs/devex/guide.md

## Notes
- Implementation details
- Design decisions
- Blockers (if any)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### 3. Project Structure

**Key directories**:
- `/scripts/` — CLI scripts (mkctl, laminar helpers)
- `/docs/devex/` — Developer documentation
- `.github/workflows/tests.yml` — CI pipeline
- `package.json` — NPM scripts + dependencies
- `Vex/` — This directory (knowledge base)
- `ampcode.log` — Execution report for architect

### 4. Deliverables Tracking

**Three levels of tracking**:

1. **Git commit**: `git log` shows implementation progress
2. **ampcode.log**: Comprehensive report for architect review
3. **Vex/sprint10-investigation.md** (or similar): Task breakdown with status

---

## Sprint P10 Specific: Laminar CI Visibility + DevEx

### Wave DX-10A: Laminar CI Visibility (4 Tasks)

**LAM-1001: Persistent Trends History**
- Script: `scripts/append-laminar-history.js` (47 lines)
- Reads: `reports/summary.jsonl` (per-run test results)
- Outputs: Appends to `reports/history.jsonl` (persistent across runs via GitHub Actions cache)
- NPM script: `lam:append-history`
- CI integration: Cache key `laminar-history-trends`

**LAM-1002: Suite Tagging per Lane**
- Where: `.github/workflows/tests.yml` + `package.json`
- Pattern: Add `LAMINAR_SUITE` environment variable to each test lane
  - threads lane: `LAMINAR_SUITE=threads`
  - forks lane: `LAMINAR_SUITE=forks`
  - process-unix lane: `LAMINAR_SUITE=process-unix`
- Laminar reporter already captures env vars; no new reporter changes needed

**LAM-1003: PR Comments with Laminar Summary**
- Script: `scripts/post-laminar-pr-comment.js` (110 lines)
- Reads: `reports/LAMINAR_SUMMARY.txt` + `reports/LAMINAR_TRENDS.txt`
- Posts: Formatted markdown comment via `gh pr comment` CLI
- Error handling: Gracefully skips if not PR event, token unavailable, or files missing
- CI integration: Best-effort pattern with `continue-on-error: true`

**LAM-1004: Auto-Generated Repro Artifacts**
- Script: `scripts/generate-laminar-repro.js` (180 lines)
- Reads: `reports/summary.jsonl` for failed tests
- Outputs: `LAMINAR_REPRO.md` with reproduction steps, TEST_SEED values, debugging tips
- Key: Only generates when failures exist (graceful skip on all-pass runs)

### Wave DX-10B: DevEx Refinement (3 Tasks)

**DEVEX-103: mkctl Exit Codes Reference**
- File: `docs/devex/mkctl-cookbook.md`
- Adds: Exit codes table (0, 64, 65, 66, 70, 130) with meanings
- Adds: Shell scripting patterns for error handling

**DEVEX-102: First Five Minutes Landing**
- File: `docs/devex/first-five-minutes.md` (1,229 words)
- Delivery: Subagent (general-purpose agent)
- Content: 5-minute quickstart with copy-paste commands and expected output

**DEVEX-101: FilesystemSink Quickstart**
- Status: BLOCKED (awaiting Susan's FilesystemSink module)
- Planned: `examples/configs/http-logs-local-file.yml` variant

---

## ES Module Gotchas

**Project config**: `package.json` has `"type": "module"`

This means:
- All `.js` files are treated as ES modules
- Must use `import/export` instead of `require()`
- Must handle `__dirname` with: `import { fileURLToPath } from 'url'; const __dirname = path.dirname(fileURLToPath(import.meta.url))`

**Error if using CommonJS in ES module project**:
```
ReferenceError: require is not defined in ES module scope
```

**Fix**: Convert all `require()` to `import()`

---

## CI/CD Pattern: Best-Effort Steps

**Key insight**: Never let optional CI steps break the workflow

Pattern for new CI steps:
```yaml
- name: Optional Step Name
  if: ${{ always() }}
  continue-on-error: true
  run: npm run lam:optional-task || true
```

This ensures:
- Step runs even if previous steps failed (always())
- Step failures don't break CI (continue-on-error: true)
- Explicit `|| true` provides extra safety net

---

## Laminar Architecture Lessons Learned

### What Laminar Does
- Test observability tool for AI agents
- Protects context windows by creating compact test failure digests
- Captures per-test results in JSONL format with environment variables

### Key Files
- `reports/summary.jsonl` — Per-run test results (generated by Laminar reporter)
- `reports/history.jsonl` — Historical accumulation (user-managed via scripts)
- Laminar reporter reads environment variables (e.g., `LAMINAR_SUITE`)

### Trends Workflow
1. Tests run → Laminar reporter generates `reports/summary.jsonl`
2. `npm run lam:append-history` → Appends to `reports/history.jsonl`
3. GitHub Actions cache preserves history.jsonl
4. `npm run lam -- trends` reads history and shows patterns

---

## Deployment Checklist for Next Sprint

When rehydrating or continuing:

1. **Verify branch**: `git rev-parse --abbrev-ref HEAD` (should be `mkolbol-devex-p7`)
2. **Check status**: `git status` (see what's staged/modified)
3. **Verify build**: `npm run build` (must pass)
4. **Check scripts**: `npm run lam:append-history` (graceful skip if no summary.jsonl)
5. **Update ampcode.log**: Append new sprint report before committing
6. **Commit & push**: Follow commit message format above
7. **Notify architect**: Work is ready for PR

---

## Known Issues & Workarounds

**Issue**: GitHub Actions cache miss on first run
- **Workaround**: history.jsonl created automatically on first append if missing

**Issue**: ES module `__dirname` not available
- **Workaround**: Use `import { fileURLToPath } from 'url'`

**Issue**: PR comment fails silently if not in PR event
- **Workaround**: Script checks `GITHUB_EVENT_NAME` and skips gracefully

---

## File Locations Reference

| Purpose | Path |
|---------|------|
| Laminar scripts | `/srv/repos0/mkolbol/scripts/{append,repro,pr-comment}-*.js` |
| CI workflow | `/srv/repos0/mkolbol/.github/workflows/tests.yml` |
| NPM scripts config | `/srv/repos0/mkolbol/package.json` |
| DevEx docs | `/srv/repos0/mkolbol/docs/devex/` |
| Execution report | `/srv/repos0/mkolbol/ampcode.log` |
| Knowledge base | `/srv/repos0/mkolbol/Vex/` |

---

## Success Metrics

**Sprint P10 achieved**:
- ✅ 4/4 Laminar infrastructure tasks complete
- ✅ 3/3 DevEx tasks accounted for (2 complete, 1 blocked externally)
- ✅ Zero kernel modifications
- ✅ Build passes with no regressions
- ✅ All scripts have graceful error handling
- ✅ Documentation complete and cross-linked
- ✅ Committed to shared sprint branch
- ✅ ampcode.log updated for architect review

---

**Next Sprint Handoff**: Work is on `mkolbol-devex-p7`, ready for architect to coordinate with Susan's work before PR to main.

---

Generated: 2025-10-17
Agent: Vex (Claude Code) — DevEx + Laminar Infrastructure Architect
