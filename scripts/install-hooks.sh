#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Not a git repository. Abort." >&2
  exit 1
fi

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
mkdir -p "$HOOKS_DIR"

cp -f scripts/git-hooks/pre-commit "$HOOKS_DIR"/pre-commit
chmod +x "$HOOKS_DIR"/pre-commit

# Provide pre-push sample without enabling by default
cp -f scripts/git-hooks/pre-push.sample "$HOOKS_DIR"/pre-push.sample

echo "Installed pre-commit hook. Pre-push sample available at .git/hooks/pre-push.sample"

