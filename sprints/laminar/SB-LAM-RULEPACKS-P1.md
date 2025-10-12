```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "RP-A", "parallel": true,  "tasks": ["T2801", "T2802"] },
    { "id": "RP-B", "parallel": false, "depends_on": ["RP-A"], "tasks": ["T2803"] }
  ],
  "tasks": [
    {
      "id": "T2801",
      "agent": "susan-1",
      "title": "Digest: rule packs + extends (node-defaults, go-defaults)",
      "allowedFiles": ["src/digest/generator.ts", "docs/testing/laminar.md"],
      "verify": ["npm run build", "npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T2801_digest-rulepacks.patch"]
    },
    {
      "id": "T2802",
      "agent": "susan-2",
      "title": "Redaction presets + secret scanning (JWT/AWS/URLs) with opt-outs",
      "allowedFiles": ["src/digest/generator.ts", "docs/testing/laminar.md"],
      "verify": ["npm run build", "npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T2802_digest-redaction-presets.patch"]
    },
    {
      "id": "T2803",
      "agent": "susan-3",
      "title": "Tests: rule packs + redaction work across Node/Go fixtures",
      "allowedFiles": ["tests/digest/rulepacks.spec.ts", "tests/fixtures/**"],
      "verify": ["npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T2803_tests-rulepacks.patch"]
    }
  ]
}
```

# Laminar Rule Packs P1 — Defaults + Redaction Presets

**Goal**: Ship curated rule packs and safe-by-default redaction presets to reduce setup friction and protect secrets in agent-visible outputs.

