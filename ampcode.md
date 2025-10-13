
# Sprint SB-LAM-HINTS-P1 — “Triage Hints” for Agents

Goal: Add compact “what to do next” hints for each failing test, both in console (one line per fail when enabled) and as per-case artifacts (.hints.json/.md). Keep output tiny and agent-friendly.

Scope
- Detect common triage patterns from digest + minimal log context:
  - missing-include: Expected domain event absent in digest window
  - redaction-mismatch: Rule pack expects pattern (e.g., jwt) but redactedFields==0
  - budget-clipped: Budget/window likely clipped the interesting event(s)
  - trend/regression: Mark as new/regressed using history ledger
- Output
  - Console: gated by `LAMINAR_HINTS=1` or `lam -- summary --hints` (single compact line per failing case)
  - Artifacts: `reports/<suite>/<case>.hints.json` and `.hints.md`
  - Include suggested commands (copy/paste): `lam show --case ...`, `lam rules set --inline '{...}'`
- Config
  - `laminar.config.json` → `hints: { enabled: false, showTrends: true, maxLines: 1 }`
  - Env override: `LAMINAR_HINTS=1`

Acceptance
- When a digested failure is present, enabling hints shows exactly one concise line per fail with: cause tag, one key signal (evt/field), and 1–2 suggested commands.
- Per-case hints artifacts exist and reference the exact files/commands.
- No change to default console output when disabled.

Non-goals
- Do not rewrite digest or event schema.
- No network calls or heavy log scans; only digest + small local window from the case file.
