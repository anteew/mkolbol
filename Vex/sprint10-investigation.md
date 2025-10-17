# Sprint 10 Investigation: Laminar Integration & DevEx Refinement

## Current State Analysis

### Laminar Status

- ✅ Installed: `@agent_vega/laminar` in devDependencies
- ✅ Test Reporter: JSONL reporter configured in test:ci and test:pty
- ✅ Artifacts: Summary, trends, per-test JSONL reports generated
- ✅ History: reports/history.jsonl exists (28 entries, single run)
- ❌ **Gap**: History not persisted across CI runs (fresh each time)
- ❌ **Gap**: No suite tags (all tests look the same in trends)
- ❌ **Gap**: No PR comments (best-effort disabled)
- ❌ **Gap**: No LAMINAR_REPRO.md for failures

### Test Infrastructure

- 3 lanes: threads, forks, process-unix
- All lanes output JSONL reports per test
- Latest run: 36 tests passed, 9 digest/diff test failures (known)
- No failures in core mkolbol functionality

### DevEx Status (P9 Complete)

- ✅ Local Node v1.0 acceptance pack delivered
- ✅ http-logs-local.yml exists (ConsoleSink version)
- ❌ **Gap**: No FilesystemSink variant (http-logs-local-file.yml)
- ❌ **Gap**: No first-five-minutes landing page
- ❌ **Gap**: mkctl error matrix incomplete

## Sprint 10 Strategy

### Wave DX-10A (Laminar): 4 Tasks

**Priority 1: LAM-1001 (Trends Cache)**

- Goal: Persist history.jsonl across CI runs
- Impact: Enables trends to show historical patterns
- Implementation:
  1. Configure Laminar to append (not overwrite) history.jsonl
  2. Update CI workflow to cache reports/history.jsonl
  3. Test that trends accumulate over multiple runs

**Priority 2: LAM-1002 (Suite Tags)**

- Goal: Tag tests by lane (threads/forks/process-unix)
- Impact: Trends can distinguish which lane is flaky
- Implementation:
  1. Modify reporter invocations to pass lane metadata
  2. Test that trends show lane-specific failure patterns

**Priority 3: LAM-1003 (PR Comments)**

- Goal: Automated Laminar summary in PRs
- Impact: Developers see test health at a glance
- Implementation:
  1. Add GitHub Actions step to post comment
  2. Show summary + top 5 trends offenders

**Priority 4: LAM-1004 (Repro Hints)**

- Goal: Generate LAMINAR_REPRO.md for failures
- Impact: Faster reproduction of failures
- Implementation:
  1. Create repro bundle artifact on test failure
  2. Upload as GitHub artifact

### Wave DX-10B (DevEx): 3 Tasks

**DEVEX-101: FilesystemSink Quickstart**

- Depends on: Susan's FilesystemSink sprint completion
- Create: examples/configs/http-logs-local-file.yml
- Update: quickstart, cookbook, acceptance docs

**DEVEX-102: First Five Minutes**

- Create: docs/devex/first-five-minutes.md (5-min onboarding)
- Update: README.md landing page

**DEVEX-103: mkctl Docs Polish**

- Update: mkctl-cookbook.md with exit code matrix
- Reference: scripts/mkctl.ts EXIT_CODES enum

## Execution Plan

### Phase 1: Setup & Investigation (Done)

- [x] Explored Laminar CLI and current setup
- [x] Analyzed current CI workflow
- [x] Identified gaps

### Phase 2: Laminar Implementation (Next)

- [ ] LAM-1001: Configure history persistence + CI caching
- [ ] LAM-1002: Add suite tags to reporter invocations
- [ ] LAM-1003: Create PR comment GitHub action
- [ ] LAM-1004: Generate LAMINAR_REPRO.md artifact

### Phase 3: DevEx Implementation (Parallel)

- [ ] DEVEX-103: mkctl docs polish (immediate, no dependencies)
- [ ] DEVEX-101: FilesystemSink quickstart (blocked until Susan delivers)
- [ ] DEVEX-102: First five minutes (can start in parallel)

## Questions for VEGA/Danny

1. **History persistence**: Should history.jsonl be committed to git or only cached in CI?
2. **PR comments**: GitHub Actions permissions - can we post comments safely?
3. **FilesystemSink timeline**: When will Susan's sprint land?

## Next Steps

1. Start with LAM-1002 (suite tags) - lowest risk, high visibility
2. Follow with LAM-1001 (history caching) - enables trends analysis
3. Implement DEVEX-103 (mkctl polish) in parallel
4. Checkpoint with VEGA before LAM-1003 (PR comments - best-effort)

---

**Status**: Investigation complete. Ready to begin implementation.
