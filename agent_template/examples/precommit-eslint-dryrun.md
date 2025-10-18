Pre-commit: ESLint Fix Dry-Run (Fail-Fast)

What runs

- The pre-commit hook runs an ESLint "fix" dry-run on staged JS/TS files.
- If ESLint finds fixable issues or errors, commit is blocked immediately.

How to fix

- Run: `npx eslint <staged-files> --fix`
- Re-stage files: `git add <files>`
- Re-commit.

One-time override

- If you believe ESLint is wrong, allow a one-time bypass:
  `SKIP_ESLINT_DRYRUN=1 git commit -m "..."`

Log guidance

- Optionally add a `lint` event entry in your sprint log to note the outcome.
