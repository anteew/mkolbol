# Test Artifacts & Raw Logs

## Laminar Text Reports

The test suite generates human-readable text summaries in `reports/`:

- **LAMINAR_SUMMARY.txt** — Pass/fail status of all test cases with execution time and output paths
- **LAMINAR_TRENDS.txt** — Top recurring signals and patterns across test runs (flakes, performance trends)
- **LAMINAR_THREADS_FEEDBACK.txt** — Feedback data from threads lane execution

These files are regenerated on each test run and excluded from git (see `.gitignore`).

## Raw Log Files

Files matching `*_raw.log` contain unprocessed output from test executions:

- Stream of stdout/stderr before parsing
- Useful for debugging test failures or reporter issues
- Preserved temporarily for post-mortem analysis

All `*_raw.log` files are excluded from version control via `.gitignore`.

## .gitignore Coverage

```gitignore
*.log
*_raw.log
reports/
```

This ensures test artifacts remain local and don't pollute the repository.
