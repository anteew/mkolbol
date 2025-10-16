Laminar CI Visibility Plan — Local Node v1.0

Goals
- Make flaky tests and regressions obvious across runs.
- Give reviewers fast insight (summary, top offenders) right on the PR.
- Keep it local‑node friendly; no network services.

Key Enhancements

1) Persist trends across runs (per Node matrix)
- Mechanism: GitHub Actions cache for `reports/history.jsonl` keyed by Node version and ref.
- Steps (in `.github/workflows/tests.yml`):
  - Before running tests (per matrix):
    - `actions/cache@v4` restore path: `reports/history.jsonl` with keys:
      - `laminar-history-node${{ matrix.node }}-${{ github.ref_name }}`
      - fallback: `laminar-history-node${{ matrix.node }}-`
  - After tests:
    - Ensure Laminar writes/updates `reports/history.jsonl` (present when failures occur).
    - `actions/cache@v4` save the file with same key.

2) Suite tagging for clarity
- Export `LAMINAR_SUITE` before each lane:
  - Threads: `LAMINAR_SUITE=tests-node${{ matrix.node }}-threads`
  - Forks:   `LAMINAR_SUITE=tests-node${{ matrix.node }}-forks`
  - Process Unix (enforcement): `LAMINAR_SUITE=tests-node${{ matrix.node }}-process-unix`

3) PR comment with summary + trends (best‑effort)
- After test steps, run:
  - `npm run lam -- summary > reports/LAMINAR_SUMMARY.txt || true`
  - `npm run lam -- trends --top 10 > reports/LAMINAR_TRENDS.txt || true`
- Post both as a PR comment (use `gh pr comment` or `peter-evans/create-or-update-comment`).
- Include a short "New vs Existing" regressions section by comparing current vs cached `history.jsonl` (Laminar diff if available; otherwise basic diff of fingerprint IDs).

4) Flake budgets (soft policy)
- Define a threshold (e.g., a fingerprint failing ≥2 times in the last 5 runs) to mark as "flake candidate" in the PR comment.
- This is informational; CI remains green if enforcement lanes pass.

5) Repro hints artifacts
- For failures, generate `reports/LAMINAR_REPRO.md` with exact vitest command (pool/lane), seed (if any), and environment flags.
- Attach it as an artifact; link in the PR comment when failures exist.

Workflow Snippet (illustrative)
```yaml
      - name: Restore Laminar history cache
        uses: actions/cache@v4
        with:
          path: reports/history.jsonl
          key: laminar-history-node${{ matrix.node }}-${{ github.ref_name }}
          restore-keys: |
            laminar-history-node${{ matrix.node }}-

      - name: Threads lane (dual reporters)
        run: |
          export LAMINAR_SUITE=tests-node${{ matrix.node }}-threads
          mkdir -p reports
          npx vitest run \
            --pool=threads \
            --exclude='**/{ptyServerWrapper,multiModalOutput,endpointsList,processMode}.spec.ts' \
            --reporter=default \
            --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js \
            > reports/threads_raw.log 2>&1

      - name: Forks lane (process-mode gated)
        run: |
          export LAMINAR_SUITE=tests-node${{ matrix.node }}-forks
          mkdir -p reports
          npx vitest run \
            --pool=forks \
            --poolOptions.forks.singleFork=true \
            tests/wrappers/ptyServerWrapper.spec.ts \
            tests/integration/multiModalOutput.spec.ts \
            tests/integration/endpointsList.spec.ts \
            tests/integration/workerMode.spec.ts \
            --reporter=default \
            --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js \
            > reports/forks_raw.log 2>&1

      - name: Process-mode (Unix adapters)
        run: |
          export LAMINAR_SUITE=tests-node${{ matrix.node }}-process-unix
          mkdir -p reports
          MK_PROCESS_EXPERIMENTAL=1 npx vitest run \
            --pool=forks \
            --poolOptions.forks.singleFork=true \
            tests/integration/processUnix.spec.ts \
            --reporter=default \
            --reporter=./node_modules/@agent_vega/laminar/dist/src/test/reporter/jsonlReporter.js \
            > reports/process_raw.log 2>&1

      - name: Laminar summary/trends (best‑effort)
        if: ${{ always() }}
        continue-on-error: true
        run: |
          mkdir -p reports
          npm run lam -- summary > reports/LAMINAR_SUMMARY.txt || true
          npm run lam -- trends --top 10 > reports/LAMINAR_TRENDS.txt || true

      - name: Save Laminar history cache
        if: ${{ always() }}
        uses: actions/cache/save@v4
        with:
          path: reports/history.jsonl
          key: laminar-history-node${{ matrix.node }}-${{ github.ref_name }}
```

Operational Notes
- Local‑only: This plan does not introduce network services and works under MK_LOCAL_NODE=1.
- Artifact churn: Reports directory grows; acceptable for visibility. We can prune RAW logs later.

