# ampcode.log Entry Template

```
## Sprint <SPRINT-ID> — <YYYY-MM-DD HH:MMZ>

### TASK <TASK-ID> — <Title> [✅ PASS | ❌ FAIL]
- Deliverable: DIFF_<...>.patch
- Files Modified: <comma-separated paths>
- Verification:
  - <command> — <outcome>
  - <additional checks as needed>
- Notes: <context, blockers, follow-ups>
```

## Guidelines

- **Append only.** Each sprint block goes to the end of `ampcode.log`.
- **One block per sprint.** Group all tasks for the sprint beneath the sprint header.
- **Keep it concise.** Summaries, commands, and outcomes only; reference `reports/*.jsonl` instead of pasting long logs.
- **Timestamps in UTC.** Use `date -u +"%Y-%m-%d %H:%MZ"` for the header.
- **Emoji status marker:** ✅ for pass, ❌ for fail (with explanation in notes).
