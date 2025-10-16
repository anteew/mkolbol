# Sprint 11 Investigation & Task Breakdown

**Sprint**: SB-DEVEX-LAMINAR-REFINEMENT-P11
**Date**: 2025-10-17
**Participants**: Vex (Claude Code) — Laminar + DevEx lead
**Branch**: `mkolbol-devex-p7` (shared with Susan)

---

## Sprint Goal

Strengthen CI insight (cache keys, aggregated PR comment, flake budget) and expand FileSink acceptance walkthroughs; keep early-adopter docs cohesive with upcoming mkctl/health features.

---

## Wave Structure

### Wave DX-11A: Laminar CI Refinement (3 Tasks, Parallel)

#### LAM-1101: Laminar cache keys per node+branch; aggregate PR comment
- **Complexity**: Medium
- **Current state**: PR comment script (post-laminar-pr-comment.js) posts individual comments
- **Goal**:
  - Cache keys should be per-node (e.g., `laminar-history-node20`, `laminar-history-node24`)
  - Single aggregated PR comment instead of per-node comments
- **Files to modify**:
  - `.github/workflows/tests.yml` (cache keys, comment aggregation logic)
  - `scripts/post-laminar-pr-comment.js` (aggregate logic)
- **Key insight**: Currently matrix runs Node 20 & 24 separately; each run generates its own comment. Need to consolidate into one comment per PR
- **Deliverable**: `patches/DIFF_LAM-1101_cache-keys-aggregate.patch`

#### LAM-1102: Flake budget summary in PR (last 5 runs)
- **Complexity**: Medium
- **Current state**: history.jsonl accumulates all test results, but no flake budget analysis in PR comment
- **Goal**: Extract flake data from history (last 5 runs) and show in PR comment
  - E.g., "Failures appearing ≥2 times in last 5 runs: X"
  - Link flaky tests for quick debugging
- **Files to modify**:
  - `scripts/post-laminar-pr-comment.js` (add flake budget section)
  - `scripts/append-laminar-history.js` (may need metadata tweaks if tracking run count)
- **Key insight**: Flake budget = failures that recur frequently (sign of environmental issues vs new bugs)
- **Deliverable**: `patches/DIFF_LAM-1102_flake-budget.patch`

#### LAM-1103: Acceptance smoke job: run mkctl http-logs-local-file.yml in CI (best-effort)
- **Complexity**: Low-Medium
- **Current state**: http-logs-local.yml exists (uses ConsoleSink); http-logs-local-file.yml blocked on FilesystemSink availability
- **Goal**: Add CI job that runs `mkctl run --file examples/configs/http-logs-local-file.yml` for 10s to validate FileSink works in CI
- **Prerequisites**: FilesystemSink must be available from Susan's sprint (SB-MK-CONFIG-PROCESS-P1)
- **Files to modify**:
  - `.github/workflows/tests.yml` (add smoke test job)
  - `examples/configs/http-logs-local-file.yml` (ensure exists and is valid)
- **Key insight**: Validates that acceptance use case (logging to file) actually works in practice
- **Deliverable**: `patches/DIFF_LAM-1103_acceptance-smoke.patch`

---

### Wave DX-11B: Acceptance Docs (3 Tasks, Parallel)

#### DEVEX-111: Acceptance doc: expand FileSink walkthrough end-to-end
- **Complexity**: Medium
- **Current state**: acceptance/local-node-v1.md exists with basic patterns; needs FileSink-specific walkthrough
- **Goal**: Create step-by-step guide showing:
  1. Define HTTP endpoint (ExternalProcess + curl)
  2. Pipe to FilesystemSink with append mode
  3. Validate logs in file
  4. Show how to use `mkctl tail` to read logs
- **Files to modify**:
  - `tests/devex/acceptance/local-node-v1.md` (add FileSink section)
  - `docs/devex/quickstart.md` (link to acceptance doc)
- **Key insight**: This is the "golden path" for early adopters wanting to log to files locally
- **Deliverable**: `patches/DIFF_DEVEX-111_filesink-walkthrough.patch`

#### DEVEX-112: First Five Minutes: polish and add troubleshooting anchors
- **Complexity**: Low
- **Current state**: first-five-minutes.md exists (1,229 words from P10 subagent)
- **Goal**:
  - Polish prose for clarity and flow
  - Add anchor links to troubleshooting.md for common issues
  - Ensure examples still use correct node IDs and config paths
- **Files to modify**:
  - `docs/devex/first-five-minutes.md` (polish + anchors)
  - `README.md` (ensure link to first-five-minutes is prominent)
- **Key insight**: This is the critical entry point for new users; must be perfect
- **Deliverable**: `patches/DIFF_DEVEX-112_first-five-minutes-polish.patch`

#### DEVEX-113: mkctl cookbook: add endpoints --json + filters + health error mapping
- **Complexity**: Low-Medium
- **Current state**: mkctl-cookbook.md has exit codes and basic patterns
- **Goal**: Add sections for:
  - `mkctl endpoints --json` (JSON output for scripting)
  - Endpoint filtering examples (--filter type=inproc, etc.)
  - Health error mapping (how exit codes from mkctl relate to health status)
- **Files to modify**:
  - `docs/devex/mkctl-cookbook.md` (add 3 new sections)
- **Key insight**: Developers integrating mkctl into scripts need these details
- **Deliverable**: `patches/DIFF_DEVEX-113_mkctl-cookbook-updates.patch`

---

## Task Dependencies & Blockers

### Hard Blockers
- **LAM-1103** depends on FilesystemSink module from Susan's sprint
  - **Mitigation**: Can placeholder the config file; mark smoke job as best-effort with `continue-on-error: true`

### Soft Dependencies
- **DEVEX-111** should cross-reference acceptance patterns from LAM-1103 (so do LAM-1103 first if possible)
- **DEVEX-112** should verify first-five-minutes links don't break (check after DEVEX-111)

### Wave Parallelization
- **DX-11A**: All 3 Laminar tasks can run in parallel (independent file changes)
- **DX-11B**: All 3 DevEx tasks can run in parallel (independent doc sections)
- **Cross-wave**: Can start both waves in parallel

---

## Key Technical Insights

### Cache Keys Per Node/Branch

**Current pattern** (P10):
```yaml
cache:
  path: reports/history.jsonl
  key: laminar-history-trends
```

**New pattern** (P11):
```yaml
cache:
  path: reports/history.jsonl
  key: laminar-history-${{ matrix.node }}-${{ github.ref }}
```

This ensures:
- Node 20 history separate from Node 24
- Branch-specific history (main ≠ feature branches)
- No cross-contamination between contexts

### Aggregated PR Comment

**Current pattern** (P10):
- Each matrix job posts its own comment
- Result: Multiple comments on PR (confusing)

**New pattern** (P11):
- Collect all results in CI artifacts
- Post-job step aggregates and posts single comment
- Result: One clean comment per PR with all node data

### Flake Budget Calculation

**Definition**: Tests failing ≥2 times in the last 5 CI runs

**Implementation**:
1. Parse history.jsonl (sorted by timestamp)
2. Keep last 5 runs only
3. Count failures per test name
4. Filter to tests with count ≥2
5. Format as "Flaky tests (≥2 failures in last 5 runs): X tests"

---

## Acceptance Criteria (from devex.md)

✅ Laminar history uses per-node/per-branch cache keys
✅ Single aggregated PR comment per run (not multiple)
✅ PR comment includes flake budget summary (e.g., ≥2 failures in last 5 runs)
✅ Acceptance doc shows complete FileSink flow
✅ quickstart + first-five-minutes remain consistent
✅ Cookbook documents endpoints --json, filters, health error mapping

---

## Verification Commands

```bash
export MK_LOCAL_NODE=1
npm run build
npm run test:ci
MK_PROCESS_EXPERIMENTAL=1 npm run test:pty
```

---

## Known Risks & Mitigations

### Risk 1: FilesystemSink not delivered on time (LAM-1103 blocker)
- **Mitigation**: Create placeholder config with comments; mark smoke job as best-effort
- **Fallback**: Deploy LAM-1101, LAM-1102, other DevEx tasks; defer smoke job to P12

### Risk 2: Multiple PR comments still posted (aggregation logic fails)
- **Mitigation**: Test with dual-node matrix locally before CI
- **Fallback**: Revert to per-node comments; note as technical debt

### Risk 3: Flake budget calculation too slow or memory-intensive
- **Mitigation**: Limit history parsing to last 100 runs (not all-time)
- **Fallback**: Show summary count only (don't list individual flaky tests)

---

## Sprint Autonomy Notes

From devex.md:
> "You continue to own 'Laminar and test strategy improvements.' You may run mini-sprints; create `Vex/minisprints/vex-sprint11-ms1.md` and log updates in `Vex/devex.log`."

**What this means**:
- I can decide execution order of tasks
- Can propose sub-tasks or refactoring if it accelerates Local Node v1.0
- Should create mini-sprint docs for complex feature work
- Log decisions and learnings in devex.log for future reference

**Outstanding items to sweep from P10**:
- Check Vex/sprint10-investigation.md for any deferred or partially-complete work
- Pull into P11 if it accelerates goals

---

## Execution Plan

### Phase 1: Investigation & Setup (5 min)
1. Verify current state of P10 artifacts (cache behavior, PR comments)
2. Check if FilesystemSink is available in repo
3. Review first-five-minutes.md prose for quality

### Phase 2: LAM Tasks (Parallel, ~60 min)
1. **LAM-1101** (~20 min): Implement per-node/branch cache keys + aggregation logic
2. **LAM-1102** (~25 min): Implement flake budget calculation and PR comment section
3. **LAM-1103** (~15 min): Create smoke job config (or placeholder if FileSink not ready)

### Phase 3: DEVEX Tasks (Parallel, ~40 min)
1. **DEVEX-111** (~15 min): Expand FileSink walkthrough (cross-ref LAM-1103 if available)
2. **DEVEX-112** (~15 min): Polish first-five-minutes + add troubleshooting anchors
3. **DEVEX-113** (~10 min): Add cookbook sections for endpoints --json and health mapping

### Phase 4: Integration & Verification (15 min)
1. Run full verification suite (`npm run build`, `npm run test:ci`, `npm run test:pty`)
2. Check cross-doc links and anchors
3. Update ampcode.log with comprehensive report
4. Commit & push to mkolbol-devex-p7

---

## Success Metrics

- ✅ All 6 tasks completed or documented (with blockers noted)
- ✅ Build passing; no test regressions
- ✅ PR comments show aggregated data from both nodes
- ✅ Flake budget section appears in PR comments
- ✅ Acceptance docs cohesive and link correctly
- ✅ Early-adopter docs (first-five-minutes) polished
- ✅ Cookbook ready for endpoints feature expansion
- ✅ Committed to mkolbol-devex-p7, ready for architect PR

---

Generated: 2025-10-17
Agent: Vex (Claude Code) — Laminar Infrastructure + DevEx Lead
