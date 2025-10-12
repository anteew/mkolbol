```json
{
  "ampcode": "v1",
  "notes": "Do not branch/commit/push — VEGA handles git.",
  "waves": [
    { "id": "STAB-A", "parallel": true,  "tasks": ["T4401", "T4402"] },
    { "id": "STAB-B", "parallel": true,  "depends_on": ["STAB-A"], "tasks": ["T4403", "T4404"] },
    { "id": "STAB-C", "parallel": false, "depends_on": ["STAB-B"], "tasks": ["T4405"] }
  ],
  "tasks": [
    {
      "id": "T4401",
      "agent": "susan-1",
      "title": "Stabilize index vs summary parity (deterministic flush)",
      "allowedFiles": ["src/test/reporter/jsonlReporter.ts", "tests/laminar/coreReporter.spec.ts"],
      "verify": ["npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T4401_parity-stabilization.patch"]
    },
    {
      "id": "T4402",
      "agent": "susan-2",
      "title": "Fix lam run --filter (use -t/test pattern)",
      "allowedFiles": ["scripts/lam.ts", "README.md"],
      "verify": ["npm run lam -- run --lane ci --filter kernel || true"],
      "deliverables": ["patches/DIFF_T4402_cli-filter-fix.patch"]
    },
    {
      "id": "T4403",
      "agent": "susan-3",
      "title": "Expand redaction edge tests (nested/arrays/long/unicode)",
      "allowedFiles": ["tests/digest/redaction.spec.ts", "docs/testing/laminar.md"],
      "verify": ["npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T4403_redaction-edges.patch"]
    },
    {
      "id": "T4404",
      "agent": "susan-4",
      "title": "CLI: summary --hints flag + gating tests",
      "allowedFiles": ["scripts/lam.ts", "tests/hints/hints.spec.ts", "docs/testing/laminar.md"],
      "verify": ["npm run lam -- summary --hints || true"],
      "deliverables": ["patches/DIFF_T4404_cli-hints-flag.patch"]
    },
    {
      "id": "T4405",
      "agent": "susan-5",
      "title": "GH Actions: ensure consistent Node 20/24 lanes + artifact pointers",
      "allowedFiles": [".github/workflows/laminar.yml", "README.md"],
      "verify": ["rg -n 'actions/setup-node' .github/workflows/laminar.yml"],
      "deliverables": ["patches/DIFF_T4405_ci-lanes-stability.patch"]
    }
  ]
}
```

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
