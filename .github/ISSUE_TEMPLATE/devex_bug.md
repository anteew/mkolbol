---
name: DevEx Bug Report
about: Report a bug or issue you encountered while using mkolbol
title: "[BUG] "
labels: devex, bug
assignees: ''
---

## Bug Description

<!-- A clear and concise description of what the bug is. -->

## Steps to Reproduce

<!-- Provide minimal steps to reproduce the issue. The fewer steps, the better! -->

1.
2.
3.

## Expected Behavior

<!-- What did you expect to happen? -->

## Actual Behavior

<!-- What actually happened? -->

## Environment

<!-- Please complete the following information -->

- **OS**: <!-- e.g., Ubuntu 22.04, macOS 14.2, Windows 11 -->
- **Node.js Version**: <!-- Run: node --version -->
- **npm Version**: <!-- Run: npm --version -->
- **mkolbol Version**: <!-- Run: npm list mkolbol or check package.json -->
- **Installation Method**: <!-- local npm install, global, npx, GitHub direct? -->

## Reproducible Example

<!-- IMPORTANT: Please provide ONE of the following -->

### Option 1: GitHub Repository Link (Preferred)

<!-- Link to a minimal GitHub repo that reproduces the issue -->

**Repo URL**:

**Branch**:

**Steps to reproduce from repo**:
```bash
git clone <your-repo-url>
cd <repo-directory>
npm install
# Add commands that trigger the bug
```

### Option 2: Inline Example

<!-- If the issue can be reproduced with a small code snippet, paste it here -->

```typescript
// Paste minimal code that reproduces the issue
```

**Configuration files** (if relevant):
```yaml
# vitest.config.ts, laminar.config.json, package.json snippets, etc.
```

## Failing Command(s)

<!-- Provide the exact command(s) you ran that triggered the bug -->

```bash
# Copy-paste the command(s) here
```

## Logs and Artifacts

### Error Messages

<!-- Paste the FULL error message and stack trace below -->

```
Paste error output here
```

### Laminar Reports (if applicable)

<!-- If you ran tests with Laminar, please attach or link the following: -->

- **Summary Output**:
  ```bash
  # Run: npx lam summary
  # Paste output here OR attach reports/summary.jsonl
  ```

- **Per-Case Logs**:
  <!-- Attach relevant .jsonl files from reports/<suite>/<case>.jsonl -->
  <!-- Or share the reports/ directory as a zip file -->

- **Digest Output**:
  ```bash
  # Run: npx lam digest
  # Paste output here OR attach .digest.json files
  ```

### Terminal Output

<!-- Paste full stderr/stdout from the failing command -->

<details>
<summary>Full Terminal Output</summary>

```
Paste full terminal output here (stdout + stderr)
```

</details>

### Reports Directory Structure

<!-- If you have a reports/ directory, show its structure -->

```bash
# Run: tree reports/ -L 2
# Or: ls -R reports/
# Paste output here
```

## Additional Context

<!-- Add any other context about the problem here -->

- Are you using Laminar? (Yes/No)
- Are you using process mode (forks/PTY)? (Yes/No)
- Does the issue occur in CI or only locally?
- Have you tried on a different machine/environment?
- Any custom configuration or non-standard setup?

## Checklist

<!-- Please confirm the following before submitting -->

- [ ] I have read the [Early Adopter Guide](https://github.com/anteew/mkolbol/blob/main/docs/devex/early-adopter-guide.md)
- [ ] I have read the [Quickstart](https://github.com/anteew/mkolbol#quickstart)
- [ ] I have checked existing issues to avoid duplicates
- [ ] I have provided a minimal reproducible example (repo link or inline)
- [ ] I have included the full error message and stack trace
- [ ] I have included environment details (OS, Node.js, npm versions)
- [ ] I have attached relevant logs/artifacts (if applicable)
