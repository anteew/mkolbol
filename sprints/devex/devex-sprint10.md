```json
{
  "ampcode": "v1",
  "waves": [{ "id": "DX-A", "parallel": true, "tasks": ["D1001", "D1002"] }],
  "tasks": [
    {
      "id": "D1001",
      "agent": "devex",
      "title": "Packaging & Distribution (GitHub install paths)",
      "allowedFiles": ["docs/devex/early-adopter-guide.md", "examples/early-adopter/**"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D1001_github-packaging-v2.patch"]
    },
    {
      "id": "D1002",
      "agent": "devex",
      "title": "Version Matrix (Node 20/24) + Quick Troubleshoot",
      "allowedFiles": ["README.md", "docs/devex/troubleshooting.md"],
      "verify": ["npm run build"],
      "deliverables": ["patches/DIFF_D1002_version-matrix.patch"]
    }
  ]
}
```

# Ampcode Template — Subagent Dispatch Plan (DevEx Sprint 10)

Goal: Clarify non‑npm GitHub installs and provide a version matrix and quick troubleshooting for first‑time runs.

Verification Commands

```bash
npm run build
```
