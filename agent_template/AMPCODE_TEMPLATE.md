```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "D24-A", "parallel": false, "tasks": ["T3001", "T3002"] },
    { "id": "D24-B", "parallel": true, "depends_on": ["D24-A"], "tasks": ["T3003"] }
  ],
  "tasks": [
    {
      "id": "T3001",
      "agent": "claude",
      "title": "Profiler wiring polish",
      "allowedFiles": ["xenolang/**", "tools/xeno-prof/**"],
      "verify": ["go test ./xenolang/...", "tools/xeno-prof/xeno-prof --help"],
      "deliverables": ["patches/DIFF_CLAUDE_T3001_profiler-polish.patch"]
    }
  ]
}
```

Note: amp ingests the JSON front-matter above. JSON is preferred for reliability with LLM tooling.

# Ampcode Template — Subagent Dispatch Plan

**Architect**: [ARCHITECT_NAME]  
**Sprint/Batch**: [SPRINT_ID]  
**Reporting**: Results go to `ampcode.log`

---

## Context & Scope

**Goal**: [1-2 sentence sprint objective]

**Constraints**:

- [ ] Pure-Go builds (no cgo) / [other build constraints]
- [ ] Backwards compatibility required / breaking changes OK
- [ ] Token efficiency: use short metric keys (e.g., `k.s.st` not `kernel.scheduler.steals`)

**Prerequisites** (if any):

- Dependencies: [e.g., "requires Go 1.21+", "needs xenomorph-os module"]
- Setup: [any env vars, flags, or config needed before starting]

---

## Execution Waves

```yaml
# Wave structure for parallel/sequential execution
waves:
  - id: A
    parallel: true
    tasks: [T1001, T1003]

  - id: B
    parallel: false
    depends_on: [A]
    tasks: [T1002]
```

---

## Tasks

### TASK [TASK_ID] — [Short Title]

**Goal**: [One sentence: what this accomplishes]

**Context** (optional):

- Builds on: [existing code/patterns to reference]
- Why: [brief rationale if not obvious]

**Allowed Files**:

```yaml
modify:
  - path/to/file.go # [purpose: e.g., "add timer cleanup"]
  - path/to/other.go # [purpose]
create:
  - path/to/new.go # [what it contains]
  - docs/rfcs/FEATURE.md # [update this section]
```

**Requirements**:

1. [Specific, testable requirement]
2. [Another requirement]
3. [Metrics to add, if any]: `metric.key.name` 'description'

**Success Criteria**:

- Tests: [specific test command must pass]
- Output: [expected behavior, e.g., "CLI returns 42"]
- Perf: [optional: expected benchmark results or bounds]

**Verification Commands**:

```bash
# Run exactly these commands to verify
go test ./path/to/package -count=1
go run ./cmd/tool --flag /tmp/output.jsonl
```

**Expected Output** (if helpful):

```
# Example of what success looks like
PASS
ok   path/to/package  0.123s
```

**Deliverable**: `DIFF_[TASK_ID]_[slug].patch` (unified diff at repo root)

---

## Quality Bar

**Non-negotiable**:

- [ ] Diffs compile and all tests pass locally
- [ ] No unrelated changes or drive-by refactors
- [ ] Tests are deterministic (no flaky sleeps/races)
- [ ] Microbenches complete in < [TIME] total
- [ ] Clear comments only where intent matters (not obvious code)

**Conventions**:

- Diffs: unified patch format against current HEAD
- Tests: fast, deterministic; avoid sleeps > 10ms in unit tests
- Naming: [project-specific conventions, e.g., "use snake_case for metrics"]
- Docs: update only files explicitly listed in task

---

## Reporting Format

At completion, aggregate to `ampcode.log` with:

```markdown
### TASK [TASK_ID] — [Title] [✅ PASS | ❌ FAIL]

**Deliverable**: `DIFF_[TASK_ID]_[slug].patch`
**Status**: [PASS|FAIL]
**Files Modified**: [list with brief purpose]

**Verification**:

- ✅/❌ [command 1] — [result]
- ✅/❌ [command 2] — [result]

**Performance** (if applicable):

- [metric]: [value] ([delta from baseline if known])

**Notes**: [blockers, follow-ups, or architect attention needed]
```

---

## Master Agent Notes

**For the executing agent**:

1. Read this entire file before dispatching subagents
2. Execute waves in order; parallelize where `parallel: true`
3. Apply each diff locally, run verification, capture results
4. If a task FAILS, halt dependent tasks and report immediately
5. Aggregate all results to `ampcode.log` for architect review

**If you hit ambiguity**:

- Prefer clarity over cleverness
- Leave a crisp comment for the architect in your task result
- Don't guess at requirements — flag it in the report

---

## Appendix (Optional)

**Rollback Plan** (if tasks can fail):

- [Instructions for safe rollback, or "N/A"]

**Reference Links**:

- [Related RFCs, issues, or docs the architect wants you to check]

**Known Gotchas**:

- [Any tricky parts the architect wants to flag upfront]

Orchestration Log (amp)
- amp should write a JSON Lines log to `reports/amp.log.jsonl` with entries:
  `ts`, `waveId`, `taskId`, `agent`, `state` (queued|running|pass|fail),
  `message`, and `exception`/`error` when applicable.
- Keep the human-readable `ampcode.log` if desired; JSONL is the source of truth for tools.
