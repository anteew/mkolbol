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

cp -f scripts/git-hooks/pre-push "$HOOKS_DIR"/pre-push
chmod +x "$HOOKS_DIR"/pre-push

echo "Installed pre-commit and pre-push hooks."
