```json
{
  "ampcode": "v1",
  "notes": "Do not branch/commit/push — VEGA handles git.",
  "waves": [
    { "id": "PUB-A", "parallel": true,  "tasks": ["T4501", "T4502"] },
    { "id": "PUB-B", "parallel": true,  "depends_on": ["PUB-A"], "tasks": ["T4503", "T4504"] },
    { "id": "PUB-C", "parallel": false, "depends_on": ["PUB-B"], "tasks": ["T4505"] }
  ],
  "tasks": [
    {
      "id": "T4501",
      "agent": "susan-1",
      "title": "Compile CLI to dist + shebang preservation",
      "allowedFiles": ["tsconfig.json", "package.json", "scripts/lam.ts"],
      "verify": ["jq -r '.bin.lam' package.json", "node dist/scripts/lam.js --help || true"],
      "deliverables": ["patches/DIFF_T4501_cli-dist-bin.patch"]
    },
    {
      "id": "T4502",
      "agent": "susan-2",
      "title": "Package exports/types + files whitelist",
      "allowedFiles": ["package.json", "src/index.ts", "README.md"],
      "verify": ["jq -r '.exports? // "none"' package.json", "npm pack"],
      "deliverables": ["patches/DIFF_T4502_pkg-exports-types.patch"]
    },
    {
      "id": "T4503",
      "agent": "susan-3",
      "title": "Release workflow: publish on tag (NPM_TOKEN)",
      "allowedFiles": [".github/workflows/release.yml", "README.md"],
      "verify": ["test -f .github/workflows/release.yml && echo ok"],
      "deliverables": ["patches/DIFF_T4503_release-workflow.patch"]
    },
    {
      "id": "T4504",
      "agent": "susan-4",
      "title": "Docs: npm install/npx usage + bin guidance",
      "allowedFiles": ["README.md", "docs/testing/laminar.md"],
      "verify": ["rg -n 'npx lam' README.md"],
      "deliverables": ["patches/DIFF_T4504_docs-npm-usage.patch"]
    },
    {
      "id": "T4505",
      "agent": "susan-5",
      "title": "Smoke test workflow: npm pack + install + lam --help",
      "allowedFiles": [".github/workflows/smoke.yml"],
      "verify": ["test -f .github/workflows/smoke.yml && echo ok"],
      "deliverables": ["patches/DIFF_T4505_smoke-workflow.patch"]
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
