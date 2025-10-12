```json
{
  "ampcode": "v1",
  "notes": "Do not branch/commit/push — VEGA handles git. Next sprint draft only.",
  "waves": [
    { "id": "HINTS-A", "parallel": true,  "tasks": ["T4301", "T4302"] },
    { "id": "HINTS-B", "parallel": true,  "depends_on": ["HINTS-A"], "tasks": ["T4303", "T4304"] },
    { "id": "HINTS-C", "parallel": false, "depends_on": ["HINTS-B"], "tasks": ["T4305"] }
  ],
  "tasks": [
    {
      "id": "T4301",
      "agent": "susan-1",
      "title": "Hint engine core (rules + detectors)",
      "allowedFiles": ["src/digest/hints.ts", "src/digest/types.ts", "src/digest/generator.ts"],
      "verify": ["rg -n 'export interface Hint' src/digest/hints.ts", "npm run build"],
      "deliverables": ["patches/DIFF_T4301_hints-engine-core.patch"]
    },
    {
      "id": "T4302",
      "agent": "susan-2",
      "title": "Console hints (per-failure line) + flag",
      "allowedFiles": ["scripts/lam.ts"],
      "verify": ["LAMINAR_HINTS=1 npm run lam -- summary || true"],
      "deliverables": ["patches/DIFF_T4302_cli-hints-console.patch"]
    },
    {
      "id": "T4303",
      "agent": "susan-3",
      "title": "Hint artifacts (.hints.json/.md per-case)",
      "allowedFiles": ["src/digest/hints.ts", "src/digest/generator.ts"],
      "verify": ["rg -n '.hints.json' reports || true"],
      "deliverables": ["patches/DIFF_T4303_hints-artifacts.patch"]
    },
    {
      "id": "T4304",
      "agent": "susan-4",
      "title": "Config toggles + budgets for hints",
      "allowedFiles": ["docs/testing/laminar.md", "laminar.config.json", "scripts/lam.ts"],
      "verify": ["rg -n 'hints' laminar.config.json", "rg -n 'hints' docs/testing/laminar.md"],
      "deliverables": ["patches/DIFF_T4304_hints-config-docs.patch"]
    },
    {
      "id": "T4305",
      "agent": "susan-5",
      "title": "Tests for detectors + console output",
      "allowedFiles": ["tests/hints/hints.spec.ts", "tests/fixtures/**"],
      "verify": ["npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T4305_hints-tests.patch"]
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

