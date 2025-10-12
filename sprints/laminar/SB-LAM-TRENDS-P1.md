```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "TR-A", "parallel": true,  "tasks": ["T2901", "T2902"] },
    { "id": "TR-B", "parallel": false, "depends_on": ["TR-A"], "tasks": ["T2903"] }
  ],
  "tasks": [
    {
      "id": "T2901",
      "agent": "susan-1",
      "title": "Failure fingerprinting + history ledger (history.jsonl)",
      "allowedFiles": ["src/digest/fingerprint.ts", "scripts/laminar-run.ts", "scripts/lam.ts"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T2901_fingerprint-history.patch"]
    },
    {
      "id": "T2902",
      "agent": "susan-2",
      "title": "CLI: lam trends (top offenders, first/last seen)",
      "allowedFiles": ["scripts/lam.ts", "docs/testing/laminar.md"],
      "verify": ["npm run lam -- --help"],
      "deliverables": ["patches/DIFF_T2902_cli-trends.patch"]
    },
    {
      "id": "T2903",
      "agent": "susan-3",
      "title": "Tests: synthetic regression history + trend outputs",
      "allowedFiles": ["tests/laminar/trends.spec.ts", "tests/fixtures/**", "reports/**"],
      "verify": ["npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T2903_tests-trends.patch"]
    }
  ]
}
```

# Laminar Trends P1 — Fingerprints + Trends

**Goal**: Group recurring failures, maintain a simple history ledger, and surface trend summaries via CLI.

