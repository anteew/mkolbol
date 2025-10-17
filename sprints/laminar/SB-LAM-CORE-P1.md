```json
{
  "ampcode": "v1",
  "waves": [
    { "id": "CORE-A", "parallel": true, "tasks": ["T2501", "T2502"] },
    { "id": "CORE-B", "parallel": true, "depends_on": ["CORE-A"], "tasks": ["T2503"] },
    { "id": "CORE-C", "parallel": false, "depends_on": ["CORE-B"], "tasks": ["T2504", "T2505"] }
  ],
  "tasks": [
    {
      "id": "T2501",
      "agent": "susan-1",
      "title": "Reporter: always-on per-case JSONL writer",
      "allowedFiles": ["src/test/reporter/jsonlReporter.ts"],
      "verify": ["npm run build", "npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T2501_reporter-per-case-jsonl.patch"]
    },
    {
      "id": "T2502",
      "agent": "susan-2",
      "title": "Reporter: artifact index manifest (reports/index.json)",
      "allowedFiles": ["src/test/reporter/jsonlReporter.ts"],
      "verify": [
        "npm run build",
        "node -e \"require('fs').existsSync('reports/index.json')?0:process.exit(1)\""
      ],
      "deliverables": ["patches/DIFF_T2502_reporter-index-manifest.patch"]
    },
    {
      "id": "T2503",
      "agent": "susan-3",
      "title": "CLI: summary/show consume index.json; print digest links",
      "allowedFiles": ["scripts/lam.ts"],
      "verify": [
        "npm run lam -- summary",
        "npm run lam -- show --case kernel.spec/connect_moves_data_1_1 --around evt=case.begin --window 3 || true"
      ],
      "deliverables": ["patches/DIFF_T2503_cli-index-consumers.patch"]
    },
    {
      "id": "T2504",
      "agent": "susan-4",
      "title": "Tests: ensure per-case JSONL + index exist and are valid",
      "allowedFiles": ["tests/laminar/coreReporter.spec.ts", "reports/**"],
      "verify": ["npm run test:ci || true"],
      "deliverables": ["patches/DIFF_T2504_tests-core-reporter.patch"]
    },
    {
      "id": "T2505",
      "agent": "susan-5",
      "title": "Docs: artifact guarantees + index manifest spec",
      "allowedFiles": ["docs/testing/laminar.md", "README.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_T2505_docs-core-reporter.patch"]
    }
  ]
}
```

# Laminar Core P1 — Per-case Logs + Artifact Index

**Goal**: Make Laminar deterministic for agents by guaranteeing per-case JSONL logs and a single artifact index manifest (`reports/index.json`). CLI should use the index to locate logs/digests reliably.

---

## Tasks

### T2501 — Reporter: always-on per-case JSONL writer

- Add per-case writers to `src/test/reporter/jsonlReporter.ts` so each test gets `reports/<suite>/<case>.jsonl` regardless of reruns or debug modes.
- Ensure directories are created and filenames are sanitized consistently with summary.

### T2502 — Reporter: artifact index manifest

- On finish, emit `reports/index.json` with an array of cases: `{ suite, case, status, duration, artifactURI, digestURI?, sizeBytes, mtime }`.
- Keep it small and deterministic; omit volatile fields.

### T2503 — CLI: summary/show consume index.json

- `lam summary` should show digest availability and use `index.json` for paths.
- `lam show` should resolve case → log path via index; fallback remains.

### T2504 — Tests

- Add tests that run a tiny suite and assert `reports/<suite>/<case>.jsonl` exists and `reports/index.json` validates (JSON parse + required keys).

### T2505 — Docs

- Document per-case log guarantees and `index.json` schema and examples.

---

## Success Criteria

- Running `npm run test:ci` produces per-case logs for all tests and `reports/index.json`.
- `lam summary` and `lam show` function using `index.json`.
- Docs describe artifact guarantees.
