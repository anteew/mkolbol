```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "SFL-A", "parallel": true, "tasks": ["T2601", "T2602"] },
    { "id": "SFL-B", "parallel": false, "depends_on": ["SFL-A"], "tasks": ["T2603"] },
    { "id": "SFL-C", "parallel": true, "depends_on": ["SFL-B"], "tasks": ["T2604", "T2605"] }
  ],
  "tasks": [
    {
      "id": "T2601",
      "agent": "susan-1",
      "title": "Env/seed capture: include run env + seeds in summary and per-case",
      "allowedFiles": ["src/test/reporter/jsonlReporter.ts", "scripts/laminar-run.ts"],
      "verify": ["npm run build", "npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T2601_env-seed-capture.patch"]
    },
    {
      "id": "T2602",
      "agent": "susan-2",
      "title": "Flake runner: N reruns with same seed; stability score",
      "allowedFiles": ["scripts/laminar-run.ts", "package.json"],
      "verify": ["npm run laminar:run || true"],
      "deliverables": ["patches/DIFF_T2602_flake-runner.patch"]
    },
    {
      "id": "T2603",
      "agent": "susan-3",
      "title": "Code frames: sourcemap-aware frames in digest (opt-in, budgeted)",
      "allowedFiles": ["src/digest/codeframe.ts", "src/digest/generator.ts", "package.json"],
      "verify": ["npm run build", "npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T2603_digest-codeframes.patch"]
    },
    {
      "id": "T2604",
      "agent": "susan-4",
      "title": "Tests: flake classifier + seeds/env + codeframe output",
      "allowedFiles": ["tests/digest/flakeAndFrames.spec.ts", "tests/fixtures/**"],
      "verify": ["npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T2604_tests-flake-frames.patch"]
    },
    {
      "id": "T2605",
      "agent": "susan-5",
      "title": "Docs: Determinism, flake triage, and code frames",
      "allowedFiles": ["docs/testing/laminar.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T2605_docs-flake-frames.patch"]
    }
  ]
}
```

# Laminar Source/Flake P1 — Seeds, Flake Triage, Code Frames

**Goal**: Improve determinism and triage. Capture env + seeds, support N reruns to classify flakiness with a stability score, and include optional source-mapped code frames in digests within budget.

---

## Notes

- Use minimal deps for sourcemaps (e.g., `source-map`), and keep frames short.
- Do not bloat digest; attach frames only when budget allows.
